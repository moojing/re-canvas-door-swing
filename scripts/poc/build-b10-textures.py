#!/usr/bin/env python3
"""b10 下水道閘門無版權貼圖管線:AI 文生圖底圖 + 程式繪製 decal → 輸出四張貼圖。

用法:
  python3 scripts/poc/build-b10-textures.py <來源圖目錄> [輸出目錄]

  來源圖目錄需含三張 AI 文生圖(未餵任何遊戲畫面,產出無版權疑慮):
  - gate-face.png   上閘板整合圖(內凹面板 + XD-R 噴漆 + 鉚釘排),生成 prompt 見下
  - lower-face.png  下閘板整合圖(內凹面板,無文字/鉚釘)
  - rust.png        素面鏽板(僅供小件風化疊加)
  輸出目錄預設 packages/sample/public/textures/b10/(repo 內 tracked 路徑)。

生成 prompt 紀錄(Codex 內建圖像工具,文生圖):
  gate-face  「老舊工業鏽蝕鋼板閘門正面,平面正交視角:上 2/3 內凹矩形金屬面板
              (斜切邊框),面板右側淡灰噴漆 stencil『XD-R』,下 1/4 高度一排 8 顆
              圓頂鉚釘,其下連續鏽蝕鋼板;深灰褐、垂直鏽痕、90 年代預渲染質感」
  lower-face 「同風格閘門下半段:中央大型內凹矩形面板(斜切邊框、四角倒角),
              內部均勻鏽面,無文字鉚釘物件;1536x1024」
  rust       「素面鏽蝕鐵板,深褐垂直鏽痕,無物件無文字」

設計對照(參考原作、刻意不同):面板/鉚釘/凹槽為同類工業元素的重新設計,
XD-R 為不受著作權保護的短字元標示;貼圖像素 0% 來自遊戲畫面。
"""
import os
import sys

from PIL import Image, ImageDraw, ImageEnhance

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if len(sys.argv) < 2:
    sys.exit("用法:build-b10-textures.py <來源圖目錄> [輸出目錄]")
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    ROOT, "packages/sample/public/textures/b10")
os.makedirs(OUT, exist_ok=True)

gate_src = Image.open(os.path.join(SRC, "gate-face.png")).convert("RGB")
lower_src = Image.open(os.path.join(SRC, "lower-face.png")).convert("RGB")
rust_src = Image.open(os.path.join(SRC, "rust.png")).convert("RGB")

# 與元件端(SewerGateB10.tsx)一致的貼圖規格:
# door 560x440(齒根 y=403、齒尖 y=440)、lower 560x315、box 110x88、sign 70x30

# ---- door.png(上閘板)----
# 方圖裁掉下緣素面區(保住面板+鉚釘的相對位置),壓到目標尺寸再壓暗
w, h = gate_src.size
crop_h = int(w * 440 / 560)
door = gate_src.crop((0, 0, w, min(crop_h, h))).resize((560, 440), Image.LANCZOS)
door = ImageEnhance.Brightness(door).enhance(0.82)
door = ImageEnhance.Color(door).enhance(0.85)
door.save(f"{OUT}/door.png")

# ---- lower.png(下閘板)----
# 一次生成的整合圖(光影一體、無拼貼縫),裁到 560:315 比例後套相同亮度/飽和
lw, lh = lower_src.size
crop_h = int(lw * 315 / 560)
top = max((lh - crop_h) // 2, 0)
lower = lower_src.crop((0, top, lw, top + crop_h)).resize((560, 315), Image.LANCZOS)
lower = ImageEnhance.Brightness(lower).enhance(0.82)
lower = ImageEnhance.Color(lower).enhance(0.85)
lower.save(f"{OUT}/lower.png")


# ---- 風化疊加:小塊鏽圖弱混合(供程式繪製的小件)----
def weather(img, alpha):
    patch = rust_src.crop((300, 300, 300 + img.width * 4, 300 + img.height * 4)) \
                    .resize(img.size, Image.LANCZOS).convert("RGB")
    return Image.blend(img, patch, alpha)


# ---- lever-box.png(拉桿盒)----
box = Image.new("RGB", (110, 88), (58, 56, 44))
d = ImageDraw.Draw(box)
d.rectangle([0, 0, 109, 87], outline=(28, 26, 20), width=3)      # 外框
d.rectangle([3, 3, 106, 6], fill=(88, 84, 66))                   # 頂緣受光
d.rectangle([10, 12, 99, 62], fill=(38, 36, 28), outline=(20, 18, 14), width=2)  # 內凹槽
d.rounded_rectangle([18, 30, 91, 42], radius=5, fill=(70, 66, 52), outline=(24, 22, 17), width=2)  # 橫向拉桿
d.rectangle([18, 31, 91, 34], fill=(96, 90, 70))                 # 拉桿高光
d.rectangle([4, 68, 105, 83], fill=(20, 18, 14))                 # 底部黃黑警示斜紋帶
for x0 in range(-16, 120, 16):
    d.polygon([(x0, 83), (x0 + 8, 83), (x0 + 16, 68), (x0 + 8, 68)], fill=(168, 140, 32))
d.rectangle([4, 68, 105, 83], outline=(15, 13, 10), width=1)
box = weather(box, 0.22)
box.save(f"{OUT}/lever-box.png")

# ---- lever-sign.png(警示牌)----
sign = Image.new("RGB", (70, 30), (150, 128, 40))
d = ImageDraw.Draw(sign)
d.rectangle([0, 0, 69, 29], outline=(60, 50, 16), width=2)
d.rectangle([2, 2, 67, 4], fill=(190, 166, 66))                  # 頂緣受光
# 不可讀的標示刻痕(避免任何真實文字)
d.rectangle([8, 10, 34, 13], fill=(52, 44, 16))
d.rectangle([8, 18, 46, 21], fill=(52, 44, 16))
d.rectangle([40, 10, 60, 13], fill=(52, 44, 16))
sign = weather(sign, 0.18)
sign.save(f"{OUT}/lever-sign.png")

print("輸出 →", OUT)
for f in sorted(os.listdir(OUT)):
    print(" ", f, Image.open(os.path.join(OUT, f)).size)

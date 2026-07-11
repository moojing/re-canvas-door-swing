#!/usr/bin/env bash
# PoC 1-2 a11 重型水門:從 materials/ 影片抽正面影格,裁成各部件貼圖。
#
# ⚠️ 產出的是遊戲畫面截圖(Capcom 版權素材),僅供本地 PoC 驗證,
#    輸出目錄已列入 .gitignore,不得進入版控或發佈包。
#    正式版需以自製 / CC0 材質重繪。
#
# 用法: scripts/poc/extract-a11-textures.sh   (需 ffmpeg,於 repo 根目錄執行)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VIDEO="$ROOT/materials/1 開門動畫轉場製作/1-2 1998 Biohazard 2/a11單門-重型水門/a11-s1重型水門.mp4"
OUT="$ROOT/packages/sample/public/textures/poc-a11"
FRAME_T=4.5                       # 門正面特寫的時間點(秒)
BRI="eq=brightness=0.09:contrast=1.15:gamma=1.5"   # 與圖庫相同的提亮參數

[ -f "$VIDEO" ] || { echo "找不到影片:$VIDEO(materials/ 未就緒?)" >&2; exit 1; }
mkdir -p "$OUT"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
FRAME="$TMP/frame.png"
ffmpeg -y -loglevel error -ss "$FRAME_T" -i "$VIDEO" -frames:v 1 -vf "$BRI" "$FRAME"

# 各部件在來源影格上的像素矩形(w:h:x:y)。
# 門本體 bbox 由亮度投影量得:x 485–820,y 178–772。
# 元件端 (HeavyWaterDoorA11.tsx) 以同一組數字換算世界座標,兩邊要同步改。
crop() { ffmpeg -y -loglevel error -i "$FRAME" -vf "crop=$1" "$OUT/$2"; }

crop "335:594:485:178" door.png           # 門板整面(底圖)
crop "340:96:482:236"  rail-top.png       # 上橫樑(含兩端夾座)
crop "340:84:482:688"  rail-bottom.png    # 下橫樑
crop "300:280:492:384" panel.png          # 中央凸起面板(貼紙/標籤在這)
crop "196:150:628:420" valve-housing.png  # 閥輪座(右緣凸出)
crop "150:150:625:421" wheel.png          # 閥輪(圓形,取方形範圍)

echo "PoC 貼圖已產出 → $OUT"
ls "$OUT"

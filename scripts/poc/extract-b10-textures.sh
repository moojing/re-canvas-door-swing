#!/usr/bin/env bash
# PoC 1-2 b10 下水道閘門:從 materials/ 影片抽影格,裁成各部件貼圖。
#
# ⚠️ 產出的是遊戲畫面截圖(Capcom 版權素材),僅供本地 PoC 驗證,
#    輸出目錄已列入 .gitignore,不得進入版控或發佈包。
#    正式版需以自製 / CC0 材質重繪。
#
# 用法: scripts/poc/extract-b10-textures.sh   (需 ffmpeg,於 repo 根目錄執行)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VIDEO="$ROOT/materials/1 開門動畫轉場製作/1-2 1998 Biohazard 2/b10-下水道閘門/b10-s1下水道閘門.mp4"
OUT="$ROOT/packages/sample/public/textures/poc-b10"
T_CLOSED=3.6                      # 關門正面特寫(門面 + 拉桿盒)
T_OPEN=5.2                        # 上升中(地面齒條露出)
BRI="eq=brightness=0.09:contrast=1.15:gamma=1.5"   # 與圖庫相同的提亮參數

[ -f "$VIDEO" ] || { echo "找不到影片:$VIDEO(materials/ 未就緒?)" >&2; exit 1; }
mkdir -p "$OUT"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
CLOSED="$TMP/closed.png"; OPEN="$TMP/open.png"
ffmpeg -y -loglevel error -ss "$T_CLOSED" -i "$VIDEO" -frames:v 1 -vf "$BRI" "$CLOSED"
ffmpeg -y -loglevel error -ss "$T_OPEN"   -i "$VIDEO" -frames:v 1 -vf "$BRI" "$OPEN"

# 各部件在來源影格上的像素矩形(w:h:x:y)。
# 閘門 bbox:x 345–905,齒根 y=403、齒尖 y=440;4 齒,齒心 rel x=75/212/344/476。
# 地面齒條齒尖固定在影格 y≈487(rack.png crop 第 7 列)。
# 元件端 (SewerGateB10.tsx) 以同一組數字換算世界座標,兩邊要同步改。
crop() { ffmpeg -y -loglevel error -i "$1" -vf "crop=$2" "$OUT/$3"; }

crop "$CLOSED" "560:440:345:0"   door.png        # 閘門整面(含齒區,缺口處無幾何不會顯示)
crop "$CLOSED" "70:30:388:194"   lever-sign.png  # 拉桿上方黃色警示牌
crop "$CLOSED" "110:88:382:226"  lever-box.png   # 拉桿盒(黃黑警示條)
crop "$OPEN"   "560:120:345:480" rack.png        # 地面齒條(齒尖朝上 + 基座)

echo "PoC 貼圖已產出 → $OUT"
ls "$OUT"

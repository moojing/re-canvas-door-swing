#!/usr/bin/env bash
# PoC 1-1 c03 升降平台:從 gallery 的本機原始影片抽取視覺比對貼圖。
#
# 產出含 CAPCOM 遊戲畫面像素,只供本機 PoC 驗證。輸出目錄已 gitignore,
# 不得提交或放入發佈包;正式版本必須改用自製或授權材質。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
GALLERY_ROOT="${DOOR_GALLERY_ROOT:-$ROOT/../re-door-gallery}"
VIDEO="${C03_VIDEO:-$GALLERY_ROOT/materials/door-transitions/1-1/c03/c03-s1升降梯.mp4}"
OUT="$ROOT/packages/sample/public/textures/poc-c03"
BRIGHTEN="eq=brightness=0.09:contrast=1.15:gamma=1.5"

[ -f "$VIDEO" ] || {
  echo "找不到影片:$VIDEO(請設定 DOOR_GALLERY_ROOT 或 C03_VIDEO)" >&2
  exit 1
}

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
CLOSE="$TMP/close.png"
OVERVIEW="$TMP/overview.png"

# 22s:平台表面最清楚;27s:欄杆和控制盒完整入鏡。完整影格只留在暫存目錄。
ffmpeg -y -loglevel error -ss 22 -i "$VIDEO" -frames:v 1 -vf "$BRIGHTEN" "$CLOSE"
ffmpeg -y -loglevel error -ss 27 -i "$VIDEO" -frames:v 1 -vf "$BRIGHTEN" "$OVERVIEW"

crop() {
  ffmpeg -y -loglevel error -i "$1" -vf "crop=$2" "$OUT/$3"
}

# w:h:x:y,來源 1280x800。元件幾何比例依這些裁切區域調整。
crop "$CLOSE" "48:192:1080:300" rust.png
# 網面暗部轉 alpha,讓斜視角能驗證真正的鏤空效果而非黑色底圖。
ffmpeg -y -loglevel error -i "$CLOSE" \
  -vf "crop=512:256:330:390,colorkey=black:0.18:0.08,format=rgba" \
  "$OUT/grid.png"
crop "$CLOSE" "260:180:350:100" plate-left.png
crop "$CLOSE" "360:170:625:180" plate-right.png
crop "$OVERVIEW" "96:144:440:40" controller.png

echo "C03 PoC 貼圖已產出 → $OUT"
ls -1 "$OUT"

#!/usr/bin/env bash
# make_montage.sh — 把一個資料夾的影格拼成單張九宮格,節省判讀時的視覺 token
# 用法: make_montage.sh <frames_dir> <out.png>
# 影格依檔名(時間)排序,由左到右、由上到下即時間順序。
set -euo pipefail
DIR="$1"; OUT="$2"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
i=1
for f in "$DIR"/frame_*.png; do
  cp "$f" "$TMP/seq_$(printf %02d $i).png"
  i=$((i+1))
done
N=$((i-1))
[ "$N" -eq 0 ] && { echo "no frames in $DIR" >&2; exit 1; }
COLS=3; ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -y -loglevel error -framerate 1 -i "$TMP/seq_%02d.png" \
  -vf "scale=500:-1,tile=${COLS}x${ROWS}" -frames:v 1 "$OUT"
echo "montage: $OUT (${N} frames, ${COLS}x${ROWS})"

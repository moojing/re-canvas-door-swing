#!/usr/bin/env bash
# extract_frames.sh — 從開門動畫影片抽分鏡影格,自動跳過黑幕區段
#
# 用法:
#   extract_frames.sh <video> <outdir> [count]              # 自動模式:偵測黑幕,只在有畫面的區段取樣
#   extract_frames.sh <video> <outdir> <count> <start> <end> # 範圍模式:在 [start,end] 秒內均勻取樣(用於補抽關鍵動作)
#
# 輸出: <outdir>/frame_<秒數>s.png,並在 stdout 印出影片長度與黑幕區段資訊
set -euo pipefail

VIDEO="$1"
OUTDIR="$2"
COUNT="${3:-10}"
RANGE_START="${4:-}"
RANGE_END="${5:-}"

mkdir -p "$OUTDIR"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
echo "duration: ${DUR}s"

extract_at() {
  local t="$1"
  local label
  label=$(printf '%05.1f' "$t")
  ffmpeg -y -v error -ss "$t" -i "$VIDEO" -frames:v 1 "$OUTDIR/frame_${label}s.png"
  echo "extracted: frame_${label}s.png"
}

if [[ -n "$RANGE_START" && -n "$RANGE_END" ]]; then
  # 範圍模式:均勻取樣,不做黑幕偵測
  awk -v s="$RANGE_START" -v e="$RANGE_END" -v n="$COUNT" 'BEGIN {
    for (i = 0; i < n; i++) printf "%.2f\n", s + (e - s) * i / (n - 1 > 0 ? n - 1 : 1)
  }' | while read -r t; do extract_at "$t"; done
  exit 0
fi

# 自動模式:先用 blackdetect 找出黑幕區段
BLACK_LOG=$(ffmpeg -i "$VIDEO" -vf "blackdetect=d=0.2:pix_th=0.10" -an -f null - 2>&1 | \
  grep -Eo 'black_start:[0-9.]+ black_end:[0-9.]+' || true)

if [[ -n "$BLACK_LOG" ]]; then
  echo "black segments:"
  echo "$BLACK_LOG" | sed 's/^/  /'
fi

# 由黑幕區段反推出「有畫面」的區段,依長度比例分配取樣數
echo "$BLACK_LOG" | awk -v dur="$DUR" -v n="$COUNT" '
  BEGIN { prev = 0; nseg = 0; nblack = 0 }
  NF > 0 {
    split($1, a, ":"); split($2, b, ":")
    bs = a[2]; be = b[2]; nblack++
    if (bs - prev > 0.3) { segs[nseg] = prev "," bs; nseg++ }
    prev = be
  }
  END {
    if (dur - prev > 0.3) { segs[nseg] = prev "," dur; nseg++ }
    if (nseg == 0) {
      if (nblack > 0) {  # 黑幕覆蓋全片:依約定回報錯誤,不取樣全黑影格
        print "error: no non-black frames (black segments cover the whole video)" > "/dev/stderr"
        exit 1
      }
      segs[0] = 0 "," dur; nseg = 1  # 全片無黑幕:整段均勻取樣
    }
    total = 0
    for (i = 0; i < nseg; i++) { split(segs[i], s, ","); total += s[2] - s[1] }
    for (i = 0; i < nseg; i++) {
      split(segs[i], s, ",")
      len = s[2] - s[1]
      k = int(n * len / total + 0.5); if (k < 1) k = 1
      # 區段頭尾各留 5% 邊距,避免抽到淡入淡出的半黑影格
      m = len * 0.05
      for (j = 0; j < k; j++)
        printf "%.2f\n", s[1] + m + (len - 2 * m) * j / (k - 1 > 0 ? k - 1 : 1)
    }
  }
' | while read -r t; do extract_at "$t"; done

#!/bin/sh
# WebM copies of the film's H.264 clips, for Playwright's Chromium (which cannot play H.264 or
# HEVC). Half size, VP9, same frames and timing: both builds play the same copies, so the
# comparisons hold. Usage: sh make-proxies.sh <out folder>     (FFMPEG=path to override)
set -e
OUT=${1:?usage: sh make-proxies.sh <out folder>}
FFMPEG=${FFMPEG:-ffmpeg}
SRC="$(cd "$(dirname "$0")/../.." && pwd)/public/media/club-scottsdale"
mkdir -p "$OUT"
for f in "$SRC"/*.mp4; do
  case "$f" in *.hevc.mp4) continue ;; esac
  out="$OUT/$(basename "${f%.mp4}").webm"
  [ -f "$out" ] && continue
  "$FFMPEG" -loglevel error -i "$f" -vf "scale=trunc(iw/4)*2:trunc(ih/4)*2" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -fps_mode passthrough -an "$out"
  echo "$out"
done

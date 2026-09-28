#!/bin/sh
# Pixel visual regression matrix: approved build vs component, same film times.
# Usage: OUT=dir PROXY_DIR=… [ONLY="m390 t810"] [CDN=http://host/club-scottsdale/] sh tests/run_vr.sh
cd "$(dirname "$0")/.."
OUT=${OUT:-/tmp/pcc-vr}; mkdir -p "$OUT"
cap() { node tests/vr_capture.js "$@" > /dev/null 2>> "$OUT/errors.log" || echo "capture failed: $*" >> "$OUT/errors.log"; }
pair() { # name w h mobile dpr step query file
  if [ -n "$ONLY" ]; then case " $ONLY " in *" $1 "*) ;; *) return 0 ;; esac; fi
  cap proto "$OUT/$1-proto" $2 $3 $4 $5 $6 &
  cap harness "$OUT/$1-fx" $2 $3 $4 $5 $6 "$7" "${8:-index.html}"; wait
  python3 tests/vr_compare.py "$OUT/$1-proto" "$OUT/$1-fx" "$OUT/$1" > "$OUT/$1.summary.json"
}
pair m390 390 844 1 2 0.5 ''
pair d1440 1440 900 0 1 0.5 noscrollbar=1
pair t810 810 1080 1 2 1.0 ''
pair tl1180 1180 820 1 2 1.0 noscrollbar=1
pair m375 375 667 1 2 1.0 ''
pair m390-hostile 390 844 1 2 2.0 hostile=1
pair d1440-hostile 1440 900 0 1 2.0 hostile=1\&noscrollbar=1
pair m390-ssr 390 844 1 2 2.0 '' ssr.html
# Media from another origin, as from a CDN (CDN=http://host/club-scottsdale/, a server with byte ranges)
[ -n "$CDN" ] && pair m390-cdn 390 844 1 2 2.0 "assetBase=$CDN"
true

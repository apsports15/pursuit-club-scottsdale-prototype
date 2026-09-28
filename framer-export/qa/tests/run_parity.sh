#!/bin/sh
# Computed-style parity matrix. Usage: OUT=dir PROXY_DIR=… sh tests/run_parity.sh
set -e
cd "$(dirname "$0")/.."
OUT=${OUT:-/tmp/pcc-parity}; mkdir -p "$OUT"
run() { name=$1; shift; FILE=${FILE:-index.html} node tests/style_parity.js "$@" > "$OUT/$name.json" 2> "$OUT/$name.err" || echo "$name failed"; }
run m390 390 844 1 2 &
run m375 375 667 1 2; wait
run t810 810 1080 1 2 &
run tl1180 1180 820 1 2 noscrollbar=1; wait
run d1440 1440 900 0 1 noscrollbar=1 &
run d1280 1280 720 0 1 noscrollbar=1; wait
run m390-hostile 390 844 1 2 hostile=1 &
run d1440-hostile 1440 900 0 1 hostile=1\&noscrollbar=1; wait
run m390-transform 390 844 1 2 transform=1 &
FILE=ssr.html run m390-ssr 390 844 1 2; wait

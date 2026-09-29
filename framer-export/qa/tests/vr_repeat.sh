#!/bin/sh
# Are frame differences the component's, or run-to-run noise in video decoding? Captures the
# given film times N times on each build and compares every run with every other, within and
# across builds. Usage: TIMES=1.55,53.05 PROXY_DIR=… sh tests/vr_repeat.sh <out> <w> <h> <mobile> <dpr> [query] [N]
cd "$(dirname "$0")/.."
OUT=$1; W=$2; H=$3; MOB=$4; DPR=$5; Q=${6:-}; N=${7:-3}
rm -rf "$OUT"; mkdir -p "$OUT"
i=1
while [ $i -le $N ]; do
  node tests/vr_capture.js proto "$OUT/p$i" $W $H $MOB $DPR 1 > /dev/null &
  node tests/vr_capture.js harness "$OUT/f$i" $W $H $MOB $DPR 1 "$Q" > /dev/null; wait
  i=$((i + 1))
done
python3 - "$OUT" "$N" <<'PY'
import itertools, json, subprocess, sys
out, n = sys.argv[1], int(sys.argv[2])
runs = [f'p{i}' for i in range(1, n + 1)] + [f'f{i}' for i in range(1, n + 1)]
for a, b in itertools.combinations(runs, 2):
    r = subprocess.run(['python3', 'tests/vr_compare.py', f'{out}/{a}', f'{out}/{b}', f'{out}/x-{a}-{b}'], capture_output=True, text=True)
    d = json.loads(r.stdout)
    diff = [(w['frame'], w['changed']) for w in d['worst'] if w['changed'] > 0.001]
    print(f'{a} vs {b}:', diff or 'same')
PY

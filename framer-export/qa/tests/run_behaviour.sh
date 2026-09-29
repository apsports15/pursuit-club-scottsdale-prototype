#!/bin/sh
# Viewer-level behaviour on both builds (the approved prototype and the component), one after
# the other so real-time playback is not starved. One JSON line per run.
# Usage: PROXY_DIR=… sh tests/run_behaviour.sh > behaviour.jsonl
cd "$(dirname "$0")/.."
one() { node tests/behaviour.js proto "$@"; node tests/behaviour.js harness "$@"; }
one transport 390 844 1 2
one transport 1440 900 0 1
one run 390 844 1 2
one run 1440 900 0 1
one lpm-swipe 390 844 1 2
one lpm-wheel 390 844 1 2

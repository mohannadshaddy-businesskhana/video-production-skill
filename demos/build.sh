#!/usr/bin/env bash
# One demo, end to end: gate the script → measure → check → render → normalise → verify.
#   ./build.sh 03-launch-video
# Stops at the first failure, because a render nobody gated is a render nobody trusts.
set -uo pipefail
export PATH="/c/Users/mohan/scoop/apps/ffmpeg/current/bin:$PATH"
export TEMP="D:/Projects/layla/video-output/.render-tmp"; export TMP="$TEMP"
HF="D:/npm-cache/_npx/110f701c48e68d66/node_modules/hyperframes/dist/cli.js"
SK="C:/Users/mohan/.claude/skills/video-production/scripts"
B="D:/Projects/video-production-skill/demos"
N="$1"; D="$B/$N"

step() { printf "%-14s %-9s " "$N" "$1"; }

step script
node "$SK/script_check.mjs" "$D/script.json" >/tmp/sc.$$ 2>&1
if ! grep -q "SCRIPT PASSED" /tmp/sc.$$; then echo "FAIL"; grep "FAIL" /tmp/sc.$$; exit 1; fi
echo "ok"

step manifest
cd "D:/Projects/layla"
node "$SK/manifest.mjs" "$D" 1080 1920 "$D/layout.json" >/tmp/mf.$$ 2>&1 || { echo "FAIL"; tail -3 /tmp/mf.$$; exit 2; }
echo "$(grep -o '([0-9]* elements[^)]*)' /tmp/mf.$$)"

step check
cd "$D"
node "$HF" check >/tmp/ck.$$ 2>&1
if grep -qE "^  [1-9][0-9]* error\(s\)" /tmp/ck.$$; then echo "FAIL"; grep "✗" /tmp/ck.$$ | head -6; exit 3; fi
echo "clean"

step render
node "$HF" render >/tmp/rd.$$ 2>&1 || { echo "FAIL"; tail -4 /tmp/rd.$$; exit 4; }
echo "$(grep -oE '[0-9]+\.[0-9]+s video' /tmp/rd.$$ | head -1)"

step normalise
R=$(ls -t "$D/renders/"*_2026*.mp4 | head -1)
bash "$SK/normalize.sh" "$R" "$D/renders/$N.mp4" >/tmp/nm.$$ 2>&1 || { echo "FAIL"; tail -3 /tmp/nm.$$; exit 5; }
echo "$(grep -oE '\-?[0-9]+\.[0-9]+ LUFS' /tmp/nm.$$ | head -1)"

step verify
cd "D:/Projects/layla"
node "$SK/verify.mjs" --video "$D/renders/$N.mp4" --manifest "$D/layout.json" \
  --config "$B/brand.json" --structure "$D/structure.json" \
  --json "$B/reports/$N.json" >/tmp/vf.$$ 2>&1
if grep -q "^PASSED" /tmp/vf.$$; then echo "PASSED"; else echo "FAIL"; grep "FAIL " /tmp/vf.$$; exit 6; fi

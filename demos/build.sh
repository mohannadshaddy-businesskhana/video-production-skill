#!/usr/bin/env bash
# One demo, end to end: gate the script → measure → check → render → normalise → verify.
#   ./build.sh 03-launch-video
#   ./build.sh 11-versions/square        a version in its own folder
# Stops at the first failure, because a render nobody gated is a render nobody trusts.
set -uo pipefail
export PATH="/c/Users/mohan/scoop/apps/ffmpeg/current/bin:$PATH"
export TEMP="D:/Projects/layla/video-output/.render-tmp"; export TMP="$TEMP"
HF="D:/npm-cache/_npx/110f701c48e68d66/node_modules/hyperframes/dist/cli.js"
SK="C:/Users/mohan/.claude/skills/video-production/scripts"
B="D:/Projects/video-production-skill/demos"
N="${1%/}"; D="$B/$N"
NAME="${N//\//-}"                        # 11-versions/square → 11-versions-square

step() { printf "%-22s %-9s " "$N" "$1"; }

# the frame is whatever the composition declares — a square version measured
# as 1080×1920 would pass every check while being blind to its own edges
read -r W H < <(node -e "
  const s = require('fs').readFileSync(process.argv[1], 'utf8');
  const root = s.match(/<div[^>]*id=\"root\"[^>]*>/s)[0];
  const n = (a) => root.match(new RegExp('data-' + a + '=\"([0-9]+)\"'))[1];
  console.log(n('width'), n('height'));" "$D/index.html")

# an operation demo plays other demos' renders; media.json names them, and a
# missing one stops the build here instead of rendering a black tile
if [ -f "$D/media.json" ]; then
  step media
  node -e "
    const fs = require('fs'), path = require('path');
    const [demos, dir] = process.argv.slice(1);
    const map = JSON.parse(fs.readFileSync(path.join(dir, 'media.json'), 'utf8'));
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    const missing = Object.values(map).filter((src) => !fs.existsSync(path.join(demos, src)));
    if (missing.length) { console.log('FAIL — build these first: ' + missing.join(', ')); process.exit(1); }
    for (const [name, src] of Object.entries(map)) fs.copyFileSync(path.join(demos, src), path.join(dir, 'media', name));
    console.log(Object.keys(map).length + ' staged');" "$B" "$D" || exit 7
fi

step script
node "$SK/script_check.mjs" "$D/script.json" >/tmp/sc.$$ 2>&1
if ! grep -q "SCRIPT PASSED" /tmp/sc.$$; then echo "FAIL"; grep "FAIL" /tmp/sc.$$; exit 1; fi
echo "ok"

step manifest
cd "D:/Projects/layla"
node "$SK/manifest.mjs" "$D" "$W" "$H" "$D/layout.json" >/tmp/mf.$$ 2>&1 || { echo "FAIL"; tail -3 /tmp/mf.$$; exit 2; }
echo "$(grep -o '([0-9]* elements[^)]*)' /tmp/mf.$$) ${W}x${H}"

step check
cd "$D"
node "$HF" check >/tmp/ck.$$ 2>&1
if grep -qE "^  [1-9][0-9]* error\(s\)" /tmp/ck.$$; then echo "FAIL"; grep "✗" /tmp/ck.$$ | head -6; exit 3; fi
echo "clean"

step render
node "$HF" render >/tmp/rd.$$ 2>&1 || { echo "FAIL"; tail -4 /tmp/rd.$$; exit 4; }
echo "$(grep -oE '[0-9]+\.[0-9]+s video' /tmp/rd.$$ | head -1)"

step normalise
R=$(ls -t "$D/renders/"*_20[0-9][0-9]-[0-9][0-9]-*.mp4 | head -1)
bash "$SK/normalize.sh" "$R" "$D/renders/$NAME.mp4" >/tmp/nm.$$ 2>&1 || { echo "FAIL"; tail -3 /tmp/nm.$$; exit 5; }
echo "$(grep -oE '\-?[0-9]+\.[0-9]+ LUFS' /tmp/nm.$$ | head -1)"

step verify
cd "D:/Projects/layla"
node "$SK/verify.mjs" --video "$D/renders/$NAME.mp4" --manifest "$D/layout.json" \
  --config "$B/brand.json" --structure "$D/structure.json" \
  --json "$B/reports/$NAME.json" >/tmp/vf.$$ 2>&1
if grep -q "^PASSED" /tmp/vf.$$; then echo "PASSED"; else echo "FAIL"; grep "FAIL " /tmp/vf.$$; exit 6; fi

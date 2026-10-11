#!/usr/bin/env bash
# Before a 20-minute render: build, measure, and list what the verifier would fail on reading time
# and caption height — six of eight renders of review 1 failed on exactly this.
#   bash tools/precheck.sh <name>
set -uo pipefail
NAME="$1"; W="work/$NAME"; export TEMP=D:/render-tmp
node template/build.mjs "$W/spec.json" >/dev/null || { echo "PRECHECK $NAME: build failed"; exit 2; }
node $HOME/.claude/skills/video-production/scripts/manifest.mjs "$W/public" 1080 1920 "$W/layout.json" > "$W/manifest.log" 2>&1 || { echo "PRECHECK $NAME: manifest failed: $(tail -2 "$W/manifest.log")"; exit 3; }
node -e '
const m=require("./"+process.argv[1]+"/layout.json");let n=0;
for(const e of m.elements){if(e.type!=="text"||e.texture)continue;const d=(e.frames[1]-(e.still_from??e.frames[0]))/m.fps;
 const tall=e.zone==="captions"&&e.bbox&&e.bbox[3]-e.bbox[1]>180;if(d<1.5||tall){n++;console.log("  ",e.id,d.toFixed(2)+"s",tall?"TALL":"",e.text)}}
console.log("PRECHECK",process.argv[2],n?n+" issue(s)":"ok");process.exit(n?1:0)' "$W" "$NAME"

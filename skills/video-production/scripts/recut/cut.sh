#!/usr/bin/env bash
# After the edit decision (work/<name>/edit.json): cut picture and sound on the same frames,
# normalise, and put the words on the edited clock: the raw transcript re-timed through the cuts,
# then aligned to the cut audio against Groq Whisper's clock.
#   bash <SKILL>/scripts/recut/cut.sh <name>
set -euo pipefail
NAME="$1"; W="work/$NAME"
KEYS="${KEYS:?set KEYS to a .env file holding GROQ_API_KEY and GEMINI_API_KEY}"
T="$(cd "$(dirname "$0")" && pwd)"
SK="$(dirname "$T")"
node "$T/plan_cuts.mjs" "$W/edit.json" "$W/words.json" "$W" >/dev/null
node "$SK/repair_holes.mjs" "$W/repaired_norm.mp4" "$W/aroll.mov" --holes "$W/cuts.json" --no-clean >/dev/null
bash "$SK/normalize.sh" "$W/aroll.mov" "$W/aroll_norm.mp4" >/dev/null
rm -f "$W/aroll.mov" "$W/public/aroll.mp4"
ffmpeg -v error -y -i "$W/aroll_norm.mp4" -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 48k "$W/aroll16k.mp3"
rm -f "$W/transcript-aroll.json" "$W/groq-aroll.json"
# the words are the raw take minus the cuts — re-timed by plan_cuts, no second transcription
node "$T/remap_transcript.mjs" "$W/words_edit.json" "$W/transcript-aroll.json" "$W/edit.json"
# Whisper invents a channel outro ("اشترك في القناة") over the first seconds unless told what the
# talk is: the opening sentence goes in as its prompt
PROMPT=$(node -e 'console.log(require("./" + process.argv[1]).segments[0].text.slice(0, 120))' "$W/transcript-aroll.json")
node "$T/groq_words.mjs" "$W/aroll16k.mp3" "$W/groq-aroll.json" --key-file "$KEYS" --prompt "$PROMPT"
node "$T/align_words.mjs" "$W/aroll16k.mp3" "$W/transcript-aroll.json" "$W/words_final.json" "$W/groq-aroll.json" | head -1
echo "CUT_OK $NAME $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/aroll_norm.mp4")"

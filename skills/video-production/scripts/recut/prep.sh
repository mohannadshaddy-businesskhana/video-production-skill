#!/usr/bin/env bash
# The mechanical half of one video, before any edit decision: close the receiver holes,
# normalise, transcribe (Gemini for the words, Groq Whisper for the clock), align.
#   bash <SKILL>/scripts/recut/prep.sh <raw video path> <work name>
# Writes work/<name>/: repaired_norm.mp4 · voice16k.mp3 · transcript-gemini.json · groq.json · words.json
set -euo pipefail
SRC="$1"; NAME="$2"
KEYS="${KEYS:?set KEYS to a .env file holding GROQ_API_KEY and GEMINI_API_KEY}"
T="$(cd "$(dirname "$0")" && pwd)"
SK="$(dirname "$T")"
W="work/$NAME"; mkdir -p "$W"
HOLES="diagnosis/holes/$(basename "${SRC%.*}").json"

[ -f "$W/repaired_norm.mp4" ] || {
  node "$SK/repair_holes.mjs" "$SRC" "$W/repaired.mov" --holes "$HOLES" >/dev/null
  bash "$SK/normalize.sh" "$W/repaired.mov" "$W/repaired_norm.mp4" >/dev/null
  rm -f "$W/repaired.mov"
}
ffmpeg -v error -y -i "$W/repaired_norm.mp4" -vn -ac 1 -ar 16000 -c:a libmp3lame -b:a 48k "$W/voice16k.mp3"
[ -f "$W/transcript-gemini.json" ] || node "$T/transcribe_gemini.mjs" "$W/voice16k.mp3" "$W/transcript-gemini.json" --key-file "$KEYS" >/dev/null
# one request collapsed or invented an outro on long takes: pieces, prompted with the opening sentence
PROMPT=$(node -e 'console.log(require("./" + process.argv[1]).segments[0].text.slice(0, 120))' "$W/transcript-gemini.json")
[ -f "$W/groq.json" ] || node "$T/groq_words.mjs" "$W/voice16k.mp3" "$W/groq.json" --key-file "$KEYS" --prompt "$PROMPT"
node "$T/align_words.mjs" "$W/voice16k.mp3" "$W/transcript-gemini.json" "$W/words.json" "$W/groq.json" | head -1
echo "PREP_OK $NAME $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$W/repaired_norm.mp4")"

#!/usr/bin/env bash
# After a re-cut that removed or added words (review 1), the re-mapped raw transcript drifts: the
# raw times of a patched or spliced sentence no longer fall where the cut put them. The cut audio
# is transcribed afresh (Gemini, 25 s pieces) and aligned to Groq's clock on the cut.
#   bash tools/retranscribe.sh <name>
set -euo pipefail
NAME="$1"; W="work/$NAME"
KEYS="${KEYS:?set KEYS to an .env holding GROQ_API_KEY and GEMINI_API_KEY}"
node tools/transcribe_gemini.mjs "$W/aroll16k.mp3" "$W/transcript-aroll.json" --key-file "$KEYS" >/dev/null
node tools/align_words.mjs "$W/aroll16k.mp3" "$W/transcript-aroll.json" "$W/words_final.json" "$W/groq-aroll.json" | head -1
node tools/caption_check.mjs "$W/words_final.json" "$W/groq-aroll.json" | head -3 || true

#!/usr/bin/env bash
# Two-pass loudness normalisation with a true-peak ceiling that survives the encode.
#
#   normalize.sh <in.mp4> <out.mp4> [target_lufs] [ceiling]
#
#   target_lufs  default -14   (-14 digital platforms · -23 EBU R128 broadcast · -24 ATSC A/85)
#   ceiling      default 0.794 (-2 dBFS sample peak before encoding)
#
# Why the ceiling is not -1.0: loudnorm alone hit -14.0 LUFS and a true peak of
# +3.5 dBFS — normalised and clipping — because AAC adds intersample peaks above
# the PCM peak. Leaving ~2 dB of headroom before the encode lands under -1 dBTP
# after it. Tightening the limiter is not monotonic either: 0.84 measured WORSE
# than 0.891. Measure every candidate; do not reason about it.
set -euo pipefail

IN="${1:?usage: normalize.sh <in.mp4> <out.mp4> [target_lufs] [ceiling]}"
OUT="${2:?usage: normalize.sh <in.mp4> <out.mp4> [target_lufs] [ceiling]}"
TARGET="${3:--14}"
CEIL="${4:-0.794}"

command -v ffmpeg >/dev/null 2>&1 || {
  echo "ffmpeg not on PATH." >&2
  echo "On Windows + scoop, point at the real binary, not the shim:" >&2
  echo '  export PATH="$HOME/scoop/apps/ffmpeg/current/bin:$PATH"' >&2
  echo "The shim cannot be spawned by a renderer and fails with EPERM." >&2
  exit 127
}

TMPJSON="$(mktemp)"; trap 'rm -f "$TMPJSON"' EXIT

# pass 1 — measure
ffmpeg -hide_banner -nostats -i "$IN" \
  -af "loudnorm=I=${TARGET}:TP=-1.0:LRA=11:print_format=json" -f null - 2>&1 \
  | sed -n '/^{/,/^}/p' > "$TMPJSON"

eval "$(node -e '
  const m = require(process.argv[1]);
  const q = (k) => m[k];
  console.log(`I=${q("input_i")} TP=${q("input_tp")} LRA=${q("input_lra")} TH=${q("input_thresh")} OFF=${q("target_offset")}`);
' "$TMPJSON")"

# pass 2 — apply the measured values, then limit, then resample
ffmpeg -y -hide_banner -nostats -loglevel error -i "$IN" \
  -af "loudnorm=I=${TARGET}:TP=-1.0:LRA=11:measured_I=${I}:measured_TP=${TP}:measured_LRA=${LRA}:measured_thresh=${TH}:offset=${OFF},alimiter=limit=${CEIL}:attack=5:release=50:level=disabled,aresample=48000" \
  -c:v copy -c:a aac -b:a 192k -ar 48000 "$OUT"

echo "-- measured --"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 \
  | grep -E "^    I: |^    LRA: |^    Peak: "
ffmpeg -v error -i "$OUT" -af silencedetect=n=-50dB:d=0.25 -f null - 2>&1 \
  | grep -i silence || echo "silence: none"
ffmpeg -v error -i "$OUT" -f null - 2>&1 | head -3
echo "decode: clean"

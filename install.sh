#!/usr/bin/env bash
# Install the skill for Claude Code.
set -euo pipefail
DEST="${1:-$HOME/.claude/skills}"
SRC="$(cd "$(dirname "$0")" && pwd)/skills/video-production"
mkdir -p "$DEST"
rm -rf "$DEST/video-production"
cp -r "$SRC" "$DEST/video-production"
echo "installed → $DEST/video-production"
echo
echo "Checking what it depends on:"
command -v ffmpeg  >/dev/null && echo "  ok   ffmpeg"  || echo "  MISSING  ffmpeg"
command -v ffprobe >/dev/null && echo "  ok   ffprobe" || echo "  MISSING  ffprobe"
command -v python  >/dev/null && echo "  ok   python"  || echo "  MISSING  python 3.10+"
command -v node    >/dev/null && echo "  ok   node"    || echo "  MISSING  node 18+"
python - <<'PY' 2>/dev/null || echo "  MISSING  python packages: pip install numpy Pillow"
import numpy, PIL
print("  ok   numpy + Pillow")
PY
echo
echo "The rendering framework is installed on first use: npx hyperframes"

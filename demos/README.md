# Demos

One short vertical film per video type the skill can produce. Each is a separate
composition with its own visual language — that is the point. A single template
restyled would demonstrate the opposite of what is being claimed.

All of them explain the skill itself, so the content is a constant and the
**form** is the variable.

| | Type | What it demonstrates |
|---|---|---|
| `01-brand-film` | brand film | one claim, said slowly; the form earns its weight by refusing to list things |
| `02-pr-to-video` | a code change | dense, monospaced, literal — the diff *is* the visual |

## Running one

```bash
cd 01-brand-film
node ../../skills/video-production/scripts/manifest.mjs . 1080 1920 layout.json
npx hyperframes@0.8.48 check
npx hyperframes@0.8.48 render
bash ../../skills/video-production/scripts/normalize.sh renders/<rendered>.mp4 renders/out.mp4
node ../../skills/video-production/scripts/verify.mjs \
  --video renders/out.mp4 --manifest layout.json \
  --config ../brand.json --structure structure.json
```

## Before you render

`_assets/` holds the fonts and the music bed, and each demo links to it.

- **Fonts** ship with the repo: Cairo, Inter and JetBrains Mono, all SIL OFL.
- **Music does not.** Put a track you have cleared at `_assets/music/bed.mp3`.
  Nothing renders without it — the loudness and beat-continuity checks both need
  real audio, and a silent file fails the gate rather than passing quietly.

On Windows the per-demo `assets` link is a junction:

```bash
cmd //c mklink //J assets "..\_assets"      # Windows
ln -s ../_assets assets                       # macOS / Linux
```

## What the pilot cost

Neither film passed first time, and both failures were real:

- the brand film's closing footer held for **1.4s** against a 1.5s reading floor
- the code film's last chapter measured **33% coverage** against a 45% floor

The second one was fixed by giving the chapter a fourth second rather than by
speeding the text up — the number and the fault are not the same thing.

Building them also exposed three defects in the skill itself: `normalize.sh`
`require()`-ing a JSON file with no extension, the palette check reporting a
clean pass on a file that did not exist, and the six-beat narrative skeleton
being enforced on forms that have no such spine.

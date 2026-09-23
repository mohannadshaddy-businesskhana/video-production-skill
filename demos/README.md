# Demos

One short vertical film per video type the skill can produce. Each is a separate
composition with its own visual language — that is the point. A single template
restyled would demonstrate the opposite of what is being claimed.

All of them explain the skill itself, so the content is a constant and the
**form** is the variable.

| | Type | What it demonstrates |
|---|---|---|
| `01-brand-film` | brand film | one claim, said slowly; the form earns its weight by refusing to list things |
| `02-pr-to-video` | a code change | dense, monospaced, literal — the terminal *is* the visual |

Each composition's header comment carries its **cold-read ledger**: what the viewer
must already know at each chapter boundary, and which earlier chapter supplied it.

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

**Both scripts were rewritten after the first cut, and the craft was never the
problem.** Version 1 of each passed all fifteen checks and failed with the first
human who watched:

- the brand film sold the **mechanism** — "it knows how to refuse the video."
  Nobody buys a tool because it refuses things. There was no person in it and
  nothing at stake. (`failure-log #40`)
- the code film opened on `feat(deps): drop Python` and showed `18 renders ·
  same`. Compared against what? The same as what? It was a changelog for a
  project nobody watching had been following — and the one viewer who could not
  follow it was the person who had commissioned the work it described.
  (`failure-log #41`)

That is the gap this repo's verifier structurally cannot close: it measures
whether text **can** be read — dwell, contrast, stillness, coverage — and has
nothing to say about whether it **means** anything to a stranger. Hence the
cold-read gate in `references/narrative.md §2b`, which runs on the script before
a line of composition code exists.

The craft failures were cheaper and caught by the machine: a closing footer that
held 1.4s against a 1.5s floor, and a chapter at 33% coverage against a 45%
floor. The second was fixed by giving the chapter a fourth second rather than
speeding the text up — moving the number without moving the fault is how a gate
gets hollowed out.

Building them also exposed three defects in the skill itself: `normalize.sh`
`require()`-ing a JSON file with no extension, the palette check reporting a
clean pass on a file that did not exist, and the six-beat narrative skeleton
being enforced on forms that have no such spine.

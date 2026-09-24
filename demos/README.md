# Demos

One short vertical film per video type the skill can produce. Each is a separate
composition with its own visual language — that is the point. A single template
restyled thirteen times would demonstrate the opposite of what is being claimed.

All of them explain the skill itself, so the **content is a constant and the
form is the variable**. Each is 18–24s, 1080×1920, −14 LUFS, and passes both the
script gate and the render gate.

| | Type | What its form is built from | Ground |
|---|---|---|---|
| `01-brand-film` | brand film | one claim at a time, a bracketed frame, air | ink |
| `02-pr-to-video` | step-by-step tutorial | a numbered spine, document blocks | bone |
| `03-launch-video` | launch video | a burst, a week crossed down to a day, hard edges | **amber field** |
| `04-section-series` | section series | a rail that never moves, an 18-cell grid, one frame whose contents swap | ink |
| `05-explainer` | faceless explainer | ruled paper and a diagram that draws itself | **white** |
| `06-motion-graphics` | motion graphics | **one amber shape for the whole film** — a circle, a day, a block, a chart, three steps, the circle again, a button. Nothing cuts, nothing fades | bone |
| `07-music-video` | music video | **the whole frame cuts on every beat** — 33 hard cuts from the track's own beat map, no fades; the claim lands on the drop | amber · bone · ink, per beat |
| `08-product-tour` | product tour | browser chrome, a real page, one push-in and a cursor | **grey** |
| `09-talking-head` | talking-head recut | a footage plate that never changes, with cards arriving over it | ink |
| `10-captions` | burned-in captions | a caption band whose words light one at a time | ink |
| `11-versions` | platform versions | a spec table — the only demo built as a document | bone |
| `12-localized` | localization | twin language columns and a measured growth meter | bone |
| `13-cutdowns` | cutdowns | a horizontal track that shortens three times | ink |

Every composition's header comment carries its **cold-read ledger**: what the
viewer must already know at each chapter boundary, and which earlier beat
supplied it.

## Running one

```bash
./build.sh 05-explainer
```

That is the whole loop — gate the script, measure, check the composition,
render, normalise, verify — stopping at the first failure. A render nobody
gated is a render nobody trusts.

## Before you render

`07-music-video` is cut to **our** track: its beat length and the drop at beat 16
were read with `hyperframes beats`. With another track, run that on it and set
`BEAT` and `DROP` in the composition from the result — a cut that misses the beat
is the one thing a music video cannot get away with.

`_assets/` holds the fonts and the music bed, and each demo links to it.

- **Fonts** ship with the repo: Cairo, Inter and JetBrains Mono, all SIL OFL.
- **Music does not.** Put a track you have cleared at `_assets/music/bed.mp3`.
  Nothing renders without it — the loudness and beat-continuity checks both need
  real audio, and a silent file fails the gate rather than passing quietly.

On Windows the per-demo `assets` link is a junction:

```bash
cmd //c mklink //J assets "..\\_assets"      # Windows
ln -s ../_assets assets                       # macOS / Linux
```

## What the set cost

**Four scripts were rejected outright before any of this worked**, and the craft
was never the problem. Version 1 of the first two demos passed all fifteen render
checks and failed with the first human who watched. They had no hook, no value
form and no CTA — see `references/short-form.md`, which exists because of them.

Once the script gate was in place, the render gate kept finding things the eye
did not:

| | |
|---|---|
| the amber measured **2.99:1** on the bone ground | one hundredth under the floor; mixed 15% toward the ink |
| grey body text measured **1.94:1** on ink | raised to 45% opacity |
| the launch film failed the palette at **exactly 2.0%** | 4:2:0 chroma subsampling on thin diagonals over a saturated field — see `toolchain-traps.md` §2.3 |
| a push-in started **inside a headline's reading window** | motion beats position: the text settles, *then* the camera moves |
| eight coverage failures | every one fixed by spreading across the safe band, never by enlarging |
| six short dwells, one as low as **0.5s** | the script gate models words; the render gate models the stillness after the entrance. Both are needed |

Not one threshold was raised to make a demo pass.

# Demos

One short vertical film per video type the skill can produce. All of them sell
the skill itself, so the **content is a constant and the form is the variable**.
Each is 18–24s, 1080×1920, −14 LUFS, and passes both the script gate and the
render gate.

The first set failed that premise. Thirteen demos were rejected as "all the same
style", and they were: one format — a heading, abstract shapes fading in, a
closing line — reskinned thirteen times in a different colour. A type is not a
colour. It is a **grammar**: what carries the information, what the camera does,
whether a voice or the music leads, and how the edit breathes
(`references/video-types.md`). Each film below is being rebuilt to its own.

## The types

| | Type | What carries it · what the camera and the edit do | Status |
|---|---|---|---|
| `01-brand-film` | brand film | one claim at a time, slow holds, air | ✅ |
| `02-pr-to-video` | step-by-step tutorial | a numbered spine, one step per chapter | ✅ |
| `03-launch-video` | launch video | **the product, fast** — close-ups of the workspace cut on the beats, whips between chapters, a speed ramp into the drop, a sound on every hit | ✅ v2 |
| `06-motion-graphics` | motion graphics | **one shape for the whole film** — a circle, a day, a block, a chart, three steps, the circle again, a button. Nothing cuts, nothing fades | ✅ v2 |
| `07-music-video` | music video | **the whole frame cuts on every beat** — 33 hard cuts from the track's own beat map; the claim lands on the drop | ✅ v2 |
| `08-product-tour` | product tour | **a cursor drives the interface for the whole film** — scroll, push in, type, click, pull back | ✅ v3 |
| `05-explainer` | whiteboard | a hand drawing on a board, **paced by a narrator** | ⏳ needs a voice |
| `09-talking-head` | talking head | a person on camera, cut on sentences | ⏳ needs a voice and a face |
| `10-captions` | captions-led | speech, with its words lighting as they are spoken | ⏳ needs a voice |

A type that is led by a voice is not faked here. The local speech engine has no
Arabic, so those three wait for a voice that speaks it — a TTS account or the
client's own recording — rather than shipping captions of nothing.

## The operations

Four things in most lists of "video types" are **operations on a video that
already exists**, and they are demonstrated on one of the films above instead of
inventing a style for each:

| | Operation | The honest demonstration | Status |
|---|---|---|---|
| `11-versions` | aspect versions | **06 in 9:16, 1:1 and 16:9, side by side and in sync** — one timeline and a geometry table per ratio, each version verified at its own size and safe band | ✅ |
| `13-cutdowns` | cutdowns | the same film at full length, 15s and 6s, each with its own hook and close | ⏳ |
| `12-localized` | localization | the same film in Arabic and English, with the re-layout the translation forced | ⏳ |
| `04-section-series` | series | three episodes of one template, back to back | ⏳ |

Every composition's header comment carries its **cold-read ledger**: what the
viewer must already know at each chapter boundary, and which earlier beat
supplied it.

## Running one

```bash
./build.sh 06-motion-graphics
```

That is the whole loop — gate the script, measure, check the composition,
render, normalise, verify — stopping at the first failure. A render nobody
gated is a render nobody trusts.

An **operation** demo plays other demos' renders, listed in its `media.json`.
Build those first; `build.sh` copies them into `media/` and stops if one is
missing:

```bash
./build.sh 06-motion-graphics && ./build.sh 11-versions/square && ./build.sh 11-versions/wide
./build.sh 11-versions
```

The motion-graphics film and its versions are **generated**: edit
`_src/motion-graphics/` (one timeline, one geometry table per ratio) and run
`node _src/motion-graphics/emit.mjs` — never the emitted `index.html` files.

## Before you render

`_assets/` holds the fonts and the music bed, and each demo links to it.

- **Fonts** ship with the repo: Cairo, Inter and JetBrains Mono, all SIL OFL.
- **Music does not.** Put a track you have cleared at `_assets/music/bed.mp3`.
  Nothing renders without it — the loudness and beat-continuity checks both need
  real audio, and a silent file fails the gate rather than passing quietly.
- **Nor do the sound effects** — put your own at `_assets/sfx/` under the names
  the compositions use (`whoosh-short`, `pop`, `click`, `click-soft`,
  `key-press`, `chime`).

`07-music-video` is cut to **our** track: its beat length and the drop at beat 16
were read with `hyperframes beats`. With another track, run that on it and set
`BEAT` and `DROP` in the composition from the result — a cut that misses the beat
is the one thing a music video cannot get away with. 03 and 06 start their moves
on the same grid.

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
Then the whole set was rejected for being one format in thirteen colours —
`references/video-types.md` exists because of that.

Once the script gate was in place, the render gate kept finding things the eye
did not — and twice, the gate itself was wrong:

| | |
|---|---|
| the amber measured **2.99:1** on the bone ground | one hundredth under the floor; mixed 15% toward the ink |
| grey body text measured **1.94:1** on ink | raised to 45% opacity |
| a push-in started **inside a headline's reading window** | motion beats position: the text settles, *then* the camera moves |
| eight coverage failures | every one fixed by spreading across the safe band, never by enlarging |
| six short dwells, one as low as **0.5s** | the script gate models words; the render gate models the stillness after the entrance. Both are needed |
| the music video failed the palette at **2.5%** | the check was reading a scaled copy; the same frame is **0.6%** at full size. Fixed in the check, proven on a control that still fails a real 3% patch — failure-log #46 |
| **English labels** in four Arabic films, with the language check green | each was declared with empty text, and "OF" and "IT" were listed as brand names. The check now reads the page's own text — failure-log #39 |
| a morph that snapped to **whole pixels** | box geometry in CSS stutters in an ease tail; the shape became SVG |

Not one threshold was raised to make a demo pass.

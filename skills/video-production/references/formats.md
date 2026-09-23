# Multi-aspect delivery — one timeline, one geometry table per ratio

## The rule

**A second aspect ratio is a re-layout, not a crop.** And re-arranging blocks is not enough either:
a 9:16 that merely stacks the 16:9 blocks reads as a compromise. Each ratio is designed, and each is
**verified against its own numbers**.

## The architecture that worked

```
_src/index.src.html   content + base CSS          ← one copy
_src/timeline.js      the timeline                ← one copy, shared verbatim
formats.mjs           geometry per ratio          ← the only thing that forks
emit.mjs              merges them → one project per ratio
```

The timeline is what costs the verification, so it never forks. The generator injects
`window.__FMT` (geometry) and `window.__VID` (content), and inlines the timeline.

## Three details that decide whether this works

**1. Inline styles beat generated CSS.** Any number written in a `style="..."` attribute needs
`!important` in the generated block to be overridden. Without it the new ratio silently inherits the
old ratio's numbers and looks almost right — which is worse than looking wrong.

**2. The lint reads the first `html, body` rule.** Appending a second one renders correctly and
still fails `root_dimensions_mismatch`. **Replace** the original rule; do not add to it.

**3. Every checker takes the format as an argument.** A threshold written for 1920×1080 reports
"clean" on a vertical frame while being blind. One real case: the background-exclusion threshold was
hardcoded `>= 1900 && >= 1060`, so on 9:16 and 1:1 the background counted as content and coverage
reported **100% for every chapter** — an impossible number that looked like a pass.

## What broke on the first vertical build

Each of these was invisible in 16:9:

| Symptom | Cause |
|---|---|
| Coverage reports 100% everywhere | exclusion threshold written in 16:9 pixels |
| A black strip drifts in from the edge | background exactly the frame's width + a drift tween |
| Text touches its neighbour | `width:max-content` inside a narrower centred box — it spills both ways |
| The slogan sits half outside the frame | a ±56px stagger designed for a 1920 frame |
| The counter escapes its zone | fixed font size, narrower zone — for monospace, font ≈ zone width ÷ 5 |
| The definition line is wider than the screen | `ph-line` does not wrap; needs `white-space:normal` + `max-width` |
| A logo renders 320 wide by 32 tall | an SVG in a flex column without `flex-shrink: 0` |

## Order of work

1. Build and **approve one ratio** completely.
2. Then a **pilot for each additional ratio** — one video, fixed until it passes.
3. Then batch that ratio.

Never generate all ratios before the first is approved. A geometry fault found in ratio one costs
one fix; found after three batches it costs three.

## Directory names

Name output directories with **words**, not ratios — `wide` / `vertical` / `square`. A directory
named `9x16` made the renderer fail at the audio stage with `spawn EPERM` while byte-identical
content in `vertical` rendered first time, because the output file is named after the directory.

# Production rules

> Every rule here is **measurable**. What cannot be measured belongs in `narrative.md`.
> Each rule carries the number of its mistake in `failure-log.md`.

## Index

1. Zones and layout
2. Typography and reading
3. Motion
4. Audio
5. Interface
6. Brand
7. Multiple aspect ratios
8. The two variants (voiceover / silent)
9. The CTA
10. The manifest

---

## 1. Zones and layout

### The safe band `#18`

Every piece of text and every essential element sits **between 12% and 72% of frame height**.

| Ratio | `y` band | Forbidden |
|---|---|---|
| 16:9 · 1080 | 130 → 778 | 0–129 · 779–1080 |
| 9:16 · 1920 | 230 → 1382 | 0–229 · 1383–1920 |
| 1:1 · 1080 | 130 → 778 | 0–129 · 779–1080 |

The bottom 28% belongs to the caption, the account name, and the platform's own interaction buttons.

### The zone system `#20`

**"No overlapping" as a prose rule was violated twice.** The answer is zones with coordinates plus a
zone guard.

| Zone | 16:9 | Contents |
|---|---|---|
| **A** | `x 96→560` · `y 140→300` | counter / status indicator — **reserved** |
| **B** | `x 1560→1824` · `y 140→260` | fixed logo — **reserved** |
| **C** | `x 96→900` · `y 340→700` | narrative text blocks |
| **D** | `x 940→1824` · `y 300→760` | interface / visual element |
| **E** | `x 96→1500` · `y 140→220` | fixed chapter header |

- An unused zone merges into its neighbour
- C and D swap left/right by scene — **but they never overlap**
- Zones scale proportionally for 9:16 and 1:1

### Frame coverage `#21`

**The content bbox is ≥ 45%** of the frame area.

```
bbox     = the smallest rectangle enclosing every visible element
coverage = bbox area ÷ frame area
```

Measured **per chapter**, not once for the whole video. And measured at the chapter **midpoint** —
an element arriving after it does not count.

**When it fails, the answer is distribution, not enlargement.**

### Contrast `#22`

Any geometric element on a dark ground:

- fill: a light palette colour at **≥ 20%** opacity
- border: **2px** in a palette colour at **≥ 70%** opacity

**No colour outside the palette** — grey is made with opacity, not with a new colour.

---

## 2. Typography and reading

### Fonts `#04`

From the brand guide **by name**. No substitution, no fallback, no extra font.

### The size scale

The guide's scale is built for screens at reading distance. Video is watched from further away, so
the levels **shift one step up within the same scale** — **without exceeding the guide's ceiling**.

| Video level | @1920×1080 |
|---|---|
| Hero headline | the guide's DISPLAY maximum |
| Large number | the same |
| Headline | the guide's HEADING maximum |
| Body | the guide's HEADING minimum |
| Label | SUBHEAD |

`9x16` × 1.25 · `1x1` × 1.1

### Reading time `#31`

**≥ 1.5 seconds of complete stillness after the element's motion ends** — not counting the motion.

**One exception:** visual texture that is not meant to be read. If it is used, it is **written into
the script as an explicit exception, with its reason and with a specification that prevents an
attempt to read it** (small size · low opacity · in a corner).

### Mixed-script alignment

RTL and Latin text on the same line: `align-items: baseline` plus an RTL offset of `+0.08em`
downward. Without it any horizontal rule — a strikethrough, an underline — cuts the two scripts at
two different heights.

---

## 3. Motion

### One motion at a time `#28 #29`

> **Motion beats position, size and colour.**

| Case | Answer |
|---|---|
| New text + motion in frame | the text arrives and settles **with the frame completely still** for ≥1.5s, then the motion starts |
| Two large motions | the first finishes before the second |
| Continuous motion (counter, typing cursor) | never coincides with new text |

**The practical rule:** if something in the frame is moving, there is no new text. If there is new
text, the frame is still.

### Accumulation, not replacement `#30`

In any enumerating scene, **items accumulate and stay**.

| ❌ | ✅ |
|---|---|
| one item leaves as another arrives | one item appears and stays, the next appears beside it |
| two items' text at the crossover point | a list that grows |
| nothing is ever complete | the last frame holds everything |

If replacement is unavoidable: **a hard cut, not a continuous slide.**

### Transition by transformation

In a sequence of related scenes, the transition is **the shape itself transforming**, not an exit
and an entrance.
Example: `22 squares → one square → 4 nodes → 13 bars → 3 rows`

- 14 frames · **linear easing** (geometric transformation is cleanest linear) · no fade
- It saves frames (14 instead of 26) and removes the empty frame between two scenes

### Permitted transitions `#33`

**Cut · block slide · shape transformation.**
Any transition where dozens of elements change in under 10 frames **will read as a glitch**.

### Forbidden

Soft motion blur · glow · drop shadow · colour gradients · long cross-dissolves.
**No frozen frame:** a continuous drift of `scale 1.00 → 1.04` or a 20px move.

### Counters `#32`

```
value = total × t^1.4          where t = (frame − start) / (end − start)
```

The exponent **1.4** — perceptible acceleration without a jump.
**Define 5 checkpoints by frame in the spec** and verify them in the render (±3 units).
`font-variant-numeric: tabular-nums` is mandatory.

---

## 4. Audio

| Item | Spec |
|---|---|
| Integrated | **−14 LUFS** ±1 for digital · −23 EBU · −24 ATSC `#25` |
| True peak | ≤ −1.0 dBTP, with real headroom before the encode |
| **The track** | **runs from frame 0 to the last frame without stopping** `#27` |
| Every change | **gain automation over a continuous track** — no cut, no restart |
| Minimum duck | **−30 dB** — never to zero `#26` |
| Hits | **low-passed at 12 kHz** — a full-spectrum hit reads as a click |
| Fade-out | only after the CTA has settled |

> ⚠️ **`silencedetect` passes straight over mistake #27.** If the track stopped and came back off
> the rhythmic grid there is no silence, but the ear hears a fault.
> **The correct check is pulse regularity in the spectrum across the ducked region.** `verify.mjs`
> does it.

---

## 5. Interface

- **From the product's actual components** — no approximations, no borrowed screenshots `#13`
- **A checkable condition:** count the navigation items in the render — they must match the config
  file in the code
- **No** onboarding · empty state · loading spinner `#14`
- **No** screen-recording artefacts `#15`
- **No** black redaction rectangle — use demo data with visible names `#16`
- Crop at a **logical edge** (the end of a row, the edge of a card), never mid-card
- Interaction speed **1.6×** real time · a visible cursor · **a real state change**
- Every number in the narration must be **visible on screen** (if the text says "18 tabs", the tabs
  are there to count)

### Demo data `#17`

**Check it before any render.** Every person's name and every client name.
If it references someone else's intellectual property: **stop and ask.**

> The source production's answer was to fix it **in the database**. A later production could not —
> the demo organisation was live on production and visible to prospects. The alternative that
> worked: **swap the names at capture time on the DOM**, and fail the capture loudly if any risky
> token survives. Never write to production data to improve a shot.

---

## 6. Brand

- Colours **from the guide, as hex**. Never sample a colour from an image or a video `#01`
- **No visual element that is not in the guide** `#02`
- Logo rules **transcribed verbatim**. Before diagnosing a fault in an asset — read the guide `#03`
- **The logo is present in every summary or promise scene** after the turn `#23`
- **The shape must match the meaning of its caption** `#24`

| Meaning | The shape | Not the shape |
|---|---|---|
| Connected | a mesh — every node to every node | a linear chain |
| Sequential | an ordered chain | a mesh |
| Consolidated | elements converging into one | a tidy row |
| Distributed | one element splitting | a stack |

> **Before drawing any shape ask: what does this shape say on its own, without the caption?**

### Sources of truth `#05`

| Type | Source |
|---|---|
| Colours · fonts · logo · spacing | **the brand guide** |
| Numbers · section names · feature counts | **the product's code** |
| Claims and promises | **the user** |

Cover figures and old marketing material are **not a source**.

---

## 7. Multiple aspect ratios `#19`

**A re-layout, not a crop.** The same components in a different arrangement per ratio.

```
16x9 → two blocks side by side horizontally
9x16 → two blocks stacked
1x1  → text above at a smaller size, visual below
```

**No** `scale` or crop applied to the whole frame.
**The test:** centre-crop a 9:16 out of the 16:9 design — if any text disappears, the design failed.

> And rearranging blocks is not sufficient either. That was itself a logged correction: a 9:16 that
> merely stacks the 16:9 blocks reads as a compromise. Each ratio is designed, and coverage is
> measured against **that ratio's own** numbers.

---

## 8. The two variants `#09`

The same shots and the same timings — **only the text layer changes.**

| | Voiceover version | Silent version |
|---|---|---|
| On-screen text | **two to four words** — a visual anchor | **a connected sentence** carrying the story |
| Number of text moments | fewer | more |
| Music | −20 LUFS under the voice | +3 dB |

**The counter-intuitive rule:** the on-screen text in the voiceover version is **shorter** than what
is spoken. The viewer reading and listening at the same moment is a viewer doing neither.

`hasVoiceover: boolean` on the same composition — **not two projects.**

---

## 9. The CTA `#34`

| Item | Spec |
|---|---|
| Duration | **≥ 3.5 seconds of complete stillness** after the card completes |
| The link / action | **the highest contrast after the action button** |
| Action button | the guide's action colour · high-contrast text |
| Entrance | sequential slide · **no fade** |
| Music fade-out | **after** the card settles |
| 9:16 | the action button in the **middle third**, not the bottom |
| All of it | **above the 72% line**, including the link |

> A practical consequence found the hard way: 45 frames of number stillness plus 105 frames of CTA
> stillness plus entrances is exactly 180 frames. In a 6-second chapter there is no slack, so the
> CTA lockup enters as **one block with no stagger** — any stagger eats the stillness.

---

## 10. The manifest

The zone guard writes `layout.json` during the render:

```json
{
  "fps": 30,
  "duration_frames": 2010,
  "frame_size": [1920, 1080],
  "safe_zone": {"y_min": 130, "y_max": 778},
  "zones": {"A": [96,140,560,300], "B": [1560,140,1824,260]},
  "chapters": [{"id":"ch1","start":0,"end":210}],
  "elements": [
    {
      "id": "narration-1",
      "type": "text",
      "zone": "C",
      "bbox": [96, 340, 900, 520],
      "frames": [30, 130],
      "still_from": 46,
      "chapter": "ch1"
    }
  ],
  "motion_events": [
    {"id": "camera-pullback", "frames": [60,140], "magnitude": "large"}
  ]
}
```

| Field | What it checks |
|---|---|
| `bbox` + `zone` | inside the zone · no intersection with another bbox |
| `bbox` unioned per chapter | coverage ≥ 45% |
| `frames` + `still_from` | ≥ 1.5 seconds of stillness for every text |
| `motion_events` | no two overlapping `large` motions · no new text during motion |
| `chapters` | contiguous with no gaps · summing to the duration |

Optional flags the narrative checks read: `names_hero` · `sweep_item` · `texture` · `critical` ·
`claims_relation` + `relation` + `nodes` + `edges` · `text`.

**Without the manifest the verifier is blind.** The code that draws knows where everything is — make
it say so.

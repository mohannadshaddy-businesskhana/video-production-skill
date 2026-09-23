# Route — section series

> Many videos, one template, one voice. Each explains one area of a product to someone who already
> knows what the product is. Proven on an 18-video / 54-file run.

**Delegates to:** `/hyperframes` → `/general-video` for the composition work.
**This layer adds:** the six-chapter spine, the template-defect stop rules, the multi-aspect format
system, and the batch protocol.

## Why a series is a different problem

One video is a design task. Eighteen from one template is a **defect-multiplication** problem: any
flaw in the template ships eighteen times. Everything below exists to catch a template flaw at
video one instead of video eighteen.

## The six-chapter spine

| # | Chapter | Job |
|---|---|---|
| 1 | Situation | The hero and their category, **named before second 6** |
| 2 | Old way | The replaced tool + a cost counter running |
| 3 | Transition | The old thing closes → the brand |
| 4 | Solution | **The single claim**, same situation, counter stops |
| 5 | Sweep | Capability names **accumulating** — breadth, no depth |
| 6 | Number + CTA | The section's number, then the conversion card |

**The sweep comes after the solution, never before.** The single claim still carries the story; the
sweep is a reward, not an argument. No zoom, no interaction, no explanation inside it.

### Duration classes

Fix the skeleton per class and check it mechanically — drift is a real failure mode.

| Class | Frames | Skeleton (frame boundaries) |
|---|---|---|
| A | 1260 (42s) | `[0,210] [210,510] [510,600] [600,870] [870,1080] [1080,1260]` |
| B | 1080 (36s) | `[0,180] [180,420] [420,510] [510,720] [720,900] [900,1080]` |
| C | 960 (32s) | `[0,150] [150,360] [360,450] [450,630] [630,780] [780,960]` |

## Two numbers that decide the timing, and fought each other

Both are real constraints found the hard way:

- **Coverage is measured at the chapter midpoint.** Class A's midpoint is frame 105, class B's is
  90. An element that enters at 96 is live for A and absent for B — and the same template passed
  five videos then failed ten in a row. Place anything the frame depends on **before the earliest
  class midpoint**.
- **Chapter 6 has 180 frames for: a number that must be readable (≥45 frames of stillness) and a
  CTA that must hold (≥105 frames).** 45 + 105 + entrances = 180 exactly. There is no slack, so the
  CTA lockup enters as **one block with no stagger** — any stagger eats the stillness.

## Per-video data

Everything that varies lives in one table; the timeline never changes.

```js
{ id, cls, title, hero, role, trigger, triggerFrom, tool, counter: [end, stop],
  head, t1, t2, t4, t5, sweep: [...], sweepFlag: [i], number, numberBlock,
  uiScreen, bg: [...] }
```

## Real UI, real names

Screenshots come from the **real running product**, captured with Playwright. Names that must change
for the video are swapped **at capture time on the DOM** — never in the database.

```js
const KEEP = "\0ORG\0";                     // guard, or a short name eats the long one
const REPLACEMENTS = [
  ["Long Name - Demo", KEEP],               // reserve the longest first
  ["Long Name", "Replacement"],
  [KEEP, "Long Name - Demo"],               // restore
];
const RISKY = [...];                        // fail the capture if any survive
```

The capture must **fail loudly** when a risky token survives. Without that, a failed sweep is only
discovered by watching the video.

Also hide at capture time: time-tracker widgets, onboarding tooltips, toasts, half-loaded skeletons.

## Batch order

1. Phase 0 gates — see `references/unattended.md`
2. **Pilot: one video, one ratio.** Budget 8 fix cycles.
3. Batch the rest in that ratio. One failure does not stop it; **three consecutive failures on the
   same check do.**
4. Only when every video passes in ratio one: **a pilot per additional ratio**, then its batch.
   Coverage is measured per ratio — a number tuned for 16:9 says nothing about 9:16.
5. `batch_report.py` → one table.

## Ship-blocking checks specific to this route

Beyond the standard verifier: `chapter roles`, `class skeleton`, `sweep item count`,
`sweep accumulates`, `sweep stays shallow`, `hero named early`, `cta stillness`.

A `chapter roles` or `chapter continuity` failure is a **stop**, not a fix — the script's structure
is wrong, and that is the user's decision.

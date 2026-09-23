# Unattended runs

> When the user leaves production running and is not there.
> **The goal is not to finish everything. The goal is that they wake up to correct work or a clear
> report — not to eighteen wrong videos.**

---

## The governing principle

**A repeated mistake costs more than a single mistake.**

Eighteen videos from one template means any flaw in the template is multiplied eighteen times. So
the protection is not in checking after production — it is in the **pilot gate**: one video is built
completely and passes every check **before** any other video starts.

```
pilot passes  →  the rest run
pilot fails   →  stop. No second video.
```

---

## The phases

### Phase 0 — before any render

| # | Gate | If it fails |
|---|---|---|
| 1 | Seed data is clean and every required name exists | **stop** |
| 2 | `brand.json` and `structure.json` exist and are complete | **stop** |
| 3 | Every correction carried over from the previous run has been made in the shared components | **stop** |
| 4 | `verify.mjs` runs on an old render with no runtime errors | **stop** |
| 5 | `toolchain-traps.md` has been read and its traps avoided in the components | **stop** |

**Stop = write the reason in `run-log.md` and do not start.** An hour of waiting is cheaper than
eighteen wrong videos.

### Phase 1 — the pilot

Build **one video** (the first in the list) · one aspect ratio · silent.

```bash
node scripts/verify.mjs \
  --video pilot.mp4 --manifest pilot.json \
  --config brand.json --structure structure.json \
  --json reports/pilot.json
```

Then the **fix loop** (below). **Pilot budget: 8 fix cycles in total.**

| Outcome | Action |
|---|---|
| Passed | continue to Phase 2 |
| **Exceeded 8 cycles** | **stop.** The template is wrong — not the video |
| Failed a check on the stop list | **stop** |

> ⚠️ **Exceeding the pilot budget is the most important signal in this protocol.** If one video
> needs nine fixes, the structure has a fault, and producing seventeen more will multiply it.
> **Stop and write the report.**

### Phase 2 — the batch

For every remaining video, in order:

1. Build it · one aspect ratio · silent
2. Run `verify.mjs --json reports/NN.json`
3. Fix loop · **budget 4 cycles per video**
4. Passed → `DONE` · failed → **`FAILED`, and continue to the next video**

> **One failing video does not stop the batch.** The pilot stops it; individuals do not.
> **The exception:** if **three videos in a row** fail on **the same check** → stop. That is a
> template defect discovered late.

### Phase 3 — the remaining aspect ratios

**Only after every video passes in the first ratio.**
Run the checks again for each ratio — **coverage is measured against each ratio's own numbers**
(`#40`). Give each ratio its own pilot; a geometry fault found in ratio one costs one fix, found
after three batches it costs three.

### Phase 4 — the report

Write `run-log.md` and close. **Present no video** — the user decides.

---

## The fix loop

```
run verify → read reports/NN.json
   ├─ passed: true  → done
   └─ passed: false → for each failing check:
        ├─ in the fix table?  → apply it · cycle+1 · repeat
        ├─ on the stop list?  → stop
        └─ failed 3 times?    → mark FAILED · continue
```

**One cycle = one fix attempt + render + check**, even if that cycle fixed several checks.

## The fix table

| Failing check | Fix | Automatic? |
|---|---|---|
| `loudness` | re-run `loudnorm` at the target with a limiter | ✅ |
| `duration` | correct the frame count in the composition | ✅ |
| `safe zone` | move the element inside the safe band | ✅ |
| `zone containment` | move or shrink the element inside its zone | ✅ |
| `no overlap` | move the less important element to an empty neighbouring zone | ✅ |
| `content coverage` | **redistribute, do not enlarge**: text one side, visual the other, both extended | ✅ |
| `reading dwell` | add stillness — borrow frames from the next chapter, not from the video's duration | ✅ |
| `single large motion` | move the second motion to after the first finishes | ✅ |
| `text reads in stillness` | delay the text until the motion ends · **do not enlarge the text** | ✅ |
| `sweep item count` | add items from the sweep list in the script | ✅ |
| `sweep accumulates` | set every item's `frames[1]` to the chapter end | ✅ |
| `sweep stays shallow` | remove the zoom or interaction from the sweep chapter | ✅ |
| `relation shapes drawn` | draw the lines · a mesh of n nodes needs n(n−1)/2 edges | ✅ |
| `single language` | translate · the exception is brand names in `brand_names` | ✅ |
| `cta stillness` | add CTA stillness · borrow from the sweep chapter | ✅ |
| `hero named early` | bring the identity block forward | ✅ |
| `class skeleton` | return the chapter boundaries to the class skeleton | ✅ |
| `beat continuity` | the track runs continuously · gain automation only · a 12 kHz low-passed hit | ⚠️ two attempts |
| `palette` | > 6%: find the foreign colour and remove it · 2–6%: usually antialiasing → **mark a warning and continue** | ⚠️ |
| `file integrity` | re-render once | ⚠️ one attempt |
| `chapter roles` | — | ❌ **stop** |
| `chapter continuity` | — | ❌ **stop** |

---

## The stop list — no improvising

Stop and write the report; **do not attempt a fix**:

| # | Situation | Why |
|---|---|---|
| 1 | **Pilot budget exceeded (8 cycles)** | the template is wrong, not the video |
| 2 | `chapter roles` or `chapter continuity` failed | a structural fault in the script |
| 3 | **Three videos in a row failed the same check** | a template defect |
| 4 | `file integrity` failed twice | an environment problem, not a content one |
| 5 | `palette` above 6% after two attempts | a colour outside the brand — a brand decision |
| 6 | `beat continuity` with a level dropout after two attempts | a problem in the audio source |
| 7 | The fix requires **changing the script's words** | the copy is the user's decision |
| 8 | The fix requires **changing the claim or the situation** | a positioning decision — see `narrative.md` § 6 |
| 9 | Demo data contains a name whose IP ownership is doubtful | legal `#17` |
| 10 | A failing check **not in the fix table** | unknown — do not guess |
| 11 | **The render is black, or its duration is zero** | a structural trap — `toolchain-traps.md` T1 |
| 12 | **A checker reports an impossible number** (100% coverage, say) | the checker is broken, not the video — fix the checker first and do not count it as a cycle |
| 13 | `spawn EPERM` after PATH is already fixed | environment or path, not content — `toolchain-traps.md` § 4 |

> **The principle:** if the fix changes the **meaning** of something rather than its execution —
> stop. Ordering an element is execution. Rewording a sentence is meaning.

---

## The run log

Write `run-log.md` **as you go**, not at the end — if the run is interrupted, what was written
survives.

```markdown
# Run log — [date] [start time]

## Summary
Done: N/18 · Failed: N · Not started: N · Status: [complete | stopped]

## Pilot
Video: 01 · fix cycles: 3/8 · result: passed
| Cycle | Failing check | Fix applied |
|---|---|---|
| 1 | content coverage | redistributed the text block and the visual to opposite sides |

## Batch
| # | Video | Status | Cycles | Notes |
|---|---|---|---|---|
| 01 | Client portal | ✅ DONE | 3 | — |
| 02 | Content | ❌ FAILED | 4 | sweep accumulates still failing |

## ⛔ Reason for stopping (if any)
Case: [number from the stop list]
Detail: …
**Needed from the user:** …

## ⚠️ Warnings that did not block delivery
- 05: palette 3.1% at 14.2s — probably antialiasing, look at it yourself

## ❓ Decisions the user has to make
1. …
```

---

## What automated checking does not see

**Tell the user this explicitly in the report.** The checks cover craft only:

- Does the story land?
- Does the sweep feel like a sweep, or like a list?
- Is the claim right for this market?
- Does the language sound spoken, or translated?
- Does the shape say what its caption says? *(the check counts edges; it does not judge meaning)*

**A video that passed every check can still be a weak video.** Checking prevents failure. It does
not create success.

---

## The morning summary

```bash
node scripts/batch_report.mjs --reports reports/ --out run-log-summary.md
```

Reads every `reports/*.json` and produces one table: what passed, what failed and on what, and which
check failed most often — that last figure is the strongest indicator of whether the problem is in
the template.

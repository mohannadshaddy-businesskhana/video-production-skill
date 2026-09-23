# Verification

## Running it

```bash
python scripts/verify.py \
  --video out.mp4 \
  --manifest layout.json \
  --config brand.json
```

`brand.json`:

```json
{ "colors": ["#0A0A0A", "#E63946", "#F4C430", "#1D4ED8", "#F2EEE3", "#FFFFFF"],
  "lufs": -14 }
```

**Exit 0 = show it to the user. Exit 1 = fix and re-run.**
No render is shown to anyone before the verifier passes. That is not a suggestion.

Requires `ffmpeg` and `ffprobe`, and nothing else — the Python is **standard library only**. The
two checks that once needed numpy and Pillow (palette distance, beat continuity) are computed here
directly: same tolerances, same numbers, verified against the numpy implementation on a real render
and against a deliberately off-palette one. `--skip-palette` still exists, for speed, not for
missing packages.

Run `node scripts/doctor.mjs` to see what the machine has.

---

## The checks

| Check | Catches | Ref |
|---|---|---|
| `file integrity` | a truncated or corrupt file | #35 |
| `duration` | duration ≠ the manifest | — |
| `loudness` | outside the target ±1 LUFS | #25 |
| `beat continuity` | the track stopped and came back off the grid | #27 |
| `palette` | a sixth colour | #01 #02 |
| `chapter continuity` | a gap between two chapters | — |
| `safe zone` | an element outside 12%–72% of frame height | #18 |
| `zone containment` | an element outside its own zone | #20 |
| `no overlap` | two elements intersecting at the same time | #20 |
| `content coverage` | under 45% coverage in any chapter | #21 |
| `reading dwell` | text that holds still for under 1.5s | #31 |
| `single large motion` | two large moves at once | #28 |
| `text reads in stillness` | new text arriving during motion | #29 |

Narrative routes add: `chapter roles` · `class skeleton` · `hero named early` · `sweep item count` ·
`sweep accumulates` · `sweep stays shallow` · `relation shapes drawn` · `single language` ·
`cta stillness`.

---

## Reading a failure

### `beat continuity`

```
FAIL   55 or 110 BPM, phase drift 0.22 beat (TRANSPORT STOPPED)
```

The track stopped and restarted off the rhythmic grid.
**Fix: the track runs from frame 0 to the last frame without stopping — gain automation only.**
Not a deeper duck, not a shorter one. The track **does not stop**.

The BPM is reported as two possibilities because autocorrelation confuses a pulse with its half.
That does not affect the drift measurement.

> ⚠️ **`silencedetect` passes straight over this fault.** Do not rely on it.

### `palette`

```
FAIL   worst 3.0% off-palette at 49.1s (limit 2%)
```

**2–4% on a text-heavy frame is usually antialiasing, not a sixth colour.** Open the timestamp it
names and look before you fix anything. A soft shadow's penumbra does the same thing.

**Above 6% is a genuinely foreign colour** — usually something from an external library, a shadow,
or a gradient.

Interface regions are masked automatically from elements whose `type` is `ui` / `image` / `video` —
the product is allowed its own colours. **Make sure interface elements are tagged correctly in the
manifest**, or you will get false positives. A sweep background of real screenshots that is not
registered will read as off-palette.

### `content coverage`

```
FAIL   worst 20% in ch2 (floor 45%) — redistribute, do not enlarge
```

**The fix is distribution, not enlargement.** The usual fault is two elements piled in the centre.
Put the headline on one side and the visual on the other, both extended.

Note *where* it is measured: **the chapter midpoint**. An element that arrives after the midpoint
does not count, which is how the same template can pass one duration class and fail another.

### `zone containment` and `no overlap`

If these fail, the zone guard is **not doing its job**. It should refuse to draw before the render,
not be caught after it. Check that every component renders through it.

A chapter that overrides a zone's box **is** the zone for its children — declare it with `zoneEl`
so the manifest measures the container that was actually given.

### `text reads in stillness`

```
FAIL   competing motion: narration-2↔typing-cursor
```

Motion beats position and size. **The fix is not bigger text — it is temporal separation.**
The text settles in a still frame for ≥1.5s, and only then does the motion start.

---

## Manual checks — what the verifier cannot see

After it passes, look yourself:

| Item | How |
|---|---|
| **Navigation item count** | pull an interface frame and count — it must match the product's own code `#13` |
| **Onboarding bar** | check every interface capture `#14` |
| **Screen-recording artefacts** | the same captures `#15` |
| **Third-party IP in the data** | every person and client name `#17` |
| **The shape matches its caption** | ask "what does this shape say on its own?" `#24` |
| **A 9:16 cropped from 16:9** | if any text vanished, the design failed `#19` |
| **The counter curve** | pull the five checkpoint frames and read them `#32` |

```bash
# specific frames
for f in 303 381 459 537; do
  ffmpeg -v error -i out.mp4 -vf "select=eq(n\,$f)" -frames:v 1 f_$f.png
done

# a quick contact sheet for a visual pass
ffmpeg -v error -i out.mp4 -vf "fps=1/2.5,scale=610:-1,tile=6x4" -frames:v 1 sheet.jpg
```

---

## What only the user can check

The verifier and the manual pass cover craft. **These need the user:**

1. Is the claim right for this market?
2. Are these the words the customer uses?
3. Is this friction real here?
4. Is this feature actually a differentiator?
5. Is the category vocabulary right?

**Show the video with the verifier output and ask about exactly these five.** The verifier's job is
to clear the noise so the user can see them.

---

## Adding a new check

Every time the user corrects something:

1. Add the mistake to `failure-log.md` **with its cost**
2. Ask: **is it measurable?**
   - **Yes** → add a check to `verify.py` and a line to `production-rules.md`
   - **No** → add a rule to `narrative.md`
3. If the rule concerns where or when an element is, it **probably needs a new manifest field**,
   not a pixel check

> Four rules in the source production were written as prose and violated in the very next render.
> **If a rule is measurable and is not written as code, it will be violated.**

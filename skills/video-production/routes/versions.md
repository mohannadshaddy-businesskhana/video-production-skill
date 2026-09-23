# Route — versions, cutdowns and aspect variants

**Delegates to:** `/hyperframes-cli` for rendering each variant.
**This layer adds:** the format contract, the cutdown tool, and per-ratio verification.

## The rule

**A second aspect ratio is a re-layout, not a crop.** Cropping drops half the design out of frame.
Re-arranging blocks is not enough either — that was a logged failure. Each ratio gets its own
geometry table and is verified against its own safe band.

| Ratio | Frame | Safe band | Why |
|---|---|---|---|
| 16:9 | 1920×1080 | 130 → 778 | 12%–72% |
| 9:16 | 1080×1920 | 230 → 1690 | clears Reels/Shorts chrome, top and bottom |
| 1:1 | 1080×1080 | 130 → 950 | 12%–88% |

Read `references/formats.md` for the generator contract. Decide the ratio set **at brief time** —
retro-fitting costs more than building both.

## Cutdowns

```bash
node <SKILL_DIR>/scripts/cutdown.mjs --master master.mp4 --marks marks.json --out out/
```

`marks.json` names the segments a cutdown may keep, so a 30s cut is a **story decision recorded
once**, not a blind trim:

```json
{ "fps": 30,
  "durations": [30, 15, 6],
  "segments": [
    {"id": "hook",  "in": 0,    "out": 90,   "keepIn": [30, 15, 6]},
    {"id": "claim", "in": 600,  "out": 870,  "keepIn": [30, 15]},
    {"id": "cta",   "in": 1080, "out": 1260, "keepIn": [30, 15, 6]}
  ] }
```

Every cutdown re-runs `delivery_qc.mjs` — a trim changes duration, and duration is a spec.

## Order

Never generate all ratios before the first is approved. One ratio, approved, then the rest.

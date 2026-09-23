# Route — audit an existing video

Use when a video already exists and something is wrong, or before accepting someone else's render.

## If a manifest exists

```bash
python <SKILL_DIR>/scripts/verify.py --video in.mp4 --manifest layout.json --config brand.json
```

## If it does not

The file alone still answers a lot:

```bash
python <SKILL_DIR>/scripts/delivery_qc.py --video in.mp4 --spec <platform> --json qc.json
```

That covers integrity, duration, resolution, frame rate, loudness, true peak, silence and bitrate.
What it cannot judge without a manifest: safe zone, zone containment, overlap, coverage, reading
dwell, and every narrative check.

## Then look with your eyes

Pull still frames at chapter midpoints and read them. `scripts/shot.mjs` does this from a
composition; `ffmpeg -ss` does it from a file. These are the checks no tool catches:

- Does the story land, or is it a list of features?
- Is the claim right for this market?
- Does the language sound spoken, or translated?
- Does the shape say what the caption says? *(the verifier counts edges; it does not judge meaning)*
- Is any text on screen too small to read on a phone?

## The findings that shipped past every automated check

From two real productions — worth looking for specifically:

- A shape captioned "everything is connected", drawn with **zero connecting lines**
- A chat bubble carrying **delivery ticks on an incoming message** — every messaging-app user sees it
- A monochrome outline icon where a recognisable product logo belonged
- Text that was legible but gone in 1.2 seconds
- A logo that was not small but **crushed** — 320 wide by 32 tall, squeezed by a flex parent

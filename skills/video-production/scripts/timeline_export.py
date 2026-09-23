#!/usr/bin/env python3
"""Export the chapter structure as an edit timeline a human post house can open.

    python timeline_export.py --manifest layout.json --media master.mp4 --edl cut.edl
    python timeline_export.py --manifest layout.json --media master.mp4 --otio cut.otio

Two formats, on purpose:

  EDL (CMX3600)  — ancient, ugly, and opened by everything. Use it when you do
                   not know what the other side runs.
  OTIO           — the modern interchange format. Richer, and readable by the
                   OpenTimelineIO adapters that most current tools ship.

Neither carries effects, grades or graphics. An EDL is a list of cuts against a
source, and handing one over means "here is the structure, the look is in the
reference MP4 next to it".
"""
import argparse
import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def tc(frame, fps):
    """SMPTE non-drop timecode. Only correct for integer rates."""
    f = int(round(frame))
    r = int(round(fps))
    h, rem = divmod(f, r * 3600)
    m, rem = divmod(rem, r * 60)
    s, fr = divmod(rem, r)
    return f"{h:02d}:{m:02d}:{s:02d}:{fr:02d}"


def load_events(manifest):
    m = json.loads(Path(manifest).read_text(encoding="utf-8"))
    fps = m.get("fps", 30)
    chapters = sorted(m.get("chapters", []), key=lambda c: c["start"])
    if not chapters:
        total = m.get("duration_frames")
        if not total:
            raise SystemExit("manifest has neither chapters nor duration_frames")
        chapters = [{"id": "whole", "start": 0, "end": total}]
    return fps, chapters


def write_edl(path, title, fps, chapters, reel):
    lines = [f"TITLE: {title}", "FCM: NON-DROP FRAME", ""]
    rec = 0
    for i, c in enumerate(chapters, 1):
        dur = c["end"] - c["start"]
        lines.append(
            f"{i:03d}  {reel:<8} V     C        "
            f"{tc(c['start'], fps)} {tc(c['end'], fps)} "
            f"{tc(rec, fps)} {tc(rec + dur, fps)}")
        name = c.get("role") or c.get("id")
        if name:
            lines.append(f"* FROM CLIP NAME: {name}")
        lines.append("")
        rec += dur
    Path(path).write_text("\n".join(lines), encoding="utf-8")
    return rec


def write_otio(path, title, fps, chapters, media):
    def rt(v):
        return {"OTIO_SCHEMA": "RationalTime.1", "rate": float(fps), "value": float(v)}

    def rng(start, dur):
        return {"OTIO_SCHEMA": "TimeRange.1", "start_time": rt(start), "duration": rt(dur)}

    clips = []
    for c in chapters:
        dur = c["end"] - c["start"]
        clips.append({
            "OTIO_SCHEMA": "Clip.1",
            "name": c.get("role") or c.get("id") or "clip",
            "source_range": rng(c["start"], dur),
            "media_reference": {
                "OTIO_SCHEMA": "ExternalReference.1",
                "target_url": str(media),
                "available_range": rng(0, chapters[-1]["end"]),
            },
        })

    doc = {
        "OTIO_SCHEMA": "Timeline.1",
        "name": title,
        "global_start_time": rt(0),
        "tracks": {
            "OTIO_SCHEMA": "Stack.1",
            "name": "tracks",
            "children": [{
                "OTIO_SCHEMA": "Track.1",
                "name": "V1",
                "kind": "Video",
                "children": clips,
            }],
        },
    }
    Path(path).write_text(json.dumps(doc, indent=2), encoding="utf-8")
    return sum(c["end"] - c["start"] for c in chapters)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--media", required=True, help="the source file the timeline references")
    ap.add_argument("--title", default="TIMELINE")
    ap.add_argument("--reel", default="AX", help="EDL reel name, 8 characters or fewer")
    ap.add_argument("--edl")
    ap.add_argument("--otio")
    a = ap.parse_args()

    if not a.edl and not a.otio:
        ap.error("pass --edl and/or --otio")

    fps, chapters = load_events(a.manifest)
    if abs(fps - round(fps)) > 1e-6:
        print(f"note: {fps} fps is not an integer rate — non-drop timecode will drift. "
              "Confirm the rate with the post house before delivering.", file=sys.stderr)

    if a.edl:
        n = write_edl(a.edl, a.title, fps, chapters, a.reel[:8])
        print(f"wrote {a.edl}  ({len(chapters)} events, {n} frames)")
    if a.otio:
        n = write_otio(a.otio, a.title, fps, chapters, a.media)
        print(f"wrote {a.otio}  ({len(chapters)} clips, {n} frames)")

    print("\nNeither format carries effects, grades or graphics. Send the reference "
          "MP4 alongside it, and say which one it is.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

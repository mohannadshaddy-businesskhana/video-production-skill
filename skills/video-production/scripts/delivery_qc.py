#!/usr/bin/env python3
"""Check a finished file against a platform delivery spec.

    python delivery_qc.py --video out.mp4 --spec youtube-16x9 [--json qc.json]
    python delivery_qc.py --video out.mp4 --spec-file custom.json
    python delivery_qc.py --list

Answers the question `hyperframes check` cannot: the composition is valid, but is
the FILE acceptable where it is going? Container, codec, resolution, frame rate,
duration bounds, loudness, true peak, silence, bitrate.

Specs live in assets/delivery-specs.json. They are derived from published
platform guidance where it exists; the ones marked "unverified" there are
community consensus and should be confirmed before a contractual delivery.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

SPECS = Path(__file__).resolve().parent.parent / "assets" / "delivery-specs.json"


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                          errors="replace")


def probe(video):
    r = run(["ffprobe", "-v", "error", "-show_format", "-show_streams",
             "-of", "json", video])
    if r.returncode != 0:
        raise SystemExit("ffprobe failed: " + (r.stderr or "").strip())
    return json.loads(r.stdout)


def loudness(video):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", video,
             "-af", "ebur128=peak=true", "-f", "null", "-"])
    out, got = r.stderr or "", {}
    tail = out[out.rfind("Summary:"):] if "Summary:" in out else out
    for line in tail.splitlines():
        s = line.strip()
        if s.startswith("I:") and "LUFS" in s:
            got["lufs"] = float(s.split()[1])
        elif s.startswith("Peak:") and "dBFS" in s:
            got["true_peak"] = float(s.split()[1])
        elif s.startswith("LRA:") and "LU" in s and "lra" not in got:
            got["lra"] = float(s.split()[1])
    return got


def silence(video, floor=-50, dur=0.25):
    r = run(["ffmpeg", "-v", "error", "-i", video,
             "-af", f"silencedetect=n={floor}dB:d={dur}", "-f", "null", "-"])
    return [l.strip() for l in (r.stderr or "").splitlines() if "silence_start" in l]


def integrity(video):
    r = run(["ffmpeg", "-v", "error", "-i", video, "-f", "null", "-"])
    return (r.stderr or "").strip()


class Report:
    def __init__(self):
        self.rows = []

    def add(self, name, ok, detail, warn=False):
        self.rows.append((name, ok, detail, warn))

    def render(self):
        w = max(len(n) for n, *_ in self.rows) + 2
        print("=" * 78)
        print("DELIVERY QC".ljust(w) + "RESULT   DETAIL")
        print("=" * 78)
        bad = 0
        for name, ok, detail, warn in self.rows:
            tag = " ok  " if ok else ("warn " if warn else "FAIL ")
            if not ok and not warn:
                bad += 1
            print(f"{name.ljust(w)}{tag}   {detail}")
        print("=" * 78)
        print("PASSED" if bad == 0 else f"{bad} CHECK(S) FAILED")
        return bad


def near(a, b, tol):
    return abs(a - b) <= tol


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video")
    ap.add_argument("--spec", help="a key from assets/delivery-specs.json")
    ap.add_argument("--spec-file", help="a JSON file holding one spec object")
    ap.add_argument("--json", help="write the result here")
    ap.add_argument("--list", action="store_true", help="list built-in specs")
    a = ap.parse_args()

    catalog = json.loads(SPECS.read_text(encoding="utf-8"))

    if a.list:
        for k, v in catalog.items():
            if k.startswith("_"):
                continue
            print(f"{k:<22} {v.get('label', '')}")
        return 0

    if not a.video:
        ap.error("--video is required")
    if a.spec_file:
        spec = json.loads(Path(a.spec_file).read_text(encoding="utf-8"))
    elif a.spec:
        if a.spec not in catalog:
            ap.error(f"unknown spec '{a.spec}' — try --list")
        spec = catalog[a.spec]
    else:
        ap.error("pass --spec or --spec-file")

    info = probe(a.video)
    fmt = info.get("format", {})
    vs = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    as_ = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)

    rep = Report()

    err = integrity(a.video)
    rep.add("file integrity", not err, "clean" if not err else err[:70])

    if vs is None:
        rep.add("video stream", False, "none found")
        return rep.render()

    w, h = int(vs["width"]), int(vs["height"])
    want = spec.get("resolution")
    if want:
        ok = [w, h] == want
        rep.add("resolution", ok, f"{w}x{h}" + ("" if ok else f" (want {want[0]}x{want[1]})"))

    ar = spec.get("aspect")
    if ar:
        got = round(w / h, 3)
        ok = near(got, ar, 0.01)
        rep.add("aspect ratio", ok, f"{got}" + ("" if ok else f" (want {ar})"))

    num, den = (vs.get("r_frame_rate") or "0/1").split("/")
    fps = float(num) / float(den or 1)
    if spec.get("fps"):
        ok = any(near(fps, f, 0.05) for f in spec["fps"])
        rep.add("frame rate", ok, f"{fps:.2f}" + ("" if ok else f" (want {spec['fps']})"))

    dur = float(fmt.get("duration", 0))
    lo, hi = spec.get("duration_s", [None, None])
    if lo is not None or hi is not None:
        ok = (lo is None or dur >= lo - 0.05) and (hi is None or dur <= hi + 0.05)
        rep.add("duration", ok, f"{dur:.2f}s (allowed {lo}-{hi})")

    if spec.get("video_codec"):
        ok = vs["codec_name"] in spec["video_codec"]
        rep.add("video codec", ok, vs["codec_name"] + ("" if ok else f" (want {spec['video_codec']})"))

    bitrate = int(fmt.get("bit_rate", 0)) / 1_000_000 if fmt.get("bit_rate") else None
    if spec.get("max_bitrate_mbps") and bitrate:
        ok = bitrate <= spec["max_bitrate_mbps"]
        rep.add("bitrate", ok, f"{bitrate:.1f} Mbps (max {spec['max_bitrate_mbps']})")

    size_mb = int(fmt.get("size", 0)) / 1_048_576
    if spec.get("max_size_mb"):
        ok = size_mb <= spec["max_size_mb"]
        rep.add("file size", ok, f"{size_mb:.1f} MB (max {spec['max_size_mb']})")

    if as_ is None:
        rep.add("audio stream", spec.get("audio_required", True) is False,
                "none — silent deliverable" if spec.get("audio_required") is False else "missing")
    else:
        if spec.get("audio_codec"):
            ok = as_["codec_name"] in spec["audio_codec"]
            rep.add("audio codec", ok, as_["codec_name"])
        if spec.get("sample_rate"):
            ok = int(as_.get("sample_rate", 0)) in spec["sample_rate"]
            rep.add("sample rate", ok, f"{as_.get('sample_rate')} Hz")

        ln = loudness(a.video)
        if spec.get("lufs") is not None and "lufs" in ln:
            tol = spec.get("lufs_tolerance", 1.0)
            ok = near(ln["lufs"], spec["lufs"], tol)
            rep.add("loudness", ok, f"{ln['lufs']} LUFS (target {spec['lufs']} ±{tol})")
        if spec.get("true_peak") is not None and "true_peak" in ln:
            ok = ln["true_peak"] <= spec["true_peak"] + 0.05
            rep.add("true peak", ok, f"{ln['true_peak']} dBFS (ceiling {spec['true_peak']})")

        if spec.get("no_silence", True):
            sil = silence(a.video)
            rep.add("no dropout", not sil, "continuous" if not sil else f"{len(sil)} gap(s)")

    if spec.get("notes"):
        rep.add("spec notes", True, spec["notes"], warn=True)

    bad = rep.render()

    if a.json:
        Path(a.json).write_text(json.dumps({
            "video": a.video,
            "spec": a.spec or a.spec_file,
            "passed": bad == 0,
            "checks": [{"name": n, "ok": o, "detail": d, "warn": w}
                       for n, o, d, w in rep.rows],
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

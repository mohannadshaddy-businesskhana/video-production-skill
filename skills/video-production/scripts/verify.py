#!/usr/bin/env python3
"""
verify.py — automated gate for brand video renders.

Reads a rendered video plus the layout manifest emitted by ZoneGuard and
fails the build on any violation. No render should be shown to the user
until this exits 0.

    python verify.py --video out.mp4 --manifest layout.json --config brand.json

Requires: ffmpeg/ffprobe on PATH, numpy, pillow.

Every check maps to a numbered entry in references/failure-log.md.
"""

import sys
# Windows consoles default to cp1252; the report carries Arabic and arrows.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass
import argparse
import json
import subprocess
import sys
import tempfile
from itertools import combinations
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError:
    sys.exit("needs numpy and pillow:  pip install numpy pillow")


# ── plumbing ──────────────────────────────────────────────────────────────

class Report:
    def __init__(self):
        self.rows = []

    def add(self, name, ok, detail, ref="", warn=False):
        self.rows.append((name, ok, detail, ref, warn))

    @property
    def failed(self):
        return [r for r in self.rows if not r[1] and not r[4]]

    def render(self):
        w = max(len(r[0]) for r in self.rows) + 2
        print("\n" + "=" * 78)
        print("VERIFY".ljust(w) + "RESULT   DETAIL")
        print("=" * 78)
        for name, ok, detail, ref, warn in self.rows:
            tag = "  ok  " if ok else (" warn " if warn else " FAIL ")
            print(f"{name.ljust(w)}{tag}  {detail}" + (f"   [{ref}]" if ref else ""))
        print("=" * 78)
        n = len(self.failed)
        print(f"{'PASSED' if n == 0 else f'{n} CHECK(S) FAILED'}\n")
        return 0 if n == 0 else 1


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def ffprobe_duration(video):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", video])
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


# ── file / container ──────────────────────────────────────────────────────

def check_integrity(video, rep):
    """#35 — a truncated file was once handed over for review."""
    r = run(["ffmpeg", "-v", "error", "-i", video, "-f", "null", "-"])
    err = r.stderr.strip()
    rep.add("file integrity", err == "",
            "clean" if err == "" else err.splitlines()[0][:60], "#35")


def check_duration(video, manifest, rep):
    dur = ffprobe_duration(video)
    if dur is None:
        rep.add("duration", False, "unreadable")
        return
    expected = manifest["duration_frames"] / manifest["fps"]
    ok = abs(dur - expected) < 0.1
    rep.add("duration", ok, f"{dur:.2f}s (expected {expected:.2f}s)")


# ── audio ─────────────────────────────────────────────────────────────────

def check_loudness(video, target, rep):
    """#25 — a render once shipped 11 dB under platform normalisation."""
    r = run(["ffmpeg", "-i", video, "-af", "ebur128", "-f", "null", "-"])
    val = None
    for line in r.stderr.splitlines():
        if "I:" in line and "LUFS" in line:
            try:
                val = float(line.split("I:")[1].split("LUFS")[0].strip())
            except (ValueError, IndexError):
                pass
    if val is None:
        rep.add("loudness", False, "could not measure", "#25")
        return
    ok = abs(val - target) <= 1.0
    rep.add("loudness", ok, f"{val:.1f} LUFS (target {target})", "#25")


def load_audio(video, sr=22050):
    with tempfile.NamedTemporaryFile(suffix=".raw", delete=False) as f:
        path = f.name
    run(["ffmpeg", "-y", "-v", "error", "-i", video,
         "-ac", "1", "-ar", str(sr), "-f", "f32le", path])
    data = np.fromfile(path, dtype=np.float32)
    Path(path).unlink(missing_ok=True)
    return data, sr


def check_beat_continuity(video, rep):
    """
    #27 — the hardest bug in the source production.

    The music transport stopped for 0.32 s and restarted 0.59 of a beat off
    the grid. silencedetect passed; the ear still heard a fault.

    A transport stop shows as ONE isolated phase jump against an otherwise
    stable grid. Most library tracks drift a little throughout — that is
    inaudible and must not fail the build. So we look for an isolated jump,
    not for global drift, and we cross-check with a level dropout.
    """
    x, sr = load_audio(video)
    if x.size < sr * 8:
        rep.add("beat continuity", True, "track too short to test", "#27", warn=True)
        return

    hop = 256
    n = (len(x) - hop) // hop
    env = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    flux = np.diff(env)
    flux[flux < 0] = 0
    if flux.std() < 1e-9:
        rep.add("beat continuity", True, "no rhythmic content", "#27", warn=True)
        return
    flux -= flux.mean()
    fps_env = sr / hop

    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lo, hi = int(fps_env * 0.28), int(fps_env * 1.2)
    if hi >= len(ac):
        rep.add("beat continuity", True, "track too short", "#27", warn=True)
        return
    period = lo + int(np.argmax(ac[lo:hi]))
    bpm = 60 * fps_env / period

    def phase(seg, offset):
        idx = np.arange(len(seg)) + offset
        best, best_val = 0.0, -1e18
        for p in np.linspace(0, 1, 64, endpoint=False):
            v = float(np.dot(seg, np.cos(2 * np.pi * ((idx / period) - p))))
            if v > best_val:
                best_val, best = v, p
        return best

    win, step = int(fps_env * 5), int(fps_env * 2.5)
    phases, times = [], []
    for s in range(0, len(flux) - win, step):
        phases.append(phase(flux[s:s + win], s))
        times.append(s / fps_env)
    if len(phases) < 4:
        rep.add("beat continuity", True, "track too short", "#27", warn=True)
        return

    deltas = []
    for i in range(1, len(phases)):
        d = abs(phases[i] - phases[i - 1])
        deltas.append(min(d, 1 - d))
    deltas = np.array(deltas)
    baseline = float(np.median(deltas))
    worst_i = int(np.argmax(deltas))
    worst = float(deltas[worst_i])

    # a transport stop = one big jump against an otherwise stable grid
    isolated_jump = worst > 0.25 and baseline < 0.12

    # cross-check: a level dropout in the middle of the track
    mid = env[int(len(env) * 0.05):int(len(env) * 0.95)]
    thresh = float(np.median(mid)) * 0.25
    longest, cur = 0, 0
    for v in mid:
        cur = cur + 1 if v < thresh else 0
        longest = max(longest, cur)
    dropout_s = longest / fps_env
    has_dropout = dropout_s > 0.15

    # A level dropout is the measurable defect. A phase jump on its own is
    # ambiguous — a library track that changes section shifts the detected
    # phase without any fault. So: fail on the dropout, warn on the jump.
    ok = not has_dropout
    if has_dropout:
        detail = (f"{bpm:.0f} or {bpm * 2:.0f} BPM — level dropout {dropout_s:.2f}s"
                  + (f" + phase jump {worst:.2f} beat at {times[worst_i + 1]:.1f}s"
                     if isolated_jump else "")
                  + " — automate gain, do not stop the transport")
        rep.add("beat continuity", False, detail, "#27")
    elif isolated_jump:
        rep.add("beat continuity", True,
                f"{bpm:.0f} or {bpm * 2:.0f} BPM, no dropout — but phase shifts "
                f"{worst:.2f} beat at {times[worst_i + 1]:.1f}s; listen there "
                f"(usually a section change in the track, not a fault)",
                "#27", warn=True)
    else:
        rep.add("beat continuity", True,
                f"{bpm:.0f} or {bpm * 2:.0f} BPM, continuous "
                f"(drift {baseline:.2f}/window, no dropout)", "#27")


# ── palette ───────────────────────────────────────────────────────────────

def hex_to_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def check_palette(video, colors, manifest, rep, samples=12, tol=26.0):
    """
    #01 #02 — a sixth colour means a value was guessed, not read.

    Regions occupied by product UI are masked out: the product legitimately
    uses more colours than the marketing palette. Only the video's own
    chrome is held to the five.
    """
    if not colors:
        rep.add("palette", True, "no colours configured", "#01", warn=True)
        return
    base = np.array([hex_to_rgb(c) for c in colors])
    # include pairwise blends so antialiasing and opacity overlays pass
    # Sample the ramp between every pair densely. Three stops left gaps wide
    # enough that ordinary antialiased text edges — ink on ivory, ink on
    # yellow — read as foreign colours and failed a clean render at 3.4%.
    # A genuinely sixth colour is still nowhere near any of these ramps.
    allowed = [base]
    for a, b in combinations(range(len(base)), 2):
        for k in range(1, 20):
            t = k / 20
            allowed.append((base[a] * (1 - t) + base[b] * t)[None, :])
    allowed = np.vstack(allowed)

    fps = manifest["fps"]
    fw, fh = manifest["frame_size"]
    ui = [e for e in manifest["elements"] if e["type"] in ("ui", "image", "video")]
    dur = manifest["duration_frames"] / fps
    worst, worst_t, skipped = 0.0, 0.0, 0

    with tempfile.TemporaryDirectory() as td:
        for i in range(samples):
            t = dur * (i + 0.5) / samples
            frame_no = int(t * fps)
            out = Path(td) / f"{i}.png"
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", video,
                 "-frames:v", "1", "-vf", "scale=240:-1", str(out)])
            if not out.exists():
                continue
            img = np.asarray(Image.open(out).convert("RGB"), dtype=float)
            h, w = img.shape[:2]
            mask = np.ones((h, w), dtype=bool)
            for e in ui:
                if e["frames"][0] <= frame_no < e["frames"][1]:
                    x0, y0, x1, y1 = e["bbox"]
                    mask[int(y0 / fh * h):int(y1 / fh * h),
                         int(x0 / fw * w):int(x1 / fw * w)] = False
            px = img[mask]
            if px.size == 0 or px.shape[0] < 500:
                skipped += 1
                continue
            d = np.linalg.norm(px[:, None, :] - allowed[None, :, :], axis=2).min(axis=1)
            frac = float((d > tol).mean())
            if frac > worst:
                worst, worst_t = frac, t

    ok = worst <= 0.02
    note = f" ({skipped} frame(s) fully masked by UI)" if skipped else ""
    rep.add("palette", ok,
            f"worst {worst * 100:.1f}% off-palette at {worst_t:.1f}s (limit 2%){note}",
            "#01")


# ── manifest ──────────────────────────────────────────────────────────────

def area(b):
    return max(0, b[2] - b[0]) * max(0, b[3] - b[1])


def intersects(a, b):
    return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])


def overlaps_in_time(a, b):
    return not (a["frames"][1] <= b["frames"][0] or b["frames"][1] <= a["frames"][0])


def check_safe_zone(manifest, rep):
    """#18 — text under the caption strip on mobile."""
    sz = manifest.get("safe_zone")
    if not sz:
        rep.add("safe zone", True, "not declared", "#18", warn=True)
        return
    bad = [e["id"] for e in manifest["elements"]
           if e.get("critical", True)
           and (e["bbox"][1] < sz["y_min"] or e["bbox"][3] > sz["y_max"])]
    rep.add("safe zone", not bad,
            "all inside" if not bad else f"outside: {', '.join(bad[:4])}", "#18")


def check_zones(manifest, rep):
    """#20 — 'no overlap' as prose was violated twice."""
    zones = manifest.get("zones", {})
    stray = []
    for e in manifest["elements"]:
        z = e.get("zone")
        if z and z in zones:
            zb, b = zones[z], e["bbox"]
            if not (b[0] >= zb[0] - 1 and b[1] >= zb[1] - 1
                    and b[2] <= zb[2] + 1 and b[3] <= zb[3] + 1):
                stray.append(f"{e['id']}→{z}")
    rep.add("zone containment", not stray,
            "all contained" if not stray else f"escaped: {', '.join(stray[:4])}", "#20")


def check_overlap(manifest, rep):
    """#20 — the narration block once sat on top of three other layers."""
    hits = []
    els = [e for e in manifest["elements"] if e.get("critical", True)]
    for a, b in combinations(els, 2):
        if overlaps_in_time(a, b) and intersects(a["bbox"], b["bbox"]):
            hits.append(f"{a['id']}×{b['id']}")
    rep.add("no overlap", not hits,
            "clean" if not hits else f"{len(hits)} collision(s): {', '.join(hits[:3])}",
            "#20")


def check_coverage(manifest, rep, floor=0.45):
    """#21 — one feature frame carried under 10% content."""
    fw, fh = manifest["frame_size"]
    frame_area = fw * fh
    worst, worst_ch = 1.0, None
    for ch in manifest.get("chapters", []):
        mid = (ch["start"] + ch["end"]) // 2
        live = [e["bbox"] for e in manifest["elements"]
                if e["frames"][0] <= mid < e["frames"][1]]
        if not live:
            continue
        x0 = min(b[0] for b in live); y0 = min(b[1] for b in live)
        x1 = max(b[2] for b in live); y1 = max(b[3] for b in live)
        cov = area([x0, y0, x1, y1]) / frame_area
        if cov < worst:
            worst, worst_ch = cov, ch["id"]
    ok = worst >= floor
    rep.add("content coverage", ok,
            f"worst {worst * 100:.0f}% in {worst_ch} (floor {floor * 100:.0f}%)"
            + ("" if ok else " — redistribute, do not enlarge"), "#21")


def check_dwell(manifest, rep, min_s=1.5):
    """#31 — text that nobody could read."""
    fps = manifest["fps"]
    short = []
    for e in manifest["elements"]:
        if e["type"] != "text" or e.get("texture"):
            continue
        still = e.get("still_from", e["frames"][0])
        dwell = (e["frames"][1] - still) / fps
        if dwell < min_s:
            short.append(f"{e['id']}={dwell:.1f}s")
    rep.add("reading dwell", not short,
            f"all ≥{min_s}s" if not short else f"too short: {', '.join(short[:4])}",
            "#31")


def check_motion(manifest, rep):
    """#28 #29 — motion beats position; two large moves read as a glitch."""
    ev = [m for m in manifest.get("motion_events", []) if m.get("magnitude") == "large"]
    clash = [f"{a['id']}×{b['id']}" for a, b in combinations(ev, 2)
             if overlaps_in_time(a, b)]
    rep.add("single large motion", not clash,
            "clean" if not clash else f"simultaneous: {', '.join(clash[:3])}", "#28")

    busy = []
    for e in manifest["elements"]:
        if e["type"] != "text" or e.get("texture"):
            continue
        still = e.get("still_from", e["frames"][0])
        window = {"frames": [still, min(still + int(manifest["fps"] * 1.5),
                                        e["frames"][1])]}
        for m in manifest.get("motion_events", []):
            if overlaps_in_time(window, m):
                busy.append(f"{e['id']}↔{m['id']}")
                break
    rep.add("text reads in stillness", not busy,
            "clean" if not busy else f"competing motion: {', '.join(busy[:3])}", "#29")


def check_chapters(manifest, rep):
    chs = sorted(manifest.get("chapters", []), key=lambda c: c["start"])
    if not chs:
        rep.add("chapter continuity", True, "none declared", warn=True)
        return
    problems = []
    cursor = 0
    for c in chs:
        if c["start"] != cursor:
            problems.append(f"gap before {c['id']}")
        cursor = c["end"]
    if cursor != manifest["duration_frames"]:
        problems.append(f"ends at {cursor}, expected {manifest['duration_frames']}")
    rep.add("chapter continuity", not problems,
            "contiguous" if not problems else "; ".join(problems[:3]))


# ── narrative structure ───────────────────────────────────────────────────

ROLE_ORDER = ["situation", "old_way", "transition", "solution", "sweep", "cta"]

LATIN_OK = set()  # filled from structure.json "brand_names"


def check_structure(manifest, structure, rep):
    """
    The six-chapter skeleton. Untested structures are the biggest risk in an
    unattended batch: one wrong skeleton multiplies across every video.
    """
    if not structure:
        rep.add("chapter roles", True, "no structure spec supplied", warn=True)
        return

    chs = manifest.get("chapters", [])
    roles = [c.get("role") for c in sorted(chs, key=lambda c: c["start"])]
    expected = structure.get("roles", ROLE_ORDER)
    ok = roles == expected
    rep.add("chapter roles", ok,
            "situation→old→transition→solution→sweep→cta" if ok
            else f"got {roles}", "#07")

    # boundaries must match the declared duration class exactly
    skel = structure.get("skeleton")
    if skel:
        got = [[c["start"], c["end"]] for c in sorted(chs, key=lambda c: c["start"])]
        ok = got == skel
        rep.add("class skeleton", ok,
                f"matches class {structure.get('class', '?')}" if ok
                else f"drifted from class {structure.get('class', '?')}: {got[:3]}...")


def check_hero_intro(manifest, structure, rep):
    """#08 — the source production never named its audience category."""
    limit = (structure or {}).get("hero_named_before_frame")
    if not limit:
        return
    tagged = [e for e in manifest["elements"] if e.get("names_hero")]
    first = min((e["frames"][0] for e in tagged), default=None)
    ok = first is not None and first < limit
    rep.add("hero named early", ok,
            f"frame {first} (limit {limit})" if first is not None
            else "no element marked names_hero", "#08")


def check_sweep(manifest, structure, rep):
    """
    The sweep chapter is new and untested. It must accumulate, must not
    zoom, and must carry enough items to read as breadth.  #30
    """
    sid = (structure or {}).get("sweep_chapter")
    if not sid:
        return
    ch = next((c for c in manifest.get("chapters", []) if c["id"] == sid), None)
    if not ch:
        rep.add("sweep chapter", False, f"chapter '{sid}' not in manifest")
        return

    items = [e for e in manifest["elements"]
             if e.get("chapter") == sid and e.get("sweep_item")]
    need = (structure or {}).get("sweep_min_items", 5)
    rep.add("sweep item count", len(items) >= need,
            f"{len(items)} items (min {need})")

    # accumulation: every item must still be on screen at the chapter's end
    drops = [e["id"] for e in items if e["frames"][1] < ch["end"] - 2]
    rep.add("sweep accumulates", not drops,
            "all persist to chapter end" if not drops
            else f"{len(drops)} item(s) disappear early — replacement, not accumulation",
            "#30")

    # no deep dive: no large motion inside the sweep
    zooms = [m["id"] for m in manifest.get("motion_events", [])
             if m.get("magnitude") == "large"
             and m["frames"][0] < ch["end"] and m["frames"][1] > ch["start"]]
    rep.add("sweep stays shallow", not zooms,
            "no zoom or interaction" if not zooms
            else f"deep dive detected: {', '.join(zooms[:3])}")


def check_relation_shapes(manifest, rep):
    """
    #38 — a shape captioned 'everything is connected' rendered as four
    boxes with zero lines. A shape that claims a relation must draw it.
    """
    bad = []
    for e in manifest["elements"]:
        if not e.get("claims_relation"):
            continue
        n = e.get("nodes", 0)
        need = n * (n - 1) // 2 if e.get("relation") == "mesh" else max(n - 1, 0)
        if e.get("edges", 0) < need:
            bad.append(f"{e['id']} has {e.get('edges', 0)} edges, needs {need}")
    rep.add("relation shapes drawn", not bad,
            "all relations drawn" if not bad else "; ".join(bad[:3]), "#38")


def check_language(manifest, structure, rep):
    """#39 — Latin strings leaked into an Arabic video."""
    allow = set((structure or {}).get("brand_names", []))
    lang = (structure or {}).get("text_language")
    if not lang or lang == "latin":
        return
    offenders = []
    for e in manifest["elements"]:
        txt = (e.get("text") or "").strip()
        if not txt or e.get("type") != "text":
            continue
        words = [w.strip(".,:·—-") for w in txt.split()]
        latin = [w for w in words
                 if w and all(c.isascii() for c in w) and any(c.isalpha() for c in w)
                 and w not in allow]
        if latin:
            offenders.append(f"{e['id']}:{' '.join(latin[:3])}")
    rep.add("single language", not offenders,
            f"all {lang}" if not offenders else "; ".join(offenders[:3]), "#39")


def check_cta_stillness(manifest, structure, rep):
    """#34 — the CTA once held for one second."""
    need = (structure or {}).get("cta_min_still_frames")
    if not need:
        return
    cta = next((c for c in manifest.get("chapters", []) if c.get("role") == "cta"), None)
    if not cta:
        rep.add("cta stillness", False, "no chapter with role 'cta'", "#34")
        return
    last_entry = max((e.get("still_from", e["frames"][0])
                      for e in manifest["elements"]
                      if e.get("chapter") == cta["id"]), default=cta["start"])
    still = cta["end"] - last_entry
    rep.add("cta stillness", still >= need,
            f"{still} frames still (min {need})", "#34")


# ── main ──────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--config", help="JSON with {\"colors\": [...], \"lufs\": -14}")
    ap.add_argument("--structure", help="JSON with the narrative skeleton spec")
    ap.add_argument("--skip-palette", action="store_true")
    ap.add_argument("--json", help="write the result to this path as JSON")
    a = ap.parse_args()

    manifest = json.loads(Path(a.manifest).read_text(encoding="utf-8"))
    cfg = json.loads(Path(a.config).read_text(encoding="utf-8")) if a.config else {}
    structure = json.loads(Path(a.structure).read_text(encoding="utf-8")) if a.structure else None
    colors = cfg.get("colors", [])
    lufs = cfg.get("lufs", -14)

    rep = Report()
    # file and audio
    check_integrity(a.video, rep)
    check_duration(a.video, manifest, rep)
    check_loudness(a.video, lufs, rep)
    check_beat_continuity(a.video, rep)
    if not a.skip_palette:
        check_palette(a.video, colors, manifest, rep)
    # layout
    check_chapters(manifest, rep)
    check_safe_zone(manifest, rep)
    check_zones(manifest, rep)
    check_overlap(manifest, rep)
    check_coverage(manifest, rep)
    check_dwell(manifest, rep)
    check_motion(manifest, rep)
    # narrative structure
    check_structure(manifest, structure, rep)
    check_hero_intro(manifest, structure, rep)
    check_sweep(manifest, structure, rep)
    check_relation_shapes(manifest, rep)
    check_language(manifest, structure, rep)
    check_cta_stillness(manifest, structure, rep)

    code = rep.render()

    if a.json:
        Path(a.json).write_text(json.dumps({
            "video": a.video,
            "passed": code == 0,
            "checks": [{"name": n, "ok": ok, "detail": d, "ref": r, "warn": w}
                       for n, ok, d, r, w in rep.rows],
            "failed": [n for n, ok, d, r, w in rep.rows if not ok and not w],
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    if code:
        print("Do not show this render to the user. Fix and re-run.")
        print("Each [#n] maps to references/failure-log.md\n")
    sys.exit(code)


if __name__ == "__main__":
    main()

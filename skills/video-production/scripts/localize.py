#!/usr/bin/env python3
"""Extract the translatable strings from a manifest, then measure what translation did to them.

    python localize.py --manifest layout.json --out strings.json
    python localize.py --strings strings.ar.json --base strings.json --check

Translation changes string length, and every layout number was tuned to the
original. That is the whole problem: a localized build is a re-layout on the
same timeline, exactly like a new aspect ratio.

The check reports the delta per string so the re-layout is a measurement before
it is a surprise, and flags the ones large enough to break a box.
"""
import argparse
import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Above this the box almost always needs new numbers, not a smaller font.
GROWTH_WARN = 0.15
GROWTH_FAIL = 0.35


def extract(manifest):
    m = json.loads(Path(manifest).read_text(encoding="utf-8"))
    rows = []
    for e in m.get("elements", []):
        txt = (e.get("text") or "").strip()
        if not txt or e.get("type") != "text":
            continue
        rows.append({
            "id": e["id"],
            "chapter": e.get("chapter"),
            "zone": e.get("zone"),
            "text": txt,
            "chars": len(txt),
            "words": len(txt.split()),
            "note": "sweep item" if e.get("sweep_item") else
                    ("names the hero" if e.get("names_hero") else ""),
        })
    return rows


def check(base_rows, new_rows):
    base = {r["id"]: r for r in base_rows}
    out, worst = [], 0.0
    for r in new_rows:
        b = base.get(r["id"])
        if not b:
            out.append((r["id"], None, None, None, "not in the base — new or renamed"))
            continue
        nb, nn = b["chars"], len(r["text"])
        growth = (nn - nb) / nb if nb else 0.0
        worst = max(worst, abs(growth))
        state = ("ok" if abs(growth) < GROWTH_WARN
                 else "warn" if abs(growth) < GROWTH_FAIL else "FAIL")
        out.append((r["id"], nb, nn, growth, state))
    missing = [i for i in base if i not in {r["id"] for r in new_rows}]
    return out, missing, worst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest")
    ap.add_argument("--out")
    ap.add_argument("--strings")
    ap.add_argument("--base")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()

    if a.manifest:
        rows = extract(a.manifest)
        payload = {"_note": "Translate the `text` field only. Keep every id. "
                            "Brand names stay in their original script.",
                   "strings": rows}
        if a.out:
            Path(a.out).write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                                   encoding="utf-8")
            print(f"wrote {a.out}  ({len(rows)} translatable string(s))")
        else:
            print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    if not (a.strings and a.base):
        ap.error("pass --manifest to extract, or --strings with --base to check")

    new_rows = json.loads(Path(a.strings).read_text(encoding="utf-8")).get("strings", [])
    base_rows = json.loads(Path(a.base).read_text(encoding="utf-8")).get("strings", [])
    rows, missing, worst = check(base_rows, new_rows)

    w = max((len(str(r[0])) for r in rows), default=8) + 2
    print("=" * 66)
    print("STRING".ljust(w) + "BASE  NEW   DELTA   ")
    print("=" * 66)
    bad = 0
    for sid, nb, nn, growth, state in rows:
        if nb is None:
            print(f"{str(sid).ljust(w)}   —     —       —     {state}")
            continue
        if state == "FAIL":
            bad += 1
        print(f"{str(sid).ljust(w)}{nb:>5} {nn:>5}  {growth:+6.0%}   {state}")
    print("=" * 66)

    for sid in missing:
        print(f"MISSING: {sid} — untranslated, the build will fall back to the base language")
    if missing:
        bad += len(missing)

    print(f"\nLargest change: {worst:+.0%}")
    if bad:
        print(f"{bad} string(s) need layout attention before this cut is built.")
        print("Re-run the full verifier after the re-layout — safe zone, coverage and "
              "reading dwell are all length-dependent.")
    else:
        print("Lengths are close enough that the existing layout should hold. "
              "Verify anyway; this measures characters, not rendered width.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

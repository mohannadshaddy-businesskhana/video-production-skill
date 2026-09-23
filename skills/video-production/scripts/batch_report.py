#!/usr/bin/env python3
"""
batch_report.py — aggregate verify.py JSON reports into one morning summary.

    python batch_report.py --reports reports/ --out run-log-summary.md

The most useful number it produces is the repeat count per check: if the same
check failed across several videos, the fault is in the template, not in the
videos.
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
from collections import Counter
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reports", required=True, help="directory of *.json reports")
    ap.add_argument("--out", help="write markdown here (default: stdout)")
    a = ap.parse_args()

    files = sorted(Path(a.reports).glob("*.json"))
    if not files:
        print(f"no reports in {a.reports}")
        return

    rows, fail_counter, warn_rows = [], Counter(), []
    for f in files:
        try:
            r = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            rows.append((f.stem, "UNREADABLE", []))
            continue
        failed = r.get("failed", [])
        rows.append((f.stem, "PASS" if r.get("passed") else "FAIL", failed))
        fail_counter.update(failed)
        for c in r.get("checks", []):
            if c.get("warn") and not c.get("ok", True):
                warn_rows.append((f.stem, c["name"], c.get("detail", "")))
            elif c.get("warn"):
                warn_rows.append((f.stem, c["name"], c.get("detail", "")))

    passed = sum(1 for _, s, _ in rows if s == "PASS")
    total = len(rows)

    out = []
    out.append("# Batch summary\n")
    out.append(f"**{passed}/{total} passed**\n")

    out.append("\n## Per video\n")
    out.append("| video | status | failed checks |")
    out.append("|---|---|---|")
    for name, status, failed in rows:
        mark = {"PASS": "✅", "FAIL": "❌"}.get(status, "⚠️")
        out.append(f"| {name} | {mark} {status} | {', '.join(failed) if failed else '—'} |")

    if fail_counter:
        out.append("\n## Repeat failures — read this first\n")
        out.append("| check | videos affected | verdict |")
        out.append("|---|---|---|")
        for check, n in fail_counter.most_common():
            verdict = ("**TEMPLATE FAULT — fix the shared component**"
                       if n >= 3 else "isolated")
            out.append(f"| {check} | {n} | {verdict} |")
        worst, n = fail_counter.most_common(1)[0]
        if n >= 3:
            out.append(
                f"\n> ⛔ `{worst}` failed on {n} videos. That is a shared-component "
                f"fault, not {n} separate mistakes. Fix it once, then re-render "
                f"only the affected videos.\n")

    if warn_rows:
        out.append("\n## Warnings — did not block delivery\n")
        out.append("| video | check | detail |")
        out.append("|---|---|---|")
        for v, c, d in warn_rows[:20]:
            out.append(f"| {v} | {c} | {d} |")

    out.append("\n## Not covered by any check — needs a human\n")
    out.append("- Does the story land?")
    out.append("- Does the sweep read as a showcase or as a list?")
    out.append("- Is the claim right for this market?")
    out.append("- Does the language sound native or translated?")
    out.append("- Does each shape say what its caption says?")
    out.append("\n*A video that passed every check can still be a weak video. "
               "The checks prevent failure; they do not create quality.*")

    text = "\n".join(out) + "\n"
    if a.out:
        Path(a.out).write_text(text, encoding="utf-8")
        print(f"wrote {a.out}  ({passed}/{total} passed)")
    else:
        print(text)


if __name__ == "__main__":
    main()

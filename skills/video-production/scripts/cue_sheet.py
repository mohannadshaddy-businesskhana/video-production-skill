#!/usr/bin/env python3
"""Turn a media ledger into a cue sheet and a licence audit.

    python cue_sheet.py --ledger ledger.json --project "Name" --out cue-sheet.md
    python cue_sheet.py --ledger ledger.json --audit          # licence problems only

A cue sheet is a deliverable in its own right: broadcasters and rights societies
ask for one, and a client who is buying a video is buying the right to use the
music in it. This reads the ledger `/media-use` writes when it resolves an asset,
and flags the three things that actually cause trouble:

  · a non-commercial licence in a commercial piece
  · an attribution licence with no attribution recorded
  · an asset with no licence recorded at all

A missing licence is not a formatting problem. It is the reason a video gets
pulled after it ships.
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

NON_COMMERCIAL = ("nc", "noncommercial", "non-commercial", "cc-by-nc", "cc by-nc",
                  "research", "scientific", "personal")
ATTRIBUTION = ("by", "cc-by", "cc by", "attribution")


def norm(v):
    return str(v or "").strip().lower()


def load(path):
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        for key in ("assets", "entries", "ledger", "items"):
            if key in raw and isinstance(raw[key], list):
                return raw[key]
        return list(raw.values()) if all(isinstance(v, dict) for v in raw.values()) else []
    return raw


def audit(rows):
    problems = []
    for r in rows:
        name = r.get("name") or r.get("id") or r.get("path") or "?"
        lic = norm(r.get("licence") or r.get("license"))
        if not lic:
            problems.append(("no licence recorded", name,
                             "Resolve it again through the ledger, or remove the asset."))
            continue
        if any(t in lic for t in NON_COMMERCIAL):
            problems.append(("non-commercial licence", f"{name} — {lic}",
                             "Cannot ship in client or paid work. Replace it."))
        elif any(lic.startswith(t) or t in lic for t in ATTRIBUTION):
            if not (r.get("attribution") or r.get("credit") or r.get("author")):
                problems.append(("attribution required, none recorded", f"{name} — {lic}",
                                 "Record the credit line the licence asks for."))
    return problems


def sheet(rows, project):
    L = [f"# Cue sheet — {project}", "", f"**Prepared:** {date.today().isoformat()}", "",
         "| # | Asset | Type | Use | In | Out | Licence | Source | Credit |",
         "|---:|---|---|---|---|---|---|---|---|"]
    for i, r in enumerate(rows, 1):
        L.append("| {} | {} | {} | {} | {} | {} | {} | {} | {} |".format(
            i,
            r.get("name") or r.get("id") or "",
            r.get("type", ""),
            r.get("use", "background"),
            r.get("in", ""), r.get("out", ""),
            r.get("licence") or r.get("license") or "⚠️ none",
            r.get("source") or r.get("provider") or "",
            r.get("attribution") or r.get("credit") or r.get("author") or ""))
    L += ["", f"{len(rows)} asset(s).", ""]

    problems = audit(rows)
    if problems:
        L += ["## ⚠️ Licence problems", "", "| Problem | Asset | What to do |", "|---|---|---|"]
        for kind, name, fix in problems:
            L.append(f"| {kind} | {name} | {fix} |")
        L.append("")
    else:
        L += ["All assets carry a recorded licence and any required credit.", ""]
    return "\n".join(L), problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ledger", required=True)
    ap.add_argument("--project", default="Untitled")
    ap.add_argument("--out")
    ap.add_argument("--audit", action="store_true")
    a = ap.parse_args()

    rows = load(a.ledger)
    if not rows:
        print("ledger is empty or in an unrecognised shape", file=sys.stderr)
        return 2

    if a.audit:
        problems = audit(rows)
        if not problems:
            print(f"{len(rows)} asset(s) — no licence problems")
            return 0
        for kind, name, fix in problems:
            print(f"FAIL  {kind}: {name}\n      {fix}")
        return 1

    text, problems = sheet(rows, a.project)
    if a.out:
        Path(a.out).write_text(text, encoding="utf-8")
        print(f"wrote {a.out}  ({len(rows)} assets, {len(problems)} problem(s))")
    else:
        print(text)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())

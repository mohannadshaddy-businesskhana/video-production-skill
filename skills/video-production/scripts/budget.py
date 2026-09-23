#!/usr/bin/env python3
"""Build a quote from a rate card and a shape.

    python budget.py --rates rate-card.json --shape shape.json --out quote.md
    python budget.py --rates rate-card.json --template            # print a shape skeleton

The rate card is the studio's own numbers and never ships with the skill —
copy assets/rate-card.template.json into the project and fill it.

`shape.json` says what this job actually needs: which line items, how many days
or units of each. The script does arithmetic and writes the terms that scope
disputes always come down to — revision rounds, what counts as a change order,
and what the price excludes.
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SHAPE_TEMPLATE = {
    "project": "Project name",
    "client": "Client name",
    "deliverables": ["1 × 60s master (16:9)", "cutdowns 30/15/6", "9:16 + 1:1 versions"],
    "lines": [
        {"item": "director", "units": 2},
        {"item": "producer", "units": 4},
        {"item": "dop", "units": 2},
        {"item": "editor", "units": 5},
        {"item": "motion_designer", "units": 3},
        {"item": "shoot_day", "units": 2},
        {"item": "colour_grade", "units": 1},
        {"item": "audio_mix", "units": 1}
    ],
    "revision_rounds": 2,
    "contingency_pct": 10,
    "notes": ["Music licence billed at cost", "Talent buyout not included"]
}


def money(n, cur):
    return f"{n:,.0f} {cur}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rates", required=True)
    ap.add_argument("--shape")
    ap.add_argument("--out")
    ap.add_argument("--template", action="store_true")
    a = ap.parse_args()

    if a.template:
        print(json.dumps(SHAPE_TEMPLATE, ensure_ascii=False, indent=2))
        return 0

    if not a.shape:
        ap.error("pass --shape, or --template to print a skeleton")

    rates = json.loads(Path(a.rates).read_text(encoding="utf-8"))
    shape = json.loads(Path(a.shape).read_text(encoding="utf-8"))
    cur = rates.get("currency", "EGP")
    card = rates["items"]

    rows, subtotal, unknown = [], 0.0, []
    for line in shape["lines"]:
        key = line["item"]
        if key not in card:
            unknown.append(key)
            continue
        entry = card[key]
        rate = float(entry["rate"])
        units = float(line.get("units", 1))
        amount = rate * units
        subtotal += amount
        rows.append((entry.get("label", key), entry.get("unit", "unit"),
                     units, rate, amount))

    if unknown:
        print("Rate card has no entry for: " + ", ".join(unknown), file=sys.stderr)
        print("Add them to the card or remove them from the shape — "
              "a quote with invented numbers is worse than a late quote.", file=sys.stderr)
        return 2

    cont_pct = float(shape.get("contingency_pct", rates.get("contingency_pct", 0)))
    contingency = subtotal * cont_pct / 100
    pre_tax = subtotal + contingency
    tax_pct = float(rates.get("tax_pct", 0))
    tax = pre_tax * tax_pct / 100
    total = pre_tax + tax

    rounds = int(shape.get("revision_rounds", rates.get("revision_rounds", 2)))
    extra = card.get("extra_revision_round", {}).get("rate")

    L = []
    L.append(f"# Quote — {shape.get('project', 'Untitled')}")
    L.append("")
    L.append(f"**Client:** {shape.get('client', '—')}  ")
    L.append(f"**Date:** {date.today().isoformat()}  ")
    L.append(f"**Valid for:** {rates.get('validity_days', 30)} days")
    L.append("")
    L.append("## Deliverables")
    L.append("")
    for d in shape.get("deliverables", []):
        L.append(f"- {d}")
    L.append("")
    L.append("## Line items")
    L.append("")
    L.append("| Item | Unit | Qty | Rate | Amount |")
    L.append("|---|---|---:|---:|---:|")
    for label, unit, units, rate, amount in rows:
        L.append(f"| {label} | {unit} | {units:g} | {money(rate, cur)} | {money(amount, cur)} |")
    L.append(f"| **Subtotal** | | | | **{money(subtotal, cur)}** |")
    if contingency:
        L.append(f"| Contingency ({cont_pct:g}%) | | | | {money(contingency, cur)} |")
    if tax:
        L.append(f"| Tax ({tax_pct:g}%) | | | | {money(tax, cur)} |")
    L.append(f"| **Total** | | | | **{money(total, cur)}** |")
    L.append("")
    L.append("## Terms")
    L.append("")
    L.append(f"**Revisions.** {rounds} rounds are included, in this order:")
    L.append("")
    L.append("1. Structure and story — after the first cut")
    L.append("2. Polish — colour, music, graphics")
    if rounds >= 3:
        L.append("3. Final detail")
    L.append("")
    L.append("**Approval gates.** Script, rough cut, final. Work proceeds on written approval at "
             "each gate.")
    L.append("")
    L.append("**Change orders.** Returning to an approved stage is a change order, quoted "
             "separately before work resumes. In practice that means: changing the script after "
             "lock, reshooting, re-ordering after picture lock, or adding versions and aspect "
             "ratios not listed under Deliverables.")
    if extra:
        L.append("")
        L.append(f"An additional revision round beyond the included {rounds}: "
                 f"{money(float(extra), cur)}.")
    L.append("")
    payment = rates.get("payment_terms")
    if payment:
        L.append(f"**Payment.** {payment}")
        L.append("")
    L.append("## Not included")
    L.append("")
    excl = list(rates.get("exclusions", [])) + list(shape.get("notes", []))
    for e in excl or ["—"]:
        L.append(f"- {e}")
    L.append("")

    text = "\n".join(L)
    if a.out:
        Path(a.out).write_text(text, encoding="utf-8")
        print(f"wrote {a.out}  ({money(total, cur)} total)")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())

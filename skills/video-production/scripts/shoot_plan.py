#!/usr/bin/env python3
"""Turn a shot-planning JSON into the three documents a shoot day needs.

    python shoot_plan.py --plan plan.json --out plan/
    python shoot_plan.py --template            # print a plan skeleton

Writes shot-list.md, schedule.md and call-sheet.md.

These are the documents a renderer has no business producing and a production
company cannot work without. Nothing here is generated from imagination: every
field comes from the plan file, and a missing field is reported rather than
invented — a call sheet with a guessed address wastes a crew's morning.
"""
import argparse
import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

TEMPLATE = {
    "project": "Project name",
    "shoot_date": "2026-10-14",
    "call_time": "07:00",
    "wrap_time": "19:00",
    "locations": [
        {"id": "L1", "name": "Office floor 3", "address": "…",
         "parking": "…", "nearest_hospital": "…", "notes": "lift access before 09:00"}
    ],
    "contacts": [
        {"role": "Producer", "name": "…", "phone": "…"},
        {"role": "1st AD", "name": "…", "phone": "…"}
    ],
    "crew": [{"role": "DoP", "name": "…", "call": "07:00"}],
    "cast": [{"character": "Salma", "name": "…", "call": "08:00", "wardrobe": "business casual"}],
    "shots": [
        {"id": "1A", "scene": 1, "location": "L1", "description": "Salma reads the message",
         "size": "MCU", "movement": "static", "lens": "50mm", "duration_min": 45,
         "talent": ["Salma"], "props": ["phone"], "notes": ""}
    ],
    "meals": [{"name": "Lunch", "time": "13:00"}],
    "weather_note": "",
    "safety_note": ""
}

SIZES = {"ECU": "extreme close-up", "CU": "close-up", "MCU": "medium close-up",
         "MS": "medium", "MLS": "medium long", "LS": "long", "WS": "wide", "EWS": "extreme wide"}


def missing(plan):
    gaps = []
    for loc in plan.get("locations", []):
        for f in ("address", "nearest_hospital"):
            if not loc.get(f):
                gaps.append(f"location {loc.get('id', '?')} has no {f}")
    if not plan.get("contacts"):
        gaps.append("no contacts — a call sheet without a phone number is not a call sheet")
    for c in plan.get("crew", []) + plan.get("cast", []):
        if not c.get("call"):
            gaps.append(f"no call time for {c.get('name') or c.get('role') or c.get('character')}")
    return gaps


def shot_list(plan):
    L = [f"# Shot list — {plan.get('project', '')}", ""]
    by_loc = {}
    for s in plan.get("shots", []):
        by_loc.setdefault(s.get("location", "—"), []).append(s)
    total = 0
    for loc, shots in by_loc.items():
        name = next((l["name"] for l in plan.get("locations", []) if l.get("id") == loc), loc)
        L += [f"## {loc} — {name}", "",
              "| Shot | Sc | Description | Size | Movement | Lens | Est. | Talent | Props |",
              "|---|---|---|---|---|---|---:|---|---|"]
        for s in shots:
            mins = int(s.get("duration_min", 0))
            total += mins
            L.append("| {} | {} | {} | {} | {} | {} | {}m | {} | {} |".format(
                s.get("id", ""), s.get("scene", ""), s.get("description", ""),
                s.get("size", ""), s.get("movement", ""), s.get("lens", ""), mins,
                ", ".join(s.get("talent", [])), ", ".join(s.get("props", []))))
        L.append("")
    L += [f"**{len(plan.get('shots', []))} shots · {total // 60}h {total % 60}m of estimated "
          f"camera time.**", "",
          "Estimated camera time is not a shooting day. Add setup, relight, moves between "
          "locations, meals and overrun before promising a wrap time.", ""]
    if SIZES:
        L += ["Size codes: " + " · ".join(f"`{k}` {v}" for k, v in SIZES.items()), ""]
    return "\n".join(L)


def schedule(plan):
    L = [f"# Shooting schedule — {plan.get('project', '')}", "",
         f"**Date:** {plan.get('shoot_date', '—')} · **Call:** {plan.get('call_time', '—')} · "
         f"**Wrap:** {plan.get('wrap_time', '—')}", "",
         "| Time | Shot | Location | Description | Talent |", "|---|---|---|---|---|"]

    def to_min(t):
        try:
            h, m = t.split(":")
            return int(h) * 60 + int(m)
        except Exception:
            return 7 * 60

    cur = to_min(plan.get("call_time", "07:00")) + 30      # 30m for crew call before turnover
    meals = sorted(plan.get("meals", []), key=lambda m: to_min(m.get("time", "13:00")))
    mi = 0
    for s in plan.get("shots", []):
        while mi < len(meals) and to_min(meals[mi]["time"]) <= cur:
            m = meals[mi]
            L.append(f"| {m['time']} | — | — | **{m.get('name', 'Break')}** | — |")
            cur = to_min(m["time"]) + int(m.get("duration_min", 45))
            mi += 1
        L.append("| {:02d}:{:02d} | {} | {} | {} | {} |".format(
            cur // 60, cur % 60, s.get("id", ""), s.get("location", ""),
            s.get("description", ""), ", ".join(s.get("talent", []))))
        cur += int(s.get("duration_min", 30))
    L += ["", f"| {cur // 60:02d}:{cur % 60:02d} | — | — | **Estimated wrap** | — |", "",
          "Times are estimates generated from shot durations. The 1st AD owns the real schedule.", ""]
    return "\n".join(L)


def call_sheet(plan):
    L = [f"# Call sheet — {plan.get('project', '')}", "",
         f"**{plan.get('shoot_date', '—')}** · General call **{plan.get('call_time', '—')}** · "
         f"Estimated wrap **{plan.get('wrap_time', '—')}**", ""]

    L += ["## Locations", ""]
    for loc in plan.get("locations", []):
        L += [f"**{loc.get('id', '')} — {loc.get('name', '')}**  ",
              f"{loc.get('address', '⚠️ ADDRESS MISSING')}  "]
        if loc.get("parking"):
            L.append(f"Parking: {loc['parking']}  ")
        L.append(f"Nearest hospital: {loc.get('nearest_hospital', '⚠️ MISSING')}  ")
        if loc.get("notes"):
            L.append(f"Notes: {loc['notes']}  ")
        L.append("")

    L += ["## Key contacts", "", "| Role | Name | Phone |", "|---|---|---|"]
    for c in plan.get("contacts", []):
        L.append(f"| {c.get('role', '')} | {c.get('name', '')} | {c.get('phone', '')} |")
    L.append("")

    if plan.get("cast"):
        L += ["## Cast", "", "| Character | Name | Call | Wardrobe |", "|---|---|---|---|"]
        for c in plan["cast"]:
            L.append(f"| {c.get('character', '')} | {c.get('name', '')} | "
                     f"{c.get('call', '')} | {c.get('wardrobe', '')} |")
        L.append("")

    if plan.get("crew"):
        L += ["## Crew", "", "| Role | Name | Call |", "|---|---|---|"]
        for c in plan["crew"]:
            L.append(f"| {c.get('role', '')} | {c.get('name', '')} | {c.get('call', '')} |")
        L.append("")

    if plan.get("meals"):
        L += ["## Meals", ""]
        for m in plan["meals"]:
            L.append(f"- {m.get('time', '')} — {m.get('name', '')}")
        L.append("")

    if plan.get("weather_note"):
        L += ["## Weather", "", plan["weather_note"], ""]
    L += ["## Safety", "",
          plan.get("safety_note") or
          "Nearest hospital is listed per location. Report any hazard to the 1st AD before the "
          "shot, not after it.", ""]
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan")
    ap.add_argument("--out", default="plan")
    ap.add_argument("--template", action="store_true")
    a = ap.parse_args()

    if a.template:
        print(json.dumps(TEMPLATE, ensure_ascii=False, indent=2))
        return 0
    if not a.plan:
        ap.error("pass --plan, or --template to print a skeleton")

    plan = json.loads(Path(a.plan).read_text(encoding="utf-8"))
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    (out / "shot-list.md").write_text(shot_list(plan), encoding="utf-8")
    (out / "schedule.md").write_text(schedule(plan), encoding="utf-8")
    (out / "call-sheet.md").write_text(call_sheet(plan), encoding="utf-8")
    print(f"wrote {out}/shot-list.md, schedule.md, call-sheet.md")

    gaps = missing(plan)
    if gaps:
        print("\nIncomplete — fix before the sheet goes out:", file=sys.stderr)
        for g in gaps:
            print("  · " + g, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

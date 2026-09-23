#!/usr/bin/env node
/* Turn a shoot plan into the three documents a crew actually needs.
 *
 *   node shoot_plan.mjs --plan plan.json --out plan/
 *   node shoot_plan.mjs --template            # print a plan skeleton
 *
 * A shot list, a schedule and a call sheet. The call sheet is the one with legal
 * weight: an address and a nearest hospital per location, and a phone number for
 * whoever is running the day.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE = {
  project: "Project name",
  shoot_date: "2026-10-14",
  call_time: "07:00",
  wrap_time: "19:00",
  locations: [
    { id: "L1", name: "Office floor 3", address: "…",
      parking: "…", nearest_hospital: "…", notes: "lift access before 09:00" },
  ],
  contacts: [
    { role: "Producer", name: "…", phone: "…" },
    { role: "1st AD", name: "…", phone: "…" },
  ],
  crew: [{ role: "DoP", name: "…", call: "07:00" }],
  cast: [{ character: "Salma", name: "…", call: "08:00", wardrobe: "business casual" }],
  shots: [
    { id: "1A", scene: 1, location: "L1", description: "Salma reads the message",
      size: "MCU", movement: "static", lens: "50mm", duration_min: 45,
      talent: ["Salma"], props: ["phone"], notes: "" },
  ],
  meals: [{ name: "Lunch", time: "13:00" }],
  weather_note: "",
  safety_note: "",
};

const SIZES = {
  ECU: "extreme close-up", CU: "close-up", MCU: "medium close-up",
  MS: "medium", MLS: "medium long", LS: "long", WS: "wide", EWS: "extreme wide",
};

const z2 = (n) => String(n).padStart(2, "0");

function missing(plan) {
  const gaps = [];
  for (const loc of plan.locations || [])
    for (const fld of ["address", "nearest_hospital"])
      if (!loc[fld]) gaps.push(`location ${loc.id || "?"} has no ${fld}`);
  if (!(plan.contacts || []).length)
    gaps.push("no contacts — a call sheet without a phone number is not a call sheet");
  for (const c of [...(plan.crew || []), ...(plan.cast || [])])
    if (!c.call) gaps.push(`no call time for ${c.name || c.role || c.character}`);
  return gaps;
}

function shotList(plan) {
  const L = [`# Shot list — ${plan.project ?? ""}`, ""];
  const byLoc = new Map();
  for (const s of plan.shots || []) {
    const k = s.location ?? "—";
    if (!byLoc.has(k)) byLoc.set(k, []);
    byLoc.get(k).push(s);
  }
  let total = 0;
  for (const [loc, shots] of byLoc) {
    const name = (plan.locations || []).find((l) => l.id === loc)?.name ?? loc;
    L.push(`## ${loc} — ${name}`, "",
      "| Shot | Sc | Description | Size | Movement | Lens | Est. | Talent | Props |",
      "|---|---|---|---|---|---|---:|---|---|");
    for (const s of shots) {
      const mins = parseInt(s.duration_min ?? 0, 10);
      total += mins;
      L.push(`| ${s.id ?? ""} | ${s.scene ?? ""} | ${s.description ?? ""} | ${s.size ?? ""} `
        + `| ${s.movement ?? ""} | ${s.lens ?? ""} | ${mins}m `
        + `| ${(s.talent || []).join(", ")} | ${(s.props || []).join(", ")} |`);
    }
    L.push("");
  }
  L.push(`**${(plan.shots || []).length} shots · ${Math.floor(total / 60)}h ${total % 60}m of estimated `
    + `camera time.**`, "",
    "Estimated camera time is not a shooting day. Add setup, relight, moves between "
    + "locations, meals and overrun before promising a wrap time.", "");
  L.push("Size codes: " + Object.entries(SIZES).map(([k, v]) => `\`${k}\` ${v}`).join(" · "), "");
  return L.join("\n");
}

function schedule(plan) {
  const L = [`# Shooting schedule — ${plan.project ?? ""}`, "",
    `**Date:** ${plan.shoot_date ?? "—"} · **Call:** ${plan.call_time ?? "—"} · `
    + `**Wrap:** ${plan.wrap_time ?? "—"}`, "",
    "| Time | Shot | Location | Description | Talent |", "|---|---|---|---|---|"];

  const toMin = (t) => {
    const m = /^(\d+):(\d+)$/.exec(String(t ?? ""));
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 7 * 60;
  };

  let cur = toMin(plan.call_time || "07:00") + 30;   // 30m for crew call before turnover
  const meals = [...(plan.meals || [])].sort((a, b) => toMin(a.time || "13:00") - toMin(b.time || "13:00"));
  let mi = 0;
  for (const s of plan.shots || []) {
    while (mi < meals.length && toMin(meals[mi].time) <= cur) {
      const m = meals[mi];
      L.push(`| ${m.time} | — | — | **${m.name ?? "Break"}** | — |`);
      cur = toMin(m.time) + parseInt(m.duration_min ?? 45, 10);
      mi++;
    }
    L.push(`| ${z2(Math.floor(cur / 60))}:${z2(cur % 60)} | ${s.id ?? ""} | ${s.location ?? ""} `
      + `| ${s.description ?? ""} | ${(s.talent || []).join(", ")} |`);
    cur += parseInt(s.duration_min ?? 30, 10);
  }
  L.push("", `| ${z2(Math.floor(cur / 60))}:${z2(cur % 60)} | — | — | **Estimated wrap** | — |`, "",
    "Times are estimates generated from shot durations. The 1st AD owns the real schedule.", "");
  return L.join("\n");
}

function callSheet(plan) {
  const L = [`# Call sheet — ${plan.project ?? ""}`, "",
    `**${plan.shoot_date ?? "—"}** · General call **${plan.call_time ?? "—"}** · `
    + `Estimated wrap **${plan.wrap_time ?? "—"}**`, ""];

  L.push("## Locations", "");
  for (const loc of plan.locations || []) {
    L.push(`**${loc.id ?? ""} — ${loc.name ?? ""}**  `,
           `${loc.address || "⚠️ ADDRESS MISSING"}  `);
    if (loc.parking) L.push(`Parking: ${loc.parking}  `);
    L.push(`Nearest hospital: ${loc.nearest_hospital || "⚠️ MISSING"}  `);
    if (loc.notes) L.push(`Notes: ${loc.notes}  `);
    L.push("");
  }

  L.push("## Key contacts", "", "| Role | Name | Phone |", "|---|---|---|");
  for (const c of plan.contacts || [])
    L.push(`| ${c.role ?? ""} | ${c.name ?? ""} | ${c.phone ?? ""} |`);
  L.push("");

  if ((plan.cast || []).length) {
    L.push("## Cast", "", "| Character | Name | Call | Wardrobe |", "|---|---|---|---|");
    for (const c of plan.cast)
      L.push(`| ${c.character ?? ""} | ${c.name ?? ""} | ${c.call ?? ""} | ${c.wardrobe ?? ""} |`);
    L.push("");
  }

  if ((plan.crew || []).length) {
    L.push("## Crew", "", "| Role | Name | Call |", "|---|---|---|");
    for (const c of plan.crew) L.push(`| ${c.role ?? ""} | ${c.name ?? ""} | ${c.call ?? ""} |`);
    L.push("");
  }

  if ((plan.meals || []).length) {
    L.push("## Meals", "");
    for (const m of plan.meals) L.push(`- ${m.time ?? ""} — ${m.name ?? ""}`);
    L.push("");
  }

  if (plan.weather_note) L.push("## Weather", "", plan.weather_note, "");
  L.push("## Safety", "",
    plan.safety_note
    || "Nearest hospital is listed per location. Report any hazard to the 1st AD before the "
     + "shot, not after it.", "");
  return L.join("\n");
}

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf("--" + n); return i === -1 ? undefined : argv[i + 1]; };

if (argv.includes("--template")) {
  console.log(JSON.stringify(TEMPLATE, null, 2));
  process.exit(0);
}
if (!opt("plan")) {
  console.error("pass --plan, or --template to print a skeleton");
  process.exit(2);
}

const plan = JSON.parse(readFileSync(opt("plan"), "utf8"));
const out = opt("out") || "plan";
mkdirSync(out, { recursive: true });

writeFileSync(join(out, "shot-list.md"), shotList(plan), "utf8");
writeFileSync(join(out, "schedule.md"), schedule(plan), "utf8");
writeFileSync(join(out, "call-sheet.md"), callSheet(plan), "utf8");
console.log(`wrote ${out}/shot-list.md, schedule.md, call-sheet.md`);

const gaps = missing(plan);
if (gaps.length) {
  console.error("\nIncomplete — fix before the sheet goes out:");
  for (const g of gaps) console.error("  · " + g);
  process.exit(1);
}

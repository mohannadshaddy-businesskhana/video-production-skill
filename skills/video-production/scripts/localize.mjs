#!/usr/bin/env node
/* Extract the translatable strings from a manifest, then measure what translation did to them.
 *
 *   node localize.mjs --manifest layout.json --out strings.json
 *   node localize.mjs --strings strings.ar.json --base strings.json --check
 *
 * Translation changes string length, and every layout number was tuned to the
 * original. That is the whole problem: a localized build is a re-layout on the
 * same timeline, exactly like a new aspect ratio.
 *
 * The check reports the delta per string so the re-layout is a measurement before
 * it is a surprise, and flags the ones large enough to break a box.
 */
import { readFileSync, writeFileSync } from "node:fs";

// Above this the box almost always needs new numbers, not a smaller font.
const GROWTH_WARN = 0.15;
const GROWTH_FAIL = 0.35;

const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));
const padL = (s, w) => " ".repeat(Math.max(0, w - String(s).length)) + s;
// Python's +6.0% — sign always shown, rounded to whole percent, width 6
const pct = (v, width = 6) => {
  const n = Math.round(v * 100);
  const s = (n >= 0 ? "+" : "") + n + "%";
  return padL(s, width);
};
// a string's length in CODE POINTS, so an emoji or a surrogate pair counts once
const chars = (s) => [...s].length;

function extract(manifestPath) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  const rows = [];
  for (const e of m.elements || []) {
    const txt = (e.text || "").trim();
    if (!txt || e.type !== "text") continue;
    rows.push({
      id: e.id,
      chapter: e.chapter ?? null,
      zone: e.zone ?? null,
      text: txt,
      chars: chars(txt),
      words: txt.split(/\s+/).filter(Boolean).length,
      note: e.sweep_item ? "sweep item" : (e.names_hero ? "names the hero" : ""),
    });
  }
  return rows;
}

function check(baseRows, newRows) {
  const base = new Map(baseRows.map((r) => [r.id, r]));
  const out = [];
  let worst = 0.0;
  for (const r of newRows) {
    const b = base.get(r.id);
    if (!b) { out.push([r.id, null, null, null, "not in the base — new or renamed"]); continue; }
    const nb = b.chars, nn = chars(r.text);
    const growth = nb ? (nn - nb) / nb : 0.0;
    worst = Math.max(worst, Math.abs(growth));
    const state = Math.abs(growth) < GROWTH_WARN ? "ok"
                : Math.abs(growth) < GROWTH_FAIL ? "warn" : "FAIL";
    out.push([r.id, nb, nn, growth, state]);
  }
  const present = new Set(newRows.map((r) => r.id));
  const missing = [...base.keys()].filter((i) => !present.has(i));
  return [out, missing, worst];
}

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf("--" + n); return i === -1 ? undefined : argv[i + 1]; };

if (opt("manifest")) {
  const rows = extract(opt("manifest"));
  const payload = {
    _note: "Translate the `text` field only. Keep every id. "
         + "Brand names stay in their original script.",
    strings: rows,
  };
  const json = JSON.stringify(payload, null, 2);
  if (opt("out")) {
    writeFileSync(opt("out"), json, "utf8");
    console.log(`wrote ${opt("out")}  (${rows.length} translatable string(s))`);
  } else console.log(json);
  process.exit(0);
}

if (!(opt("strings") && opt("base"))) {
  console.error("pass --manifest to extract, or --strings with --base to check");
  process.exit(2);
}

const newRows = JSON.parse(readFileSync(opt("strings"), "utf8")).strings || [];
const baseRows = JSON.parse(readFileSync(opt("base"), "utf8")).strings || [];
const [rows, missing, worst] = check(baseRows, newRows);

const w = Math.max(8, ...rows.map((r) => String(r[0]).length)) + 2;
console.log("=".repeat(66));
console.log(pad("STRING", w) + "BASE  NEW   DELTA   ");
console.log("=".repeat(66));
let bad = 0;
for (const [sid, nb, nn, growth, state] of rows) {
  if (nb === null) { console.log(pad(String(sid), w) + "   —     —       —     " + state); continue; }
  if (state === "FAIL") bad++;
  console.log(pad(String(sid), w) + padL(nb, 5) + " " + padL(nn, 5) + "  " + pct(growth) + "   " + state);
}
console.log("=".repeat(66));

for (const sid of missing)
  console.log(`MISSING: ${sid} — untranslated, the build will fall back to the base language`);
bad += missing.length;

console.log(`\nLargest change: ${pct(worst, 0)}`);
if (bad) {
  console.log(`${bad} string(s) need layout attention before this cut is built.`);
  console.log("Re-run the full verifier after the re-layout — safe zone, coverage and "
    + "reading dwell are all length-dependent.");
} else {
  console.log("Lengths are close enough that the existing layout should hold. "
    + "Verify anyway; this measures characters, not rendered width.");
}
process.exit(bad ? 1 : 0);

#!/usr/bin/env node
/* Build a quote from a rate card and a shape.
 *
 *   node budget.mjs --rates rate-card.json --shape shape.json --out quote.md
 *   node budget.mjs --rates rate-card.json --template      # print a shape skeleton
 *
 * The rate card is the studio's own numbers and never ships with the skill —
 * copy assets/rate-card.template.json into the project and fill it.
 *
 * `shape.json` says what this job actually needs: which line items, how many days
 * or units of each. The script does arithmetic and writes the terms that scope
 * disputes always come down to — revision rounds, what counts as a change order,
 * and what the price excludes.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SHAPE_TEMPLATE = {
  project: "Project name",
  client: "Client name",
  deliverables: ["1 × 60s master (16:9)", "cutdowns 30/15/6", "9:16 + 1:1 versions"],
  lines: [
    { item: "director", units: 2 },
    { item: "producer", units: 4 },
    { item: "dop", units: 2 },
    { item: "editor", units: 5 },
    { item: "motion_designer", units: 3 },
    { item: "shoot_day", units: 2 },
    { item: "colour_grade", units: 1 },
    { item: "audio_mix", units: 1 },
  ],
  revision_rounds: 2,
  contingency_pct: 10,
  notes: ["Music licence billed at cost", "Talent buyout not included"],
};

// thousands separators, no decimals — a quote line is not a measurement
const money = (n, cur) =>
  `${Math.round(n).toLocaleString("en-US")} ${cur}`;

// Python's %g: drop trailing zeros, so 2 not 2.0 and 7.5 stays 7.5
const g = (n) => String(Number(n));

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf("--" + n); return i === -1 ? undefined : argv[i + 1]; };

if (argv.includes("--template")) {
  console.log(JSON.stringify(SHAPE_TEMPLATE, null, 2));
  process.exit(0);
}

const ratesPath = opt("rates");
if (!ratesPath) { console.error("--rates is required"); process.exit(2); }
if (!opt("shape")) {
  console.error("pass --shape, or --template to print a skeleton");
  process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const rates = readJson(ratesPath);
const shape = readJson(opt("shape"));
const cur = rates.currency || "EGP";
const card = rates.items;

const rows = [];
let subtotal = 0;
const unknown = [];
for (const line of shape.lines) {
  const key = line.item;
  if (!(key in card)) { unknown.push(key); continue; }
  const entry = card[key];
  const rate = Number(entry.rate);
  const units = Number(line.units ?? 1);
  const amount = rate * units;
  subtotal += amount;
  rows.push([entry.label || key, entry.unit || "unit", units, rate, amount]);
}

if (unknown.length) {
  console.error("Rate card has no entry for: " + unknown.join(", "));
  console.error("Add them to the card or remove them from the shape — "
    + "a quote with invented numbers is worse than a late quote.");
  process.exit(2);
}

const contPct = Number(shape.contingency_pct ?? rates.contingency_pct ?? 0);
const contingency = subtotal * contPct / 100;
const preTax = subtotal + contingency;
const taxPct = Number(rates.tax_pct ?? 0);
const tax = preTax * taxPct / 100;
const total = preTax + tax;

const rounds = parseInt(shape.revision_rounds ?? rates.revision_rounds ?? 2, 10);
const extra = card.extra_revision_round?.rate;

const L = [];
L.push(`# Quote — ${shape.project || "Untitled"}`);
L.push("");
L.push(`**Client:** ${shape.client || "—"}  `);
// the studio's local date, not UTC — a quote issued at 1am must not be dated
// yesterday
L.push(`**Date:** ${new Date().toLocaleDateString("en-CA")}  `);
L.push(`**Valid for:** ${rates.validity_days ?? 30} days`);
L.push("");
L.push("## Deliverables");
L.push("");
for (const d of shape.deliverables || []) L.push(`- ${d}`);
L.push("");
L.push("## Line items");
L.push("");
L.push("| Item | Unit | Qty | Rate | Amount |");
L.push("|---|---|---:|---:|---:|");
for (const [label, unit, units, rate, amount] of rows)
  L.push(`| ${label} | ${unit} | ${g(units)} | ${money(rate, cur)} | ${money(amount, cur)} |`);
L.push(`| **Subtotal** | | | | **${money(subtotal, cur)}** |`);
if (contingency) L.push(`| Contingency (${g(contPct)}%) | | | | ${money(contingency, cur)} |`);
if (tax) L.push(`| Tax (${g(taxPct)}%) | | | | ${money(tax, cur)} |`);
L.push(`| **Total** | | | | **${money(total, cur)}** |`);
L.push("");
L.push("## Terms");
L.push("");
L.push(`**Revisions.** ${rounds} rounds are included, in this order:`);
L.push("");
L.push("1. Structure and story — after the first cut");
L.push("2. Polish — colour, music, graphics");
if (rounds >= 3) L.push("3. Final detail");
L.push("");
L.push("**Approval gates.** Script, rough cut, final. Work proceeds on written approval at "
  + "each gate.");
L.push("");
L.push("**Change orders.** Returning to an approved stage is a change order, quoted "
  + "separately before work resumes. In practice that means: changing the script after "
  + "lock, reshooting, re-ordering after picture lock, or adding versions and aspect "
  + "ratios not listed under Deliverables.");
if (extra) {
  L.push("");
  L.push(`An additional revision round beyond the included ${rounds}: `
    + `${money(Number(extra), cur)}.`);
}
L.push("");
if (rates.payment_terms) {
  L.push(`**Payment.** ${rates.payment_terms}`);
  L.push("");
}
L.push("## Not included");
L.push("");
const excl = [...(rates.exclusions || []), ...(shape.notes || [])];
for (const e of excl.length ? excl : ["—"]) L.push(`- ${e}`);
L.push("");

const text = L.join("\n");
if (opt("out")) {
  writeFileSync(opt("out"), text, "utf8");
  console.log(`wrote ${opt("out")}  (${money(total, cur)} total)`);
} else {
  console.log(text);
}

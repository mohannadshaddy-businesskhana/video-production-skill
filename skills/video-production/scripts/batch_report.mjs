#!/usr/bin/env node
/* batch_report.mjs — aggregate verify.mjs JSON reports into one morning summary.
 *
 *   node batch_report.mjs --reports reports/ --out run-log-summary.md
 *
 * The most useful number it produces is the repeat count per check: if the same
 * check failed across several videos, the fault is in the template, not in the
 * videos.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf("--" + n); return i === -1 ? undefined : argv[i + 1]; };

const dir = opt("reports");
if (!dir) { console.error("--reports is required"); process.exit(2); }

let files = [];
try {
  files = readdirSync(dir).filter((f) => extname(f) === ".json").sort()
    .map((f) => join(dir, f));
} catch { /* reported below */ }
if (!files.length) { console.log(`no reports in ${dir}`); process.exit(0); }

const rows = [], failCounter = new Map(), warnRows = [];
for (const f of files) {
  const stem = basename(f, ".json");
  let r;
  try { r = JSON.parse(readFileSync(f, "utf8")); }
  catch { rows.push([stem, "UNREADABLE", []]); continue; }
  const failed = r.failed || [];
  rows.push([stem, r.passed ? "PASS" : "FAIL", failed]);
  for (const c of failed) failCounter.set(c, (failCounter.get(c) || 0) + 1);
  for (const c of r.checks || []) if (c.warn) warnRows.push([stem, c.name, c.detail || ""]);
}

const passed = rows.filter(([, s]) => s === "PASS").length;
const total = rows.length;
// ties keep insertion order, the way Counter.most_common does
const ranked = [...failCounter.entries()].sort((a, b) => b[1] - a[1]);

const out = [];
out.push("# Batch summary\n");
out.push(`**${passed}/${total} passed**\n`);

out.push("\n## Per video\n");
out.push("| video | status | failed checks |");
out.push("|---|---|---|");
for (const [name, status, failed] of rows) {
  const mark = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  out.push(`| ${name} | ${mark} ${status} | ${failed.length ? failed.join(", ") : "—"} |`);
}

if (ranked.length) {
  out.push("\n## Repeat failures — read this first\n");
  out.push("| check | videos affected | verdict |");
  out.push("|---|---|---|");
  for (const [check, n] of ranked)
    out.push(`| ${check} | ${n} | ${n >= 3 ? "**TEMPLATE FAULT — fix the shared component**" : "isolated"} |`);
  const [worst, n] = ranked[0];
  if (n >= 3)
    out.push(`\n> ⛔ \`${worst}\` failed on ${n} videos. That is a shared-component `
      + `fault, not ${n} separate mistakes. Fix it once, then re-render `
      + `only the affected videos.\n`);
}

if (warnRows.length) {
  out.push("\n## Warnings — did not block delivery\n");
  out.push("| video | check | detail |");
  out.push("|---|---|---|");
  for (const [v, c, d] of warnRows.slice(0, 20)) out.push(`| ${v} | ${c} | ${d} |`);
}

out.push("\n## Not covered by any check — needs a human\n");
out.push("- Does the story land?");
out.push("- Does the sweep read as a showcase or as a list?");
out.push("- Is the claim right for this market?");
out.push("- Does the language sound native or translated?");
out.push("- Does each shape say what its caption says?");
out.push("\n*A video that passed every check can still be a weak video. "
  + "The checks prevent failure; they do not create quality.*");

const text = out.join("\n") + "\n";
if (opt("out")) {
  writeFileSync(opt("out"), text, "utf8");
  console.log(`wrote ${opt("out")}  (${passed}/${total} passed)`);
} else {
  console.log(text);
}

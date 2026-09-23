#!/usr/bin/env node
/* Turn a media ledger into a cue sheet and a licence audit.
 *
 *   node cue_sheet.mjs --ledger ledger.json --project "Name" --out cue-sheet.md
 *   node cue_sheet.mjs --ledger ledger.json --audit        # licence problems only
 *
 * A cue sheet is a deliverable in its own right: broadcasters and rights societies
 * ask for one, and a client who is buying a video is buying the right to use the
 * music in it. This reads the ledger `/media-use` writes when it resolves an asset,
 * and flags the three things that actually cause trouble:
 *
 *   · a non-commercial licence in a commercial piece
 *   · an attribution licence with no attribution recorded
 *   · an asset with no licence recorded at all
 *
 * A missing licence is not a formatting problem. It is the reason a video gets
 * pulled after it ships.
 */
import { readFileSync, writeFileSync } from "node:fs";

const NON_COMMERCIAL = ["nc", "noncommercial", "non-commercial", "cc-by-nc", "cc by-nc",
                        "research", "scientific", "personal"];
const ATTRIBUTION = ["by", "cc-by", "cc by", "attribution"];

const norm = (v) => String(v ?? "").trim().toLowerCase();
const today = () => new Date().toLocaleDateString("en-CA");

function load(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const key of ["assets", "entries", "ledger", "items"])
      if (key in raw && Array.isArray(raw[key])) return raw[key];
    const vals = Object.values(raw);
    return vals.every((v) => v && typeof v === "object" && !Array.isArray(v)) ? vals : [];
  }
  return raw;
}

function audit(rows) {
  const problems = [];
  for (const r of rows) {
    const name = r.name || r.id || r.path || "?";
    const lic = norm(r.licence || r.license);
    if (!lic) {
      problems.push(["no licence recorded", name,
                     "Resolve it again through the ledger, or remove the asset."]);
      continue;
    }
    if (NON_COMMERCIAL.some((t) => lic.includes(t))) {
      problems.push(["non-commercial licence", `${name} — ${lic}`,
                     "Cannot ship in client or paid work. Replace it."]);
    } else if (ATTRIBUTION.some((t) => lic.startsWith(t) || lic.includes(t))) {
      if (!(r.attribution || r.credit || r.author))
        problems.push(["attribution required, none recorded", `${name} — ${lic}`,
                       "Record the credit line the licence asks for."]);
    }
  }
  return problems;
}

function sheet(rows, project) {
  const L = [`# Cue sheet — ${project}`, "", `**Prepared:** ${today()}`, "",
             "| # | Asset | Type | Use | In | Out | Licence | Source | Credit |",
             "|---:|---|---|---|---|---|---|---|---|"];
  rows.forEach((r, i) => {
    L.push(`| ${i + 1} | ${r.name || r.id || ""} | ${r.type ?? ""} | ${r.use ?? "background"} `
      + `| ${r.in ?? ""} | ${r.out ?? ""} | ${r.licence || r.license || "⚠️ none"} `
      + `| ${r.source || r.provider || ""} | ${r.attribution || r.credit || r.author || ""} |`);
  });
  L.push("", `${rows.length} asset(s).`, "");

  const problems = audit(rows);
  if (problems.length) {
    L.push("## ⚠️ Licence problems", "", "| Problem | Asset | What to do |", "|---|---|---|");
    for (const [kind, name, fix] of problems) L.push(`| ${kind} | ${name} | ${fix} |`);
    L.push("");
  } else {
    L.push("All assets carry a recorded licence and any required credit.", "");
  }
  return [L.join("\n"), problems];
}

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf("--" + n); return i === -1 ? undefined : argv[i + 1]; };

if (!opt("ledger")) { console.error("--ledger is required"); process.exit(2); }

const rows = load(opt("ledger"));
if (!rows || !rows.length) {
  console.error("ledger is empty or in an unrecognised shape");
  process.exit(2);
}

if (argv.includes("--audit")) {
  const problems = audit(rows);
  if (!problems.length) {
    console.log(`${rows.length} asset(s) — no licence problems`);
    process.exit(0);
  }
  for (const [kind, name, fix] of problems)
    console.log(`FAIL  ${kind}: ${name}\n      ${fix}`);
  process.exit(1);
}

const [text, problems] = sheet(rows, opt("project") || "Untitled");
if (opt("out")) {
  writeFileSync(opt("out"), text, "utf8");
  console.log(`wrote ${opt("out")}  (${rows.length} assets, ${problems.length} problem(s))`);
} else {
  console.log(text);
}
process.exit(problems.length ? 1 : 0);

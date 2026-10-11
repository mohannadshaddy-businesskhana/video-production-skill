// After a fresh transcription of the same cut, word times move a little and spellings can change.
// Each "w:WORD>T" reference is moved to the nearest occurrence of its word within REACH_S; a
// reference with no such occurrence is left as is and reported (fix those scenes by hand).
// Usage: node snap_refs.mjs <work dir>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REACH_S = 1.5;
const dir = process.argv[2];
const fold = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/^(و|ف)?(ب|ل|ك)?(ال)?(?=.{3,})/u, "");
const words = JSON.parse(readFileSync(join(dir, "words_final.json"), "utf8")).segments.flatMap((s) => s.words);
const missing = [];
const spec = readFileSync(join(dir, "spec.json"), "utf8").replace(/"w:([^">]+)>([\d.]+)([+-][\d.]+)?"/g, (all, w, t, off) => {
  const near = words.filter((x) => fold(x.text) === fold(w) || fold(x.text).startsWith(fold(w)) || fold(w).startsWith(fold(x.text)) && fold(x.text).length > 2)
    .filter((x) => Math.abs(x.start - +t) <= REACH_S).sort((a, b) => Math.abs(a.start - +t) - Math.abs(b.start - +t))[0];
  if (!near) { missing.push(all); return all; }
  return `"w:${near.text.replace(/[^\p{L}\p{N}%,.-]/gu, "")}>${Math.max(0, near.start - 0.01).toFixed(2)}${off ?? ""}"`;
});
writeFileSync(join(dir, "spec.json"), spec);
console.log(missing.length ? `${missing.length} reference(s) without their word nearby:\n  ${[...new Set(missing)].join("\n  ")}` : "all references snapped");

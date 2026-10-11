// After a re-cut that only tightened pauses, the words are the same and only their times moved.
// Each "w:WORD>T±o" reference is resolved on the old timing to a word index, and rewritten to
// point at the same word on the new timing — a looser lookup picked the wrong occurrence in 6 of
// 422 references («2» matched «200,000»).
// Usage: node retime_spec.mjs <old words_final.json> <new words_final.json> <spec.json>
import { readFileSync, writeFileSync } from "node:fs";

const fold = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const [oldFile, newFile, specFile] = process.argv.slice(2);
const flat = (f) => JSON.parse(readFileSync(f, "utf8")).segments.flatMap((s) => s.words);
const before = flat(oldFile), after = flat(newFile);
// the same words, matched in order (LCS); a re-cut can keep a word the old cut lost, so the lists
// may differ by a few — 368 vs 371 on one take
function matchIndex(x, y) {
  const fx = x.map((w) => fold(w.text)), fy = y.map((w) => fold(w.text));
  const L = Array.from({ length: fx.length + 1 }, () => new Int32Array(fy.length + 1));
  for (let i = fx.length - 1; i >= 0; i--) for (let j = fy.length - 1; j >= 0; j--)
    L[i][j] = fx[i] === fy[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const map = new Map();
  for (let i = 0, j = 0; i < fx.length && j < fy.length;) {
    if (fx[i] === fy[j]) { map.set(i, j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return map;
}
const toNew = matchIndex(before, after);

// a word with no twin: shift it by the nearest matched neighbour's shift, take the word there
function nearestByNeighbours(i) {
  let k = 1;
  while (!toNew.has(i - k) && !toNew.has(i + k) && k < before.length) k++;
  const n = toNew.has(i - k) ? i - k : i + k;
  const t = before[i].start + (after[toNew.get(n)].start - before[n].start);
  return after.reduce((best, w) => (Math.abs(w.start - t) < Math.abs(best.start - t) ? w : best));
}
let moved = 0;
const spec = readFileSync(specFile, "utf8").replace(/"w:([^">]+)>([\d.]+)([+-][\d.]+)?"/g, (all, word, t, off) => {
  const i = before.findIndex((w) => w.start >= +t - 1e-6 && fold(w.text).startsWith(fold(word)));
  if (i < 0) throw new Error(`unresolved ${all}`);
  const w = toNew.has(i) ? after[toNew.get(i)] : nearestByNeighbours(i);
  moved++;
  // the reference takes the new word's own spelling: the two transcripts can spell it differently
  return `"w:${w.text.replace(/[^\p{L}\p{N}%,.-]/gu, "")}>${Math.max(0, w.start - 0.01).toFixed(2)}${off ?? ""}"`;
});
writeFileSync(specFile, spec);
console.log(`re-timed ${moved} references`);

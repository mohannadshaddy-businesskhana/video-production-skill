// Words the aligner could not place come out stacked on one instant ("على سبيل المثال في قسم
// المبيعات" all at 43.49): their captions flash for a frame and fail the reading-dwell check.
// Each run of stacked words is re-timed from what Groq heard between its neighbours — matched by
// spelling where Whisper heard the word, spread by letter count where it did not.
// Usage: node fill_collapsed.mjs <words_final.json> <groq.json>
import { readFileSync, writeFileSync } from "node:fs";

const MIN_RUN = 3, STACK_S = 0.03, EDGE_S = 0.3;
const [wordsFile, groqFile] = process.argv.slice(2);
const doc = JSON.parse(readFileSync(wordsFile, "utf8"));
const groq = JSON.parse(readFileSync(groqFile, "utf8")).words;
const words = doc.segments.flatMap((s) => s.words);
const fold = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/^(و|ف)?(ب|ل|ك)?(ال)?(?=.{3,})/u, "");

function runs() {
  const out = [];
  for (let i = 0; i < words.length;) {
    let j = i + 1;
    while (j < words.length && words[j].start - words[j - 1].start < STACK_S) j++;
    if (j - i >= MIN_RUN) out.push([i, j]);
    i = j;
  }
  return out;
}

// in-order matches of the run's words to the heard words (LCS on folded spelling)
function match(run, heard) {
  const a = run.map((w) => fold(w.text)), b = heard.map((w) => fold(w.word));
  const L = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const m = new Map();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { m.set(i, heard[j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return m;
}

function spread(list, from, to) {
  const len = list.map((w) => w.text.length + 2), total = len.reduce((x, y) => x + y, 0);
  let t = from;
  list.forEach((w, k) => { w.start = +t.toFixed(2); t += (to - from) * len[k] / total; w.end = +t.toFixed(2); });
}

let fixed = 0;
for (const [i, j] of runs()) {
  const lo = i > 0 ? words[i - 1].end - EDGE_S : 0;
  const hi = j < words.length ? words[j].start + EDGE_S : Infinity;
  const heard = groq.filter((w) => w.start >= lo && w.start < hi);
  const run = words.slice(i, j), m = match(run, heard);
  const from = Math.max(lo + EDGE_S, heard[0]?.start ?? lo + EDGE_S);
  const to = Math.min(hi - EDGE_S, heard.at(-1)?.end ?? hi - EDGE_S);
  // a heard word takes Whisper's time; the unheard ones between are spread over the gap
  let t = from, k = 0;
  for (const [idx, h] of m) {
    spread(run.slice(k, idx), t, Math.max(t, h.start));
    Object.assign(run[idx], { start: h.start, end: h.end });
    t = h.end; k = idx + 1;
  }
  spread(run.slice(k), t, Math.max(to, t + 0.25 * (run.length - k)));
  fixed += run.length;
  console.log(`${run[0].start.toFixed(2)}–${run.at(-1).end.toFixed(2)} ${run.length} words, ${m.size} heard`);
}
for (const s of doc.segments) { s.start = s.words[0].start; s.end = s.words.at(-1).end; }
writeFileSync(wordsFile, JSON.stringify(doc, null, 1));
console.log(`re-timed ${fixed} stacked words`);

// Last-resort timing: every word takes the time of the word Whisper heard in its place (in-order
// match on folded spelling), and the words Whisper missed are spread between their matched
// neighbours. Used where align_words left sentences overlapping each other on a damaged take
// (131735, review 1: a sentence started 2.7 s before the previous one ended).
// Usage: node groq_retime.mjs <words_final.json> <groq.json>
import { readFileSync, writeFileSync } from "node:fs";

const [wordsFile, groqFile] = process.argv.slice(2);
const doc = JSON.parse(readFileSync(wordsFile, "utf8"));
const heard = JSON.parse(readFileSync(groqFile, "utf8")).words;
const words = doc.segments.flatMap((s) => s.words);
const fold = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/^(و|ف)?(ب|ل|ك)?(ال)?(?=.{3,})/u, "");

const a = words.map((w) => fold(w.text)), b = heard.map((w) => fold(w.word));
const L = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
  L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
const anchor = new Map();
for (let i = 0, j = 0; i < a.length && j < b.length;) {
  if (a[i] && a[i] === b[j]) { anchor.set(i, heard[j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
}

const keys = [...anchor.keys()];
for (const [i, h] of anchor) Object.assign(words[i], { start: h.start, end: h.end });
for (let k = 0; k <= keys.length; k++) {
  const lo = k ? keys[k - 1] : -1, hi = k < keys.length ? keys[k] : words.length;
  const gap = words.slice(lo + 1, hi);
  if (!gap.length) continue;
  const from = lo >= 0 ? words[lo].end : Math.max(0, words[hi].start - 0.3 * gap.length);
  const to = hi < words.length ? words[hi].start : from + 0.3 * gap.length;
  const len = gap.map((w) => w.text.length + 2), total = len.reduce((x, y) => x + y, 0);
  let t = from;
  gap.forEach((w, n) => { w.start = +t.toFixed(2); t += (to - from) * len[n] / total; w.end = +t.toFixed(2); });
}
for (const s of doc.segments) { s.start = s.words[0].start; s.end = s.words.at(-1).end; }
writeFileSync(wordsFile, JSON.stringify(doc, null, 1));
console.log(`${anchor.size} of ${words.length} words on Whisper's clock, the rest spread between them`);

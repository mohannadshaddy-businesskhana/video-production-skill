// The edited take's transcript without a second transcription: the words are the raw take's minus
// the cuts, so plan_cuts' re-timed words (words_edit.json) are grouped back into their sentences.
// align_words.mjs then places them on the cut audio. Saves the Gemini quota (20 a day a model) for
// the raw takes, where nothing else knows the words.
// Usage: node remap_transcript.mjs <words_edit.json> <out transcript.json> [edit.json]
//   edit.json drop_text: sentence openings the cut removed but the raw times placed outside it
//   ("للأسف..." sat 2.5s early on one take) — written down so a re-run keeps the fix
import { readFileSync, writeFileSync } from "node:fs";

const [wordsFile, out, editFile] = process.argv.slice(2);
const drop = editFile ? JSON.parse(readFileSync(editFile, "utf8")).drop_text || [] : [];
const words = JSON.parse(readFileSync(wordsFile, "utf8"));
const bySeg = new Map();
for (const w of words) {
  if (!bySeg.has(w.seg)) bySeg.set(w.seg, []);
  bySeg.get(w.seg).push(w);
}
const segments = [...bySeg.values()].filter((ws) => !drop.some((d) => ws.map((w) => w.text).join(" ").startsWith(d))).map((ws) => ({
  start: ws[0].start, end: ws[ws.length - 1].end,
  // a sentence the cut opened mid-way loses its leading "..." marks; its words stay as spoken
  text: ws.map((w) => w.text).join(" ").replace(/\s*\.\.\.\s*/g, " ").replace(/\s+/g, " ").trim(),
}));
writeFileSync(out, JSON.stringify({ segments }, null, 1));
console.log(`${segments.length} sentences, ${words.length} words`);

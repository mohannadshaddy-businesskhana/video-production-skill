// Do the captions say what is heard when they say it? Each aligned sentence is compared with the
// words Groq Whisper heard in the same window (±0.6s). Whisper's words can be wrong, so the bar is
// low: a sentence with almost nothing in common with what was heard there is misplaced or not in
// the audio at all — one cut sentence survived a re-mapped transcript that way.
// Usage: node caption_check.mjs <words_final.json> <groq.json>   (exit 1 if any sentence fails)
import { readFileSync } from "node:fs";

const PAD_S = 0.6, MIN_SHARED = 0.2, MIN_WORDS = 3;
// same folding as align_words.mjs: letter forms, then leading clitics
const fold = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/^(و|ف)?(ب|ل|ك)?(ال)?(?=.{3,})/u, "");

const [finalFile, groqFile] = process.argv.slice(2);
const segs = JSON.parse(readFileSync(finalFile, "utf8")).segments;
const heard = JSON.parse(readFileSync(groqFile, "utf8")).words.map((w) => ({ ...w, f: fold(w.word) }));
const bad = [];
for (const s of segs) {
  const ours = s.words.map((w) => fold(w.text)).filter((w) => w.length > 1);
  if (ours.length < MIN_WORDS) continue;
  const near = new Set(heard.filter((h) => h.end >= s.start - PAD_S && h.start <= s.end + PAD_S).map((h) => h.f));
  const shared = ours.filter((w) => near.has(w)).length / ours.length;
  if (shared < MIN_SHARED) bad.push(`${s.start.toFixed(1)}s ${(shared * 100).toFixed(0)}% "${s.text.slice(0, 50)}"`);
}
console.log(bad.length ? `MISPLACED ${bad.length}/${segs.length}:\n  ${bad.join("\n  ")}` : `captions match what is heard (${segs.length} sentences)`);
process.exit(bad.length ? 1 : 0);

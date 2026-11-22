// Several raw takes of one talk as one short text, so the edit decision can choose the best
// version of each sentence across takes, not only inside one take. Each line is a phrase broken
// on a pause, with its raw-take time. A phrase that repeats an earlier one is marked: ↺ when it
// is a restart inside the same take (keep the last complete version, #66.5), ≈ when the same
// sentence is in another take (an alternative to choose from). After browser-use/video-use's
// takes_packed.md.
// Usage: node pack_takes.mjs <out.md> <work/a> [<work/b> ...]   (each dir holds words.json from prep.sh)
// Then: write edit.json per take as usual; a sentence from another take comes in with prepend.mjs /
// append.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const PHRASE_GAP_S = 0.5;   // a pause this long ends a phrase — the shortest that reads as a breath, not a stall
// A repeat shares most of the shorter phrase's words and its first two. Matching on the opening
// alone marked every item of a spoken list ("لو عايز تزود ...") as a restart of the one before.
const REPEAT_OVERLAP = 0.7, MIN_WORDS = 3;

// one spelling per word, so a restart written with أ / ا or ة / ه by the transcriber still matches
const norm = (w) => w.replace(/[ً-ْـ.,،؟?!:"'«»…]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();

function phrases(words) {
  const out = [];
  for (const w of words) {
    const last = out[out.length - 1];
    if (last && w.start - last.end < PHRASE_GAP_S && w.seg === last.seg) { last.words.push(w.text); last.end = w.end; }
    else out.push({ start: w.start, end: w.end, seg: w.seg, words: [w.text], gap: last ? w.start - last.end : 0 });
  }
  return out;
}

function readTake(dir, label) {
  const segments = JSON.parse(readFileSync(join(dir, "words.json"), "utf8")).segments;
  const words = segments.flatMap((s, seg) => s.words.filter((w) => w.start != null).map((w) => ({ ...w, seg })));
  return { label, name: basename(dir), phrases: phrases(words) };
}

function overlap(a, b) {
  if (a.norm[0] !== b.norm[0] || a.norm[1] !== b.norm[1]) return 0;
  const [short, long] = a.norm.length <= b.norm.length ? [a, b] : [b, a];
  const pool = new Set(long.norm);
  return short.norm.filter((w) => pool.has(w)).length / short.norm.length;
}

function markRepeats(takes) {
  const earlier = [];
  for (const t of takes) t.phrases.forEach((p, i) => {
    p.id = `${t.label}${i + 1}`;
    p.take = t.label;
    p.norm = p.words.map(norm).filter(Boolean);
    if (p.norm.length < MIN_WORDS) return;
    let best = null, score = REPEAT_OVERLAP;
    for (const q of earlier) { const o = overlap(p, q); if (o >= score) { best = q; score = o; } }
    if (best) p.repeatOf = best;
    earlier.push(p);
  });
}

function line(p) {
  const pause = p.gap >= 1 ? `  ·${p.gap.toFixed(1)}s` : "";
  const r = p.repeatOf;
  const repeat = !r ? "" : r.take === p.take ? `  ↺ restart of ${r.id}` : `  ≈ ${r.id}`;
  return `${p.id} [${p.start.toFixed(2)}–${p.end.toFixed(2)}] ${p.words.join(" ")}${pause}${repeat}`;
}

function main() {
  const [out, ...dirs] = process.argv.slice(2);
  if (!out || !dirs.length) { console.error("usage: pack_takes.mjs <out.md> <work/a> [<work/b> ...]"); process.exit(2); }
  const takes = dirs.map((d, i) => readTake(d, String.fromCharCode(65 + i)));
  markRepeats(takes);
  const md = takes.map((t) => `## ${t.label} — ${t.name}\n\n${t.phrases.map(line).join("\n")}\n`).join("\n");
  writeFileSync(out, `# Takes, packed\n\nTimes are raw-take seconds. ↺ a restart inside the take · ≈ the same sentence in an earlier take · ·Ns a long pause before.\n\n${md}`);
  const n = takes.reduce((s, t) => s + t.phrases.length, 0);
  const repeats = takes.reduce((s, t) => s + t.phrases.filter((p) => p.repeatOf).length, 0);
  console.log(JSON.stringify({ out, takes: takes.length, phrases: n, repeats, bytes: Buffer.byteLength(md) }));
}

main();

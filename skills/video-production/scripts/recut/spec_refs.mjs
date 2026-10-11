// Every "w:WORD>T" reference in a spec must still point at that word, near T, on the current
// timing. After a re-cut removes words, retime_spec.mjs maps their references to a neighbour —
// this lists every reference whose word is gone or far, so the scene can be fixed by hand.
// Usage: node spec_refs.mjs <work dir>   (exit 1 if any reference is broken)
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FAR_S = 0.6;
const dir = process.argv[2];
const fold = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const words = JSON.parse(readFileSync(join(dir, "words_final.json"), "utf8")).segments.flatMap((s) => s.words);
const spec = readFileSync(join(dir, "spec.json"), "utf8");
let bad = 0;
for (const ref of new Set(spec.match(/"w:[^"]+"/g) || [])) {
  const [, w, t] = /^"w:([^">]+)>([\d.]+)/.exec(ref);
  const hit = words.find((x) => x.start >= +t - 1e-6 && fold(x.text).startsWith(fold(w)));
  if (!hit || hit.start - +t > FAR_S) { bad++; console.log(`${ref} → ${hit ? hit.start.toFixed(2) : "gone"}`); }
}
const end = JSON.parse(spec).end, last = words.at(-1);
console.log(bad ? `${bad} broken reference(s)` : "references resolve", `· end ${end} · last word ends ${last.end}`);
process.exit(bad ? 1 : 0);

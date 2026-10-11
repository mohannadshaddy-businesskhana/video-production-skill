// Verbatim Egyptian-Arabic transcript, sentence by sentence, from Gemini. Whisper (Groq) turned a
// 30s stretch of the pilot into invented words and rewrote the dialect as MSA; Gemini did not.
// Timings here are approximate — align_words.mjs places them on the real pauses.
//
// Long takes are sent in pieces cut at the quietest moment near every CHUNK_S seconds: on a 110s
// take one request returned segments running backwards ("114.3-77.1"), and a model clock drifts
// after ~50s even inside a piece; 25s pieces keep it.
// Usage: node transcribe_gemini.mjs <audio> <out.json> --key-file <.env with GEMINI_API_KEY=>
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ask, keyFrom } from "./gemini.mjs";

const CHUNK_S = 25, SEARCH_S = 6;
const PROMPT = `This is a talking-head video in Egyptian Arabic (عامية مصرية) about business and e-commerce.
Transcribe it VERBATIM exactly as spoken, in Egyptian dialect spelling (do not convert to Modern Standard Arabic, do not fix grammar, do not summarize).
Keep English words the speaker says in English (e.g. COD, SKU) in Latin letters. Write a number the speaker says as digits.
Keep false starts and repeated words as spoken, marking an abandoned phrase with "..." — the editor needs to see them.
Split into sentences of roughly 2-7 seconds. Give each sentence start and end in seconds from the start of THIS audio, as precise as you can.
Return JSON only: {"segments":[{"start":number,"end":number,"text":string}]}`;

const durationS = (f) => +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout;

// cut points: the quietest 0.3s within ±SEARCH_S of each multiple of CHUNK_S — a fixed silence
// threshold found no pause near 40s on one take and left an 81s piece whose clock drifted again
function cutPoints(audio, total) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", audio, "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], { maxBuffer: 2 ** 30 });
  const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const win = 2400, hop = 400;
  const energy = (i) => { let e = 0; for (let k = i; k < i + win && k < pcm.length; k++) e += pcm[k] * pcm[k]; return e; };
  const cuts = [0];
  for (let target = CHUNK_S; target < total - CHUNK_S / 2; target += CHUNK_S) {
    let best = target * 8000, bestE = Infinity;
    for (let i = (target - SEARCH_S) * 8000; i < (target + SEARCH_S) * 8000; i += hop) { const e = energy(i); if (e < bestE) { bestE = e; best = i; } }
    cuts.push(+((best + win / 2) / 8000).toFixed(2));
  }
  return [...cuts, total];
}

function piece(audio, a, b) {
  return spawnSync("ffmpeg", ["-v", "error", "-ss", String(a), "-t", String(b - a), "-i", audio, "-ac", "1", "-ar", "16000", "-f", "mp3", "-"],
    { maxBuffer: 1e8 }).stdout.toString("base64");
}

const args = process.argv.slice(2);
const [audio, out] = args;
const ki = args.indexOf("--key-file");
const key = ki >= 0 ? keyFrom(args[ki + 1]) : process.env.GEMINI_API_KEY;
const cuts = cutPoints(audio, durationS(audio));
const segments = [];
for (let i = 0; i + 1 < cuts.length; i++) {
  const [a, b] = [cuts[i], cuts[i + 1]];
  const { text, model } = await ask(key, [{ inline_data: { mime_type: "audio/mp3", data: piece(audio, a, b) } }, { text: PROMPT }], { json: true });
  for (const s of JSON.parse(text).segments)
    segments.push({ start: +(a + Math.max(0, s.start)).toFixed(2), end: +(a + Math.min(b - a, s.end)).toFixed(2), text: s.text });
  console.error(`piece ${i + 1}/${cuts.length - 1} ${a.toFixed(1)}-${b.toFixed(1)}s with ${model}`);
}
writeFileSync(out, JSON.stringify({ segments }, null, 1));
for (const s of segments) console.log(`${s.start.toFixed(1)}-${s.end.toFixed(1)}: ${s.text}`);

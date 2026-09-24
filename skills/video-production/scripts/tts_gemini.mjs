#!/usr/bin/env node
/* Narration from Gemini's TTS — one audio file per line, with measured timings.
 *
 *   node tts_gemini.mjs --lines narration.json --out voice/gemini-kore [--voice Kore] [--gap 0.35]
 *   node tts_gemini.mjs --voices ar-EG          # the voices the library has for a language
 *
 * Why this exists: the local engine has no Arabic, and a voice-led type —
 * whiteboard, captions, explainer — cannot be faked. Gemini's TTS speaks
 * Egyptian Arabic, and its flash models are on the API's free tier.
 *
 * Why one request per line: the model returns no word timings, and a
 * whiteboard needs to know WHEN each thing is said so the hand draws it then.
 * Each line generated on its own has an exact start and end for free: its
 * duration is measured from the audio, and the lines are joined with a fixed
 * gap. timings.json records both, and the composition's beats come from it —
 * the voice sets the timing, never an estimate.
 *
 * The key: GEMINI_API_KEY in the environment, or --key-file <path> (a file
 * holding the key, or a .env line GEMINI_API_KEY=...). It is never printed.
 * Cost: free on the free tier; a key whose Google project has billing enabled
 * is billed at the paid rate instead — check which kind of key you pass.
 *
 * Requires: Node 18+. No packages.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const API = "https://generativelanguage.googleapis.com/v1beta";
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf("--" + n); return i === -1 ? d : argv[i + 1]; };

function readKey() {
  const file = flag("key-file");
  if (file) {
    const txt = readFileSync(file, "utf8");
    const m = txt.match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\s]+)/m);
    const key = m ? m[1] : txt.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
    if (key) return key;
  }
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  console.error("no key: set GEMINI_API_KEY or pass --key-file <path>");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(path, init, tries = 5) {
  for (let t = 0; ; t++) {
    const r = await fetch(API + path, init);
    if (r.ok) return r.json();
    const body = await r.text();
    // the free tier answers a burst with 429; wait it out rather than fail the batch
    if ((r.status === 429 || r.status >= 500) && t < tries - 1) { await sleep(2000 * 2 ** t); continue; }
    throw new Error(`${r.status} ${body.slice(0, 400)}`);
  }
}

/* the audio sits at output_audio.data in the interaction; look for it rather
   than trust one exact nesting, so a wrapper object does not break the tool */
function findAudio(o) {
  if (!o || typeof o !== "object") return null;
  if (o.output_audio && o.output_audio.data) return o.output_audio;
  for (const v of Object.values(o)) { const f = findAudio(v); if (f) return f; }
  return null;
}

/* a WAV's PCM and format, read from its chunks — not from a fixed 44-byte header */
function parseWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE")
    throw new Error("not a WAV file");
  let fmt = null, data = null;
  for (let p = 12; p + 8 <= buf.length;) {
    const id = buf.toString("ascii", p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { channels: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12),
                               bits: buf.readUInt16LE(p + 22) };
    if (id === "data") data = buf.subarray(p + 8, Math.min(buf.length, p + 8 + size));
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAV without fmt or data chunk");
  return { ...fmt, pcm: data };
}

function wav({ channels, rate, bits }, pcm) {
  const h = Buffer.alloc(44), block = channels * bits / 8;
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * block, 28); h.writeUInt16LE(block, 32);
  h.writeUInt16LE(bits, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const key = readKey();
const headers = { "x-goog-api-key": key, "Content-Type": "application/json" };

if (argv.includes("--voices")) {
  const lang = flag("voices") || "ar-EG";
  const res = await call(`/voices?language_code=${encodeURIComponent(lang)}`, { headers });
  const list = res.voices || res.items || [];
  for (const v of list)
    console.log([v.name || v.id, v.displayName, v.gender, v.accent, v.languageCode || v.language_code,
                 v.persona].filter(Boolean).join(" · "));
  console.log(`${list.length} voice(s) for ${lang}`);
  process.exit(0);
}

const linesPath = flag("lines"), out = flag("out");
if (!linesPath || !out) {
  console.error("usage: tts_gemini.mjs --lines narration.json --out <dir> [--voice Kore] [--style ...] "
    + "[--model gemini-3.8-flash-tts] [--gap 0.35] [--key-file <path>]\n       tts_gemini.mjs --voices ar-EG");
  process.exit(2);
}
const N = JSON.parse(readFileSync(linesPath, "utf8"));
const voice = flag("voice", "Kore"), model = flag("model", "gemini-3.8-flash-tts");
const style = flag("style", N.style || ""), gap = Number(flag("gap", "0.35"));
mkdirSync(out, { recursive: true });

let format = null, t = 0;
const pcms = [], rows = [];
for (const [i, line] of N.lines.entries()) {
  const content = { type: "text", text: line.text };
  if (style) content.annotations = [{ type: "speech_metadata", style }];
  const res = await call("/interactions", {
    method: "POST", headers,
    body: JSON.stringify({ model, input: [{ type: "user_input", content: [content] }],
                           response_format: { type: "audio" },
                           generation_config: { speech_config: [{ voice }] } }),
  });
  const audio = findAudio(res);
  if (!audio) throw new Error(`${line.id}: no audio in the response`);
  const w = parseWav(Buffer.from(audio.data, "base64"));
  if (format && (w.rate !== format.rate || w.channels !== format.channels || w.bits !== format.bits))
    throw new Error(`${line.id}: audio format changed between lines`);
  format = format || w;
  const file = `${line.id}.wav`, dur = w.pcm.length / (w.rate * w.channels * w.bits / 8);
  writeFileSync(join(out, file), wav(w, w.pcm));
  rows.push({ id: line.id, text: line.text, file, duration: +dur.toFixed(3),
              start: +t.toFixed(3), end: +(t + dur).toFixed(3) });
  pcms.push(w.pcm);
  t += dur;
  if (i < N.lines.length - 1) {
    const g = Buffer.alloc(Math.round(gap * w.rate) * w.channels * w.bits / 8);
    pcms.push(g); t += gap;
  }
  console.log(`${line.id}  ${dur.toFixed(2)}s  ${line.text}`);
  await sleep(1200);                      // stay inside the free tier's per-minute limit
}
writeFileSync(join(out, "narration.wav"), wav(format, Buffer.concat(pcms)));
writeFileSync(join(out, "timings.json"), JSON.stringify({
  source: "gemini", model, voice, style, gap, sample_rate: format.rate,
  total: +t.toFixed(3), lines: rows }, null, 2) + "\n");
console.log(`\n${rows.length} line(s), ${t.toFixed(2)}s → ${join(out, "narration.wav")} + timings.json`);

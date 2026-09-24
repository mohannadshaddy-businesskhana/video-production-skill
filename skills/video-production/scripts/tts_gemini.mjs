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

/* The key, from the environment or a file. A .env file is read for ONE named
 * variable (--key-var, default GEMINI_API_KEY) and nothing else: taking "the
 * first line" of a .env would send some other secret to Google as a key. A
 * bare file (no KEY=VALUE lines) is taken as the key itself. Either way the
 * value is checked for the shape of a Google API key before it is used. */
function readKey() {
  const file = flag("key-file"), name = flag("key-var", "GEMINI_API_KEY");
  let key = null;
  if (file) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.some((l) => /^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(l))) {
      const hit = lines.find((l) => new RegExp(`^${name}\\s*=`).test(l));
      if (!hit) { console.error(`${file} has no ${name}= line`); process.exit(2); }
      key = hit.slice(hit.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
    } else if (lines.length === 1) key = lines[0];
  } else key = process.env[name] || process.env.GEMINI_API_KEY || null;
  if (!key) { console.error("no key: set GEMINI_API_KEY or pass --key-file <path> [--key-var NAME]"); process.exit(2); }
  if (!/^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
    console.error("that value does not have the shape of a Google API key — refusing to send it");
    process.exit(2);
  }
  return key;
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

/* The docs put the audio at output_audio.data; the live API (2026-09) returns
   it as a content part — steps[].content[] = {type:"audio", mime_type, data}.
   Look for either rather than trust one exact nesting. */
function findAudio(o) {
  if (!o || typeof o !== "object") return null;
  if (o.output_audio && o.output_audio.data) return o.output_audio;
  if (typeof o.data === "string" && (o.type === "audio" || /^audio\//.test(o.mime_type || ""))) return o;
  for (const v of Object.values(o)) { const f = findAudio(v); if (f) return f; }
  return null;
}

/* a response's structure without its payload: keys, types, short strings */
function shape(o, depth = 0) {
  if (depth > 6) return "…";
  if (Array.isArray(o)) return `[${o.slice(0, 3).map((v) => shape(v, depth + 1)).join(", ")}${o.length > 3 ? ", …" : ""}]`;
  if (o && typeof o === "object")
    return `{${Object.entries(o).map(([k, v]) => `${k}: ${shape(v, depth + 1)}`).join(", ")}}`;
  if (typeof o === "string") return o.length > 40 ? `"${o.slice(0, 20)}…"(${o.length})` : JSON.stringify(o);
  return String(o);
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
} else await synthesize();

// no process.exit(): on Windows, exiting while fetch closes its socket trips a libuv assertion
async function synthesize() {

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

/* --whole: the free tier allows about ten TTS requests a DAY per project, so
 * one request per line spends a day's quota on a single narration. This asks
 * for all the lines in ONE request, joined by the model's own <long pause>
 * tag, and writes one take; voice_timings.mjs then splits it at those pauses
 * into the same per-line timings. */
if (argv.includes("--whole")) {
  const content = { type: "text", text: N.lines.map((l) => l.text).join(" <long pause> ") };
  if (style) content.annotations = [{ type: "speech_metadata", style }];
  const res = await call("/interactions", {
    method: "POST", headers,
    body: JSON.stringify({ model, input: [{ type: "user_input", content: [content] }],
                           response_format: { type: "audio" },
                           generation_config: { speech_config: [{ voice }] } }),
  });
  const audio = findAudio(res);
  if (!audio) throw new Error(`no audio in the response — its shape: ${shape(res)}`);
  const w = parseWav(Buffer.from(audio.data, "base64"));
  writeFileSync(join(out, "take.wav"), wav(w, w.pcm));
  const dur = w.pcm.length / (w.rate * w.channels * w.bits / 8);
  console.log(`${N.lines.length} line(s) in one take, ${dur.toFixed(2)}s → ${join(out, "take.wav")}`);
  console.log(`next: voice_timings.mjs --lines ${linesPath} --in ${join(out, "take.wav")} --out <dir>`);
  return;
}

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
  if (!audio) throw new Error(`${line.id}: no audio in the response — its shape: ${shape(res)}`);
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
}

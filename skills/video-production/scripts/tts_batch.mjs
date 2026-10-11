#!/usr/bin/env node
/* tts_batch.mjs — narration for a whole batch of videos on a free tier: grouped requests, a fallback
 * chain of models, and a listening check on every line. references/arabic-voice.md is the method.
 *
 *   node tts_batch.mjs --jobs jobs.json --cache voice-cache [--voice Iapetus] [--group 5] [--dry | --check]
 *
 * jobs.json: [{ "id": "S-02", "lines": ["<spoken text, fully diacritized>", …] }, …]
 *   the SPOKEN form — tashkeel, pause form, numbers in words (arabic-voice.md §1), never the caption.
 * Output per line: <cache>/<sha1(voice+model+text)>.wav + .json ([[start, dur, word], …] for captions),
 * and <cache>/index.json: { "<video id>": { "model", "keys": { "<text>": "<key>" } } } — PER VIDEO, because a line
 * shared by two videos («تجدها في هوامش») can be voiced on two models; keyed by text it would mix voices (#71).
 *
 * Why grouped: the free tier is ~10 requests/day PER MODEL (measured Oct 2026), so a request carries
 * several videos' lines; voice_timings.mjs splits the take back into lines. One or two lines → one
 * request per line (no split, nothing can move). A 429 retires a model for the run and the next one in
 * MODELS takes over; a video stays on ONE model start to finish (failure-log #71).
 * The key: GEMINI_API_KEY from the environment, else (Windows) from HKCU\Environment, so a key set with
 * [Environment]::SetEnvironmentVariable(…,'User') works without restarting the app. Never printed.
 * Requires: Node 18+, ffmpeg. No packages.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const VT = join(HERE, "voice_timings.mjs");
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf("--" + n); return i === -1 ? d : argv[i + 1]; };
const API = "https://generativelanguage.googleapis.com/v1beta";

export const MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts"];
const LISTENERS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest",
  "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
const VOICE = flag("voice", "Iapetus");
const CACHE = resolve(flag("cache", "voice-cache"));
const G = Number(flag("group", 5));

// both key shapes Google issues: AIza… (39) and AQ.… (53)
function apiKey() {
  let k = process.env.GEMINI_API_KEY;
  if (!k && process.platform === "win32") {
    const r = spawnSync("reg", ["query", "HKCU\\Environment", "/v", "GEMINI_API_KEY"], { encoding: "utf8" });
    const m = (r.stdout || "").match(/GEMINI_API_KEY\s+REG_\w+\s+(\S+)/); k = m && m[1];
  }
  k = (k || "").trim();
  if (!/^(AIza[0-9A-Za-z_-]{35}|AQ\.[0-9A-Za-z_.-]{40,})$/.test(k)) throw new Error("no usable GEMINI_API_KEY (expected AIza… or AQ.…)");
  return k;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wav = (pcm, rate = 24000) => {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};
let requests = 0;
async function synth(model, text) {
  // narration only: gemini-3.8-flash-tts reads any instruction in the text aloud (failure-log #70)
  const body = JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } });
  for (let t = 0; t < 4; t++) {
    const r = await fetch(`${API}/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": apiKey(), "Content-Type": "application/json" }, body });
    if (r.ok) {
      const part = (await r.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error("no audio in the response");
      requests++; return Buffer.from(part.inlineData.data, "base64");
    }
    const msg = (await r.text()).slice(0, 300);
    if (r.status >= 500) { await sleep(3000 * 2 ** t); continue; }
    throw new Error(`${r.status} ${msg}`);
  }
  throw new Error("server kept failing");
}

const keyOf = (text, model) => createHash("sha1").update(VOICE + model + text).digest("hex").slice(0, 16);
const has = (k) => existsSync(join(CACHE, k + ".wav")) && existsSync(join(CACHE, k + ".json"));
const bare = (s) => s.replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);

function split(takeOrDir, lines, model, work) {
  mkdirSync(work, { recursive: true });
  const nar = join(work, "narration.json");
  writeFileSync(nar, JSON.stringify({ lines: lines.map((text) => ({ id: "k" + keyOf(text, model), text })) }), "utf8");
  const r = spawnSync("node", [VT, "--lines", nar, "--in", takeOrDir, "--out", join(work, "vt"), "--words", "--gap", "0.3"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("voice_timings failed: " + (r.stderr || r.stdout).slice(-500));
  for (const row of JSON.parse(readFileSync(join(work, "vt", "timings.json"), "utf8")).lines) {
    const k = row.id.slice(1);
    copyFileSync(join(work, "vt", row.file), join(CACHE, k + ".wav"));
    writeFileSync(join(CACHE, k + ".json"), JSON.stringify((row.words || []).map((w) => [+(w.start - row.start).toFixed(3), +(w.end - w.start).toFixed(3), w.w])));
  }
}

// every line transcribed and compared word for word; null = nobody listened (reported as UNCHECKED, never as passed)
const retiredListeners = new Set();
async function listen(keys, texts) {
  const parts = [{ text: `These are ${keys.length} short Arabic speech clips, in order. Transcribe each exactly as spoken, word for word, `
    + `without correcting or completing anything. Return ONLY a JSON array of ${keys.length} strings.` }];
  for (const k of keys) parts.push({ inline_data: { mime_type: "audio/wav", data: readFileSync(join(CACHE, k + ".wav")).toString("base64") } });
  const body = JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0 } });
  for (const m of [...LISTENERS, ...LISTENERS]) {
    if (retiredListeners.has(m)) continue;
    let r; try { r = await fetch(`${API}/models/${m}:generateContent`, { method: "POST", headers: { "x-goog-api-key": apiKey(), "Content-Type": "application/json" }, body }); }
    catch { await sleep(3000); continue; }
    if (r.status === 429 || r.status === 404) { retiredListeners.add(m); continue; }   // its own quota is spent / not on this account
    if (!r.ok) { await sleep(4000); continue; }                                           // overloaded: try later in the list
    const raw = ((await r.json()).candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    let heard = null;
    try { heard = JSON.parse(raw); } catch { const mm = raw.match(/\[[\s\S]*\]/); try { heard = mm && JSON.parse(mm[0]); } catch {} }
    if (!Array.isArray(heard) || heard.length !== keys.length) continue;
    return keys.map((k, i) => {
      const want = bare(texts[i]), got = bare(String(heard[i] || ""));
      const missing = want.filter((w) => !got.some((g) => g === w || g.includes(w) || w.includes(g)));
      const extra = got.filter((g) => !want.some((w) => g === w || g.includes(w) || w.includes(g)));
      return { key: k, ok: !missing.length && extra.length <= 1, missing, extra, heard: heard[i] };
    });
  }
  return null;
}

const retired = new Set();
const quota = (e) => /\b429\b/.test(e.message);
const index = existsSync(join(CACHE, "index.json")) ? JSON.parse(readFileSync(join(CACHE, "index.json"), "utf8")) : {};
const saveIndex = () => writeFileSync(join(CACHE, "index.json"), JSON.stringify(index, null, 1), "utf8");
const report = { checked: [], unchecked: [], flagged: [] };

async function oneLine(text, model, work) {
  const dir = join(work, "one-" + keyOf(text, model)); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "k" + keyOf(text, model) + ".wav"), wav(await synth(model, text)));
  split(dir, [text], model, join(work, "o" + keyOf(text, model)));
}
async function verify(job, model, work) {
  for (let round = 0; round < 3; round++) {
    const keys = job.lines.map((t) => keyOf(t, model));
    const res = await listen(keys, job.lines);
    if (!res) { console.log(`${job.id}: ⚠ UNCHECKED — no listening model answered (${model})`); report.unchecked.push(job.id); return true; }
    const bad = res.filter((r) => !r.ok);
    for (const b of bad) console.log(`  ✗ ${job.id}: missing [${b.missing.join(" ")}] extra [${b.extra.join(" ")}]  heard: ${b.heard}`);
    if (!bad.length) { console.log(`${job.id}: ✓ ${job.lines.length} line(s) on ${model}, heard as written`); report.checked.push(job.id); return true; }
    if (round === 2) { report.flagged.push({ id: job.id, lines: bad }); console.log(`${job.id}: ${bad.length} line(s) still differ — flagged for a listen`); return true; }
    for (const b of bad) {
      const text = job.lines[keys.indexOf(b.key)];
      try { await oneLine(text, model, work); } catch (e) { if (quota(e)) return false; throw e; }
    }
  }
  return true;
}
async function group(jobs) {
  for (const model of MODELS) {
    if (retired.has(model)) continue;
    const work = join(CACHE, "work", jobs.map((j) => j.id).join("_") + "-" + model);
    rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
    const lines = jobs.flatMap((j) => j.lines);
    try {
      if (lines.length <= 2) for (const t of lines) await oneLine(t, model, work);
      else { const take = join(work, "take.wav"); writeFileSync(take, wav(await synth(model, lines.join("\n\n")))); split(take, lines, model, work); }
    } catch (e) { if (quota(e)) { console.log(`  ${model}: quota reached — next model`); retired.add(model); continue; } throw e; }
    const moveOn = [];
    for (const j of jobs) {
      if (await verify(j, model, work)) index[j.id] = { model, keys: Object.fromEntries(j.lines.map((t) => [t, keyOf(t, model)])) };
      else moveOn.push(j);
    }
    saveIndex();
    if (moveOn.length) { retired.add(model); console.log(`  ${moveOn.map((j) => j.id).join(" ")} → next model (one voice per video)`); return group(moveOn); }
    return;
  }
  throw new Error("QUOTA: every model in the chain is spent for today — " + jobs.map((j) => j.id).join(" "));
}

const jobsPath = flag("jobs");
if (!jobsPath) { console.error("usage: tts_batch.mjs --jobs jobs.json --cache <dir> [--voice Iapetus] [--group 5] [--dry | --check]"); process.exit(2); }
mkdirSync(CACHE, { recursive: true });
const jobs = JSON.parse(readFileSync(jobsPath, "utf8")).map((j) => ({ id: j.id, lines: [...new Set(j.lines)] }));

if (argv.includes("--check")) {
  for (const j of jobs) {
    const e = index[j.id], done = e ? j.lines.filter((t) => e.keys[t] && has(e.keys[t])) : [];
    const res = await listen(done.map((t) => e.keys[t]), done);
    console.log(`${j.id}: ${!res ? "⚠ UNCHECKED" : res.every((r) => r.ok) ? `✓ ${res.length} heard as written` : `✗ ${res.filter((r) => !r.ok).length} differ`}`);
  }
} else {
  const todo = jobs.filter((j) => !(index[j.id] && j.lines.every((t) => index[j.id].keys[t] && has(index[j.id].keys[t]))));
  const groups = []; for (let i = 0; i < todo.length; i += G) groups.push(todo.slice(i, i + G));
  console.log(`${todo.length} video(s) to voice → ${groups.length} request(s) of up to ${G}`);
  if (argv.includes("--dry")) groups.forEach((g, i) => console.log(`  ${i + 1}. ${g.map((j) => `${j.id}(${j.lines.length})`).join(" ")}`));
  else for (const g of groups) {
    try { await group(g); }
    catch (e) { console.log(e.message.slice(0, 300)); if (/^QUOTA/.test(e.message)) { process.exitCode = 3; break; } process.exitCode = 1; }
  }
  writeFileSync(join(CACHE, "report.json"), JSON.stringify(report, null, 2));
  console.log(`requests: ${requests} · retired today: ${[...retired].join(", ") || "none"} · unchecked: ${report.unchecked.join(" ") || "none"} · flagged: ${report.flagged.map((f) => f.id).join(" ") || "none"}`);
}

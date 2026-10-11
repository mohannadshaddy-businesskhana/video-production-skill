// Places a known transcript's words on a recording without touching the recording's timing.
// Sentence boundaries are snapped to the pauses the voice really makes; inside a sentence each
// word gets a share of the voiced time by its letter count, then its edges move to the nearest
// dip in loudness. For captions on footage, where the voice must stay on the lips.
// Usage: node align_words.mjs <audio> <transcript.json {segments:[{start,end,text}]}> <out.json> [whisper.json]
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const SR = 16000, HOP_S = 0.01, HOP = SR * HOP_S;
const VOICE_BELOW_LOUD_DB = 30;     // a frame is voiced within this of the take's loud level
const MIN_PAUSE_S = 0.15;           // the commas in this voice ran 270-490ms; stops run under 120
const SNAP_WINDOW_S = 1.2;          // how far a model's sentence time may be from the real pause
const DIP_WINDOW_S = 0.08;          // how far a word edge may move to find a dip
// The take's first and last sentences have no pause on their outer side to snap to, and the
// lead-in (rustle, a breath, handling noise) is as loud as a voice. Trust the model there, closely.
const OUTER_SLACK_S = 0.3;

// Handling noise is as loud as a voice but spread across the band; a voice sits low. Measured on
// one take: rustle 15.6 dB more energy under 1 kHz than over 3 kHz, speech 28-30, so a sentence's
// edges are trimmed to frames that are loud AND low-heavy, held over a 50ms median.
const SPEECH_TILT_DB = 20;
const TILT_MEDIAN_FRAMES = 5;

function envelope(file, af = "anull") {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-af", af, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"],
    { maxBuffer: 2 ** 30 });
  const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const db = new Float32Array(Math.floor(pcm.length / HOP));
  for (let f = 0; f < db.length; f++) {
    let s = 0;
    for (let i = f * HOP; i < (f + 1) * HOP; i++) s += pcm[i] * pcm[i];
    db[f] = 10 * Math.log10(s / HOP + 1e-12);
  }
  return db;
}

function voicedMask(db) {
  const loud = [...db].sort((a, b) => a - b)[Math.floor(db.length * 0.95)];
  return Array.from(db, (v) => v > loud - VOICE_BELOW_LOUD_DB);
}

function speechLike(file, voiced) {
  const lo = envelope(file, "lowpass=f=1000,lowpass=f=1000");
  const hi = envelope(file, "highpass=f=3000,highpass=f=3000");
  const h = TILT_MEDIAN_FRAMES >> 1;
  return voiced.map((v, f) => {
    if (!v) return false;
    const w = [];
    for (let k = Math.max(0, f - h); k <= Math.min(lo.length - 1, f + h); k++) w.push(lo[k] - hi[k]);
    return w.sort((a, b) => a - b)[w.length >> 1] > SPEECH_TILT_DB;
  });
}

function pauses(voiced) {
  const out = [];
  let start = -1;
  for (let f = 0; f <= voiced.length; f++) {
    const quiet = f < voiced.length && !voiced[f];
    if (quiet && start < 0) start = f;
    if (!quiet && start >= 0) {
      if ((f - start) * HOP_S >= MIN_PAUSE_S) out.push({ from: start * HOP_S, to: f * HOP_S });
      start = -1;
    }
  }
  return out;
}

// Each boundary between two sentences goes to the pause nearest the guess, in order. The guess
// is Whisper's clock when it heard the words either side (the model's sentence times were 1s out
// at one boundary, and the nearest pause was then the wrong one), else the model's own times.
function snapBoundaries(segments, ps) {
  const cuts = [];
  let next = 0;
  for (let i = 1; i < segments.length; i++) {
    const guess = segments[i].guess ?? (segments[i - 1].end + segments[i].start) / 2;
    let best = -1, bestD = SNAP_WINDOW_S;
    for (let j = next; j < ps.length; j++) {
      const d = Math.abs((ps[j].from + ps[j].to) / 2 - guess);
      if (d < bestD) { bestD = d; best = j; }
    }
    // with no pause near it, the guess stands — but never before the boundary already placed,
    // or a sentence comes out ending before it starts (one did: 42.5–41.4)
    const floor = cuts.length ? cuts[cuts.length - 1].to + 0.05 : 0;
    if (best >= 0 && ps[best].from >= floor) { cuts.push(ps[best]); next = best + 1; }
    else { const g = Math.max(guess, floor); cuts.push({ from: g, to: g }); }
  }
  return cuts;
}

function voicedSpan(voiced, from, to) {
  let a = Math.ceil(from / HOP_S), b = Math.floor(to / HOP_S);
  while (a < b && !voiced[a]) a++;
  while (b > a && !voiced[b - 1]) b--;
  return [a * HOP_S, b * HOP_S];
}

function nearestDip(db, t) {
  const c = Math.round(t / HOP_S), w = Math.round(DIP_WINDOW_S / HOP_S);
  let best = c;
  for (let f = Math.max(0, c - w); f <= Math.min(db.length - 1, c + w); f++) if (db[f] < db[best]) best = f;
  return best * HOP_S;
}

// Voiced time inside [a,b) is shared out by letters; the moment the k-th share is reached is a word edge.
function placeWords(text, a, b, voiced, db) {
  const words = text.split(/\s+/).filter(Boolean);
  const letters = words.map((w) => Math.max(1, [...w.replace(/[^\p{L}\p{N}]/gu, "")].length));
  const total = letters.reduce((x, y) => x + y, 0);
  const frames = [];
  for (let f = Math.round(a / HOP_S); f < Math.round(b / HOP_S); f++) if (voiced[f]) frames.push(f);
  const at = (share) => frames[Math.min(frames.length - 1, Math.floor(share * frames.length))] * HOP_S;
  let acc = 0;
  const edges = letters.map((l) => { const e = acc / total; acc += l; return e; });
  const starts = edges.map((e, i) => (i === 0 ? a : nearestDip(db, at(e))));
  return words.map((w, i) => ({ text: w, start: +starts[i].toFixed(2), end: +(i + 1 < words.length ? starts[i + 1] : b).toFixed(2) }));
}

// Whisper's words can be wrong while its clock is right. Where a Whisper word spells the same as
// ours (after folding alef/ta-marbuta/ya forms), its start wins; the words between two anchors
// keep their letter-share placement, shifted by the anchors' offsets interpolated across them.
const ANCHOR_MAX_SHIFT_S = 0.8;
// Whisper and Gemini spell one word differently («الالكترونية»/«إلكترونية», «وبالتوفيق»/«بالتوفيق»):
// fold the letter forms, then strip the clitics a word can start with, so the two can meet
const fold = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/^(و|ف)?(ب|ل|ك)?(ال)?(?=.{3,})/u, "");

function lcsPairs(a, b) {
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i] && a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return pairs;
}

function anchorWords(segments, whisperWords) {
  const ours = segments.flatMap((s) => s.words);
  const offset = new Array(ours.length).fill(null);
  for (const [i, j] of lcsPairs(ours.map((w) => fold(w.text)), whisperWords.map((w) => fold(w.word)))) {
    const d = whisperWords[j].start - ours[i].start;
    if (Math.abs(d) <= ANCHOR_MAX_SHIFT_S) offset[i] = d;
  }
  const known = offset.map((d, i) => (d === null ? -1 : i)).filter((i) => i >= 0);
  ours.forEach((w, i) => {
    const prev = known.filter((k) => k <= i).pop(), next = known.find((k) => k >= i);
    const d = prev === undefined ? offset[next] ?? 0 : next === undefined ? offset[prev]
      : prev === next ? offset[i] : offset[prev] + (offset[next] - offset[prev]) * (i - prev) / (next - prev);
    w.start = +(w.start + d).toFixed(2);
  });
  for (const s of segments) {
    s.words.forEach((w, k) => {
      w.start = Math.min(Math.max(w.start, k ? s.words[k - 1].start + 0.05 : s.start), s.end - 0.05);
      w.start = +w.start.toFixed(2);
    });
    s.words.forEach((w, k) => { w.end = k + 1 < s.words.length ? s.words[k + 1].start : s.end; });
  }
  return known.length;
}

function boundaryGuesses(segs, whisperWords) {
  const words = segs.flatMap((s, si) => s.text.split(/\s+/).filter(Boolean).map((t) => ({ t, si })));
  const hit = new Map(lcsPairs(words.map((w) => fold(w.t)), whisperWords.map((w) => fold(w.word))));
  for (let i = 1; i < words.length; i++) {
    if (words[i].si === words[i - 1].si) continue;
    const a = hit.get(i - 1), b = hit.get(i);
    if (a !== undefined && b !== undefined) segs[words[i].si].guess = (whisperWords[a].end + whisperWords[b].start) / 2;
  }
}

function main() {
  const [audio, tFile, out, anchorsFile] = process.argv.slice(2);
  const segs = JSON.parse(readFileSync(tFile, "utf8")).segments;
  const whisper = anchorsFile ? JSON.parse(readFileSync(anchorsFile, "utf8")).words : null;
  if (whisper) boundaryGuesses(segs, whisper);
  const db = envelope(audio), voiced = voicedMask(db), cuts = snapBoundaries(segs, pauses(voiced));
  const speech = speechLike(audio, voiced);
  const end = db.length * HOP_S;
  const result = segs.map((s, i) => {
    const from = i === 0 ? Math.max(0, s.start - OUTER_SLACK_S) : cuts[i - 1].to;
    const to = i === segs.length - 1 ? Math.min(end, s.end + OUTER_SLACK_S) : cuts[i].from;
    const [a, b] = voicedSpan(speech, from, to);
    return { start: +a.toFixed(2), end: +b.toFixed(2), text: s.text, words: placeWords(s.text, a, b, voiced, db) };
  });
  if (whisper) {
    const n = anchorWords(result, whisper);
    console.log(`anchored ${n} of ${result.reduce((a, s) => a + s.words.length, 0)} words on Whisper's clock`);
  }
  writeFileSync(out, JSON.stringify({ segments: result }, null, 2));
  for (const s of result) console.log(`${s.start.toFixed(2)}-${s.end.toFixed(2)}  ${s.text}`);
}

main();

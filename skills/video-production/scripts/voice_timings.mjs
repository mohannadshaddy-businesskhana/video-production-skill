#!/usr/bin/env node
/* A recorded narration, measured into the same timings.json the TTS tools write.
 *
 *   node voice_timings.mjs --lines narration.json --in takes/ --out voice/recorded [--clean]
 *                          [--gap 0.35] [--max-pause 0.45]
 *
 * `--in` is either a folder with one take per line (l1.m4a, l2.m4a … — any
 * format ffmpeg reads, matched by the line ids), or a single file recorded in
 * one go with a clear pause between lines, which is aligned to the script.
 * Each line is cut down to its words, its pauses capped, then the lines are
 * joined with a fixed gap — the same shape tts_gemini.mjs writes, so a
 * composition takes a voice from any source. `--clean` is for a recording made
 * anywhere but a quiet room.
 *
 * Requires: ffmpeg and ffprobe on PATH.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, extname, basename } from "node:path";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf("--" + n); return i === -1 ? d : argv[i + 1]; };
const linesPath = flag("lines"), input = flag("in"), out = flag("out");
const gap = Number(flag("gap", "0.35"));
if (!linesPath || !input || !out) {
  console.error("usage: voice_timings.mjs --lines narration.json --in <folder|file> --out <dir> [--clean] "
    + "[--gap 0.35] [--max-pause 0.45]");
  process.exit(2);
}
const N = JSON.parse(readFileSync(linesPath, "utf8"));
mkdirSync(out, { recursive: true });

const RATE = 48000;
const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr.slice(-600));
  return r;
};
const duration = (f) => parseFloat(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "csv=p=0", f], { encoding: "utf8" }).stdout);

/* One file with every line in it. The text is known, so this is alignment,
 * not detection: of every pause in the take, choose the N−1 that cut it into
 * pieces whose lengths best match what each line's text predicts (its letter
 * count), with a small preference for longer pauses.
 *
 * Picking the N−1 LONGEST pauses failed on synthetic speech: the voice pauses
 * at commas and dashes as long as between lines, so a seven-word line came out
 * one second long and a six-word one five.
 *
 * Length alone was still ambiguous where two pauses sat close together. The
 * punctuation settles it: a line's own commas and dashes predict the pauses
 * inside it, so a list of four names may hold three and a plain sentence none.
 * A piece holding MORE pauses than its punctuation explains has probably
 * swallowed a line break, and costs a lot. One holding fewer is common — a
 * voice does not stop at every comma — and costs little. */
const PAUSE_BONUS = 0.15;                    // how much a longer pause is preferred
const EXTRA_PAUSE = 0.3, MISSING_PAUSE = 0.05;
function splitTake(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-35dB:d=0.2",
    "-f", "null", "-"], { encoding: "utf8" });
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const total = duration(file);
  const cand = starts.map((s, i) => ({ s, e: ends[i] ?? total }))
    .filter((p) => p.s > 0.3 && p.e < total - 0.3)        // not the lead-in or the tail
    .map((p) => ({ t: (p.s + p.e) / 2, len: p.e - p.s }));
  const K = N.lines.length - 1;
  if (cand.length < K)
    throw new Error(`found ${cand.length} pause(s), need ${K} — leave a clear pause between lines`);

  const weight = N.lines.map((l) => [...l.text.replace(/[^\p{L}\p{N}]/gu, "")].length);
  const W = weight.reduce((a, b) => a + b, 0);
  const expect = weight.map((w) => (w / W) * total);
  // the pauses a line's punctuation predicts inside it — its last mark ends it
  const inner = N.lines.map((l) => (l.text.trim().replace(/[.؟?!:،,؛;]+$/u, "").match(/[،,؛;:—–]/g) || []).length);
  // a piece from pause a to pause b holds the candidates strictly between them
  const seg = (a, b, i, inside) => ((b - a - expect[i]) / expect[i]) ** 2
    + EXTRA_PAUSE * Math.max(0, inside - inner[i]) ** 2 + MISSING_PAUSE * Math.max(0, inner[i] - inside) ** 2;
  const bonus = (j) => -PAUSE_BONUS * Math.log(cand[j].len);
  // dp[i][j]: best cost with the (i+1)-th cut at candidate j
  const dp = [], from = [];
  for (let i = 0; i < K; i++) {
    dp.push(new Array(cand.length).fill(Infinity)); from.push(new Array(cand.length).fill(-1));
    for (let j = i; j < cand.length; j++) {
      if (i === 0) { dp[0][j] = seg(0, cand[j].t, 0, j) + bonus(j); continue; }
      for (let k = i - 1; k < j; k++) {
        const c = dp[i - 1][k] + seg(cand[k].t, cand[j].t, i, j - k - 1) + bonus(j);
        if (c < dp[i][j]) { dp[i][j] = c; from[i][j] = k; }
      }
    }
  }
  let best = Infinity, at = -1;
  for (let j = K - 1; j < cand.length; j++) {
    const c = dp[K - 1][j] + seg(cand[j].t, total, K, cand.length - 1 - j);
    if (c < best) { best = c; at = j; }
  }
  const chosen = [];
  for (let i = K - 1; i >= 0; i--) { chosen.unshift(at); at = from[i][at]; }
  const cuts = chosen.map((j) => cand[j].t);
  // A split is only as sure as its margin. Inside each piece, its punctuation
  // explains its longest pauses; any pause left over that is longer than the
  // shortest break chosen means a word may have moved to the next line. The
  // converse does not hold: a clear margin once hid a name cut into the wrong
  // line (#51), so a margin is reported, never taken as proof.
  const edges = [-1, ...chosen, cand.length];
  const loose = [];
  for (let i = 0; i <= K; i++) {
    const inside = cand.slice(edges[i] + 1, edges[i + 1]).sort((p, q) => q.len - p.len);
    loose.push(...inside.slice(inner[i]).map((p) => ({ ...p, line: N.lines[i].id })));
  }
  const breaks = chosen.map((j) => cand[j].len);
  const rival = loose.reduce((m, p) => (p.len > m.len ? p : m), { len: 0, t: 0, line: null });
  alignment = { clear: Math.min(...breaks) > rival.len, shortest_break: +Math.min(...breaks).toFixed(2),
                longest_unexplained: +rival.len.toFixed(2), at: +rival.t.toFixed(2), line: rival.line };
  return N.lines.map((l, i) => ({ id: l.id, from: i ? cuts[i - 1] : 0, to: i < K ? cuts[i] : total }));
}
let alignment = null;

/* Every line at ONE loudness. Takes recorded one at a time drift — one sample
 * narration spread 6.6 dB between lines — and the final loudness pass lifts
 * the whole track without evening it out. A static gain per line, not a
 * compressor: the delivery stays the speaker's; only the level is matched.
 *
 * MATCH, don't maximise. Phone voice notes arrive with peaks near 0 dBFS, so a
 * quiet line often cannot be raised at all without clipping; pushing each line
 * to a fixed target lowered the very lines that needed lifting. The common
 * level is the highest one EVERY line can reach with its peak under -1.5 dBFS
 * (never above --level); the final loudness pass raises the whole track. */
const LINE_LUFS = Number(flag("level", "-19"));
const PEAK_CEIL = -1.5;
const integrated = (f) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"],
                      { encoding: "utf8" });
  const i = [...r.stderr.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop();
  const p = [...r.stderr.matchAll(/^\s+Peak:\s+(-?[\d.]+) dBFS/gm)].pop();
  return { i: i ? +i[1] : null, peak: p ? +p[1] : null };
};
function applyGain(file, gain) {
  const tmp = file.replace(/\.wav$/, ".lvl.wav");
  ff(["-i", file, "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "pcm_s16le", tmp]);
  ff(["-i", tmp, "-c", "copy", file]);
  rmSync(tmp);
}

/* A line's own level, from 20ms windows: "loud" is its 90th percentile, the
 * level its words sit at. Everything below is measured against it, never
 * against a fixed number — a phone in a quiet room and one beside a television
 * put their floors 25 dB apart. */
const WIN = 0.02;
function envelope(file) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                      { maxBuffer: 1 << 26 });
  const n = Math.floor(r.stdout.length / 4), hop = Math.round(16000 * WIN), env = [];
  for (let w = 0; w + hop <= n; w += hop) {
    let s = 0;
    for (let k = w; k < w + hop; k++) { const v = r.stdout.readFloatLE(k * 4); s += v * v; }
    env.push(Math.sqrt(s / hop));
  }
  const loud = [...env].sort((a, b) => a - b)[Math.floor(env.length * 0.9)] || 0;
  return { env, loud };
}
const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));
function rewrite(file, af) {
  const tmp = file.replace(/\.wav$/, ".tmp.wav");
  ff(["-i", file, "-af", af, "-c:a", "pcm_s16le", tmp]);
  ff(["-i", tmp, "-c", "copy", file]);
  rmSync(tmp);
}

/* Cut a line down to its words. A fixed "silence" threshold kept whatever
 * was not silent before and after them — in a phone take, the room: 0.6s of
 * a television at -51 dB rode along at the end of a line, and the loudness
 * pass lifted it 10 dB. The words are runs of at least 60ms within 24 dB of
 * the line's own level; a room's bursts rose to 21 dB under the voice, but
 * never for three windows running. A little air is kept either side for the
 * breath and the decay (#52). */
const SPEECH_DB = 24, RUN = 3, PAD_IN = 0.06, PAD_OUT = 0.12;
function trimToSpeech(file) {
  const { env, loud } = envelope(file), th = loud * 10 ** (-SPEECH_DB / 20);
  const inRun = (i) => {                       // window i belongs to RUN or more loud windows in a row
    let a = i, b = i;
    while (a > 0 && env[a - 1] > th) a--;
    while (b < env.length - 1 && env[b + 1] > th) b++;
    return env[i] > th && b - a + 1 >= RUN;
  };
  const first = env.findIndex((_, i) => inRun(i));
  let last = -1;
  for (let i = env.length - 1; i >= 0 && last < 0; i--) if (inRun(i)) last = i;
  if (first < 0) throw new Error(`${file}: no speech found`);
  const from = Math.max(0, first * WIN - PAD_IN), to = Math.min(env.length * WIN, (last + 1) * WIN + PAD_OUT);
  rewrite(file, `atrim=start=${from.toFixed(3)}:end=${to.toFixed(3)},asetpts=PTS-STARTPTS,`
    + `afade=t=in:d=0.01,areverse,afade=t=in:d=0.03,areverse`);
}

/* --clean, for a recording: rumble under 80 Hz goes, steady hiss is reduced,
 * and the background between words is pushed 24 dB down by an expander keyed
 * to the line's own level. What sits UNDER a word stays — separating a voice
 * from a television behind it takes a source-separation model, and a quieter
 * room is the free one. */
const CLEAN = argv.includes("--clean");
const DENOISE = "highpass=f=80,afftdn=nr=12:nf=-50:tn=1";
function expand(file) {
  const { loud } = envelope(file);
  const th = Math.min(0.5, loud * 10 ** (-(SPEECH_DB + 2) / 20));
  rewrite(file, `agate=threshold=${th.toFixed(5)}:ratio=4:range=0.063:attack=4:release=150:detection=rms`);
}

/* No pause inside a line longer than MAX_PAUSE: longer ones are cut down to
 * it, the cut made in the middle of the silence. A synthetic voice left a
 * second's gap inside a list of four names, and a pause with nothing drawn and
 * nothing said is dead air. */
const MAX_PAUSE = Number(flag("max-pause", "0.45"));
function capPauses(file) {
  const { loud } = envelope(file);
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af",
    `silencedetect=noise=${db(loud) - SPEECH_DB - 4}dB:d=${MAX_PAUSE}`, "-f", "null", "-"], { encoding: "utf8" });
  const st = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const en = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const cut = st.map((s, i) => [s + MAX_PAUSE / 2, (en[i] ?? s) - MAX_PAUSE / 2]).filter(([a, b]) => b - a > 0.02);
  if (!cut.length) return 0;
  rewrite(file, `aselect='not(${cut.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join("+")})',`
    + "asetpts=N/SR/TB");
  return cut.reduce((s, [a, b]) => s + (b - a), 0);
}

const isDir = statSync(input).isDirectory();
const takes = isDir ? readdirSync(input) : [];
const pieces = [];
const segments = isDir ? null : splitTake(input);
for (const [i, line] of N.lines.entries()) {
  const raw = join(out, `${line.id}.wav`);
  // cut INSIDE the filter chain: an output-side -ss/-to cuts after filtering
  const s = segments && segments[i];
  const pre = [s && `atrim=start=${s.from.toFixed(3)}:end=${s.to.toFixed(3)},asetpts=PTS-STARTPTS`,
               CLEAN && DENOISE].filter(Boolean).join(",") || "anull";
  let src = input;
  if (isDir) {
    const f = takes.find((t) => basename(t, extname(t)) === line.id);
    if (!f) throw new Error(`no take for ${line.id} in ${input}`);
    src = join(input, f);
  }
  ff(["-i", src, "-af", pre, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", raw]);
  trimToSpeech(raw);
  if (CLEAN) expand(raw);
  const pausesCut = capPauses(raw);
  const m = integrated(raw);
  if (m.i === null || m.i < -70) throw new Error(`${raw}: silent or unreadable`);
  pieces.push({ id: line.id, text: line.text, file: `${line.id}.wav`, duration: +duration(raw).toFixed(3),
                pauses_cut: +pausesCut.toFixed(2), lufs_in: +m.i.toFixed(1), peak_in: m.peak ?? -99, path: raw });
}
// the level every line can reach: each line's headroom caps it
const common = Math.min(LINE_LUFS, ...pieces.map((p) => p.lufs_in + (PEAK_CEIL - p.peak_in)));
for (const p of pieces) {
  applyGain(p.path, common - p.lufs_in);
  p.lufs = +integrated(p.path).i.toFixed(1);
  delete p.path; delete p.peak_in;
}

let t = 0;
const rows = pieces.map((p, i) => {
  const row = { ...p, start: +t.toFixed(3), end: +(t + p.duration).toFixed(3) };
  t += p.duration + (i < pieces.length - 1 ? gap : 0);
  return row;
});
const list = join(out, "concat.txt");
const silence = join(out, "gap.wav");
ff(["-f", "lavfi", "-i", `anullsrc=r=${RATE}:cl=mono`, "-t", String(gap), silence]);
writeFileSync(list, rows.flatMap((r, i) => [`file '${r.file}'`, ...(i < rows.length - 1 ? ["file 'gap.wav'"] : [])]).join("\n"));
ff(["-f", "concat", "-safe", "0", "-i", list, "-c:a", "pcm_s16le", join(out, "narration.wav")]);
writeFileSync(join(out, "timings.json"), JSON.stringify({
  source: "recording", clean: CLEAN, gap, sample_rate: RATE, total: +t.toFixed(3), ...(alignment ? { alignment } : {}),
  lines: rows }, null, 2) + "\n");
for (const r of rows)
  console.log(`${r.id}  ${r.duration.toFixed(2)}s  ${String(r.lufs_in).padStart(5)} → ${r.lufs} LUFS  ${r.text}`
    + (r.pauses_cut ? `   (${r.pauses_cut}s of pause cut)` : ""));
console.log(`\n${rows.length} line(s), ${t.toFixed(2)}s → ${join(out, "narration.wav")} + timings.json`);
if (alignment)
  console.log(alignment.clear
    ? `pause margin clear: the shortest break chosen (${alignment.shortest_break}s) is longer than any pause its line's `
      + `punctuation does not explain (${alignment.longest_unexplained}s) — a margin, not proof: for a synthetic voice, `
      + "tts_gemini.mjs --check listens to every line (#51)"
    : `⚠ alignment AMBIGUOUS: a ${alignment.shortest_break}s break was chosen, and ${alignment.line} holds an unexplained `
      + `${alignment.longest_unexplained}s pause at ${alignment.at}s in the take — listen there, or re-record with longer pauses between lines`);

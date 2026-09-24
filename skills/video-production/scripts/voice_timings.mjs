#!/usr/bin/env node
/* A recorded narration, measured into the same timings.json the TTS tools write.
 *
 *   node voice_timings.mjs --lines narration.json --in takes/ --out voice/mohannad [--gap 0.35]
 *
 * `--in` is either a folder with one take per line (l1.m4a, l2.m4a … — any
 * format ffmpeg reads, matched by the line ids), or a single file recorded in
 * one go with a clear pause between lines, which is split at its longest
 * silences. Each line is trimmed of the silence at both ends, so its duration
 * is the speech, then the lines are joined with a fixed gap — the same shape
 * tts_gemini.mjs writes, so a composition takes a voice from any source.
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
  console.error("usage: voice_timings.mjs --lines narration.json --in <folder|file> --out <dir> [--gap 0.35]");
  process.exit(2);
}
const N = JSON.parse(readFileSync(linesPath, "utf8"));
mkdirSync(out, { recursive: true });

const RATE = 48000;
const TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
           + "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse";
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
 * one second long and a six-word one five. */
const PAUSE_BONUS = 0.15;                    // how much a longer pause is preferred
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
  const seg = (a, b, i) => ((b - a - expect[i]) / expect[i]) ** 2;
  const bonus = (j) => -PAUSE_BONUS * Math.log(cand[j].len);
  // dp[i][j]: best cost with the (i+1)-th cut at candidate j
  const dp = [], from = [];
  for (let i = 0; i < K; i++) {
    dp.push(new Array(cand.length).fill(Infinity)); from.push(new Array(cand.length).fill(-1));
    for (let j = i; j < cand.length; j++) {
      if (i === 0) { dp[0][j] = seg(0, cand[j].t, 0) + bonus(j); continue; }
      for (let k = i - 1; k < j; k++) {
        const c = dp[i - 1][k] + seg(cand[k].t, cand[j].t, i) + bonus(j);
        if (c < dp[i][j]) { dp[i][j] = c; from[i][j] = k; }
      }
    }
  }
  let best = Infinity, at = -1;
  for (let j = K - 1; j < cand.length; j++) {
    const c = dp[K - 1][j] + seg(cand[j].t, total, K);
    if (c < best) { best = c; at = j; }
  }
  const cuts = [];
  for (let i = K - 1; i >= 0; i--) { cuts.unshift(cand[at].t); at = from[i][at]; }
  return N.lines.map((l, i) => ({ id: l.id, from: i ? cuts[i - 1] : 0, to: i < K ? cuts[i] : total }));
}

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

const isDir = statSync(input).isDirectory();
const takes = isDir ? readdirSync(input) : [];
const pieces = [];
const segments = isDir ? null : splitTake(input);
for (const [i, line] of N.lines.entries()) {
  const raw = join(out, `${line.id}.wav`);
  if (isDir) {
    const f = takes.find((t) => basename(t, extname(t)) === line.id);
    if (!f) throw new Error(`no take for ${line.id} in ${input}`);
    ff(["-i", join(input, f), "-af", TRIM, "-ac", "1", "-ar", String(RATE), raw]);
  } else {
    // cut INSIDE the filter chain, before the trim: an output-side -ss/-to cuts
    // after filtering, so the trim ran on the whole take and kept the pauses
    const s = segments[i];
    ff(["-i", input, "-af", `atrim=start=${s.from.toFixed(3)}:end=${s.to.toFixed(3)},asetpts=PTS-STARTPTS,${TRIM}`,
        "-ac", "1", "-ar", String(RATE), raw]);
  }
  const m = integrated(raw);
  if (m.i === null || m.i < -70) throw new Error(`${raw}: silent or unreadable`);
  pieces.push({ id: line.id, text: line.text, file: `${line.id}.wav`, duration: +duration(raw).toFixed(3),
                lufs_in: +m.i.toFixed(1), peak_in: m.peak ?? -99, path: raw });
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
  source: "recording", gap, sample_rate: RATE, total: +t.toFixed(3), lines: rows }, null, 2) + "\n");
for (const r of rows)
  console.log(`${r.id}  ${r.duration.toFixed(2)}s  ${String(r.lufs_in).padStart(5)} → ${r.lufs} LUFS  ${r.text}`);
console.log(`\n${rows.length} line(s), ${t.toFixed(2)}s → ${join(out, "narration.wav")} + timings.json`);

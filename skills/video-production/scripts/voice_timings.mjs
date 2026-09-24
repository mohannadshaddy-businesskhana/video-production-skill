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
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
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

/* one file with every line in it: split at the N−1 longest pauses */
function splitTake(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-35dB:d=0.45",
    "-f", "null", "-"], { encoding: "utf8" });
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...r.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const pauses = starts.map((s, i) => ({ s, e: ends[i] ?? s, len: (ends[i] ?? s) - s }))
    .filter((p) => p.s > 0.3);                           // not the lead-in
  if (pauses.length < N.lines.length - 1)
    throw new Error(`found ${pauses.length} pause(s), need ${N.lines.length - 1} — leave a clear pause between lines`);
  const cuts = pauses.sort((a, b) => b.len - a.len).slice(0, N.lines.length - 1)
    .map((p) => (p.s + p.e) / 2).sort((a, b) => a - b);
  const total = duration(file);
  return N.lines.map((l, i) => ({ id: l.id, from: i ? cuts[i - 1] : 0, to: i < cuts.length ? cuts[i] : total }));
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
  pieces.push({ id: line.id, text: line.text, file: `${line.id}.wav`, duration: +duration(raw).toFixed(3) });
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
for (const r of rows) console.log(`${r.id}  ${r.duration.toFixed(2)}s  ${r.text}`);
console.log(`\n${rows.length} line(s), ${t.toFixed(2)}s → ${join(out, "narration.wav")} + timings.json`);

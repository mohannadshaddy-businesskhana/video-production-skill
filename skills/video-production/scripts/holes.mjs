// Finds the holes a wireless receiver leaves in a phone recording, and whether each one
// swallowed speech or fell in a pause. A hole is an AAC packet whose timestamp jumps further
// than one frame: the phone kept time, the receiver delivered nothing. See failure-log #56.
//
//   node holes.mjs <video> [--json out.json]     one file
//   node holes.mjs --dir <folder> [--tsv out.tsv] every .mp4/.mov under a folder, one table
//
// Run it on a two-minute test take before any shoot with a wireless mic: 0 holes = go.
import { spawnSync } from "node:child_process";
import { writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SR = 16000;
const AAC_FRAME_S = 1024 / 48000;
const MIN_HOLE_S = 0.002;
const PROBE_S = 0.15;               // listen this far either side of a hole
const SPEECH_DB = -38;              // RMS above this on both sides = the hole cut into speech

function run(args) {
  const r = spawnSync(args[0], args.slice(1), { maxBuffer: 2 ** 31 - 1 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return r.stdout;
}

function packetHoles(file) {
  const csv = run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "packet=pts_time",
    "-of", "csv=p=0", file]).toString();
  const pts = csv.split(/\r?\n/).filter(Boolean).map(Number).sort((a, b) => a - b);
  const holes = [];
  for (let i = 1; i < pts.length; i++) {
    const gap = pts[i] - pts[i - 1] - AAC_FRAME_S;
    if (gap > MIN_HOLE_S) holes.push({ t: pts[i - 1] + AAC_FRAME_S, ms: Math.round(gap * 1000) });
  }
  return holes;
}

// Decoded on the container's clock, so silence fills each hole and times line up with the video.
// A plain decode drops the holes instead: the audio comes out shorter than the picture and drifts.
function timedPcm(file) {
  const buf = run(["ffmpeg", "-v", "error", "-i", file, "-vn", "-af", "aresample=async=1:first_pts=0",
    "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"]);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

function rmsDb(pcm, from, to) {
  const a = Math.max(0, Math.floor(from * SR)), b = Math.min(pcm.length, Math.floor(to * SR));
  let s = 0;
  for (let i = a; i < b; i++) s += pcm[i] * pcm[i];
  return 10 * Math.log10(s / Math.max(1, b - a) + 1e-12);
}

function classify(pcm, h) {
  const end = h.t + h.ms / 1000;
  const before = rmsDb(pcm, h.t - PROBE_S, h.t), after = rmsDb(pcm, end, end + PROBE_S);
  return { t: +h.t.toFixed(3), ms: h.ms, before_db: +before.toFixed(1), after_db: +after.toFixed(1),
    in_speech: before > SPEECH_DB && after > SPEECH_DB };
}

export function analyze(file) {
  const pcm = timedPcm(file);
  const list = packetHoles(file).map((h) => classify(pcm, h));
  const speech = list.filter((h) => h.in_speech);
  const duration = pcm.length / SR, lost = speech.reduce((a, h) => a + h.ms, 0) / 1000;
  return {
    file, duration_s: +duration.toFixed(1), holes: list.length, in_speech: speech.length,
    missing_s: +(list.reduce((a, h) => a + h.ms, 0) / 1000).toFixed(2),
    speech_lost_s: +lost.toFixed(2), lost_pct: +(100 * lost / duration).toFixed(1), list,
  };
}

// Light holes can be cut out (repair_holes.mjs); heavy ones are lost speech — reshoot.
export function verdict(pct) {
  return pct === 0 ? "clean" : pct <= 3 ? "light: repair" : pct <= 8 ? "medium: repair, listen" : "heavy: reshoot";
}

function videosIn(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? videosIn(p) : /\.(mp4|mov)$/i.test(n) ? [p] : [];
  });
}

function triage(dir, tsv) {
  const rows = [["file", "duration_s", "holes", "in_speech", "speech_lost_s", "lost_pct", "verdict"]];
  for (const f of videosIn(dir)) {
    const r = analyze(f);
    rows.push([f, r.duration_s, r.holes, r.in_speech, r.speech_lost_s, r.lost_pct, verdict(r.lost_pct)]);
    console.log(rows[rows.length - 1].join("\t"));
  }
  if (tsv) writeFileSync(tsv, rows.map((r) => r.join("\t")).join("\n") + "\n");
}

function main(argv) {
  if (argv[0] === "--dir") return triage(argv[1], argv[2] === "--tsv" ? argv[3] : null);
  const [file, flag, out] = argv;
  if (!file) { console.error("usage: holes.mjs <video> [--json out.json] | --dir <folder> [--tsv out.tsv]"); process.exit(2); }
  const r = analyze(file);
  const { list, ...summary } = r;
  console.log(JSON.stringify({ ...summary, verdict: verdict(r.lost_pct) }));
  if (flag === "--json") writeFileSync(out, JSON.stringify(r, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));

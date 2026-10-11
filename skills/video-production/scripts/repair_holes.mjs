// Closes the receiver holes in a phone recording: each hole is cut from picture and sound
// together, on whole frames, so lip sync holds however many holes there are.
// Usage: node repair_holes.mjs <video> <out.mov> [--holes holes.json] [--keep-tmp]
//   Without --holes it measures them itself (holes.mjs). Output: 30fps CFR h264 + PCM, ready
//   for normalize.sh. Writes <out>.cuts.json: every removed range in source time, so an edit
//   made on the repaired file can be traced back to the raw one. See failure-log #56.
//   --no-clean: cut only. The same frame-exact cutter then serves an edit (a retake, a stumble,
//   a long pause) on a file that is already clean — a second denoise pass would thin the voice.
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { analyze } from "./holes.mjs";

const FPS = 30;
const SR = 48000;
const CH = 2;
const FADE_S = 0.005;               // a hole's edges are abrupt; 5ms kills the click, not the word
// Rumble + a light hiss cut, nothing that thins a voice. afftdn delays its output by 25ms
// (measured by cross-correlation); the atrim/apad pair takes that back so lips and voice meet.
const AFFTDN_LATENCY_S = 0.025;
const CLEAN = `highpass=f=80,afftdn=nr=10:nf=-40:tn=1,atrim=start=${AFFTDN_LATENCY_S},asetpts=PTS-STARTPTS,apad=pad_dur=${AFFTDN_LATENCY_S}`;

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { maxBuffer: 2 ** 31 - 1, input });
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr.toString().slice(-2000)}`);
  return r.stdout;
}

function durationS(file) {
  return +run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
}

// A hole becomes a run of whole frames; overlapping runs merge.
function removedFrameRuns(holes) {
  const runs = holes
    .map((h) => [Math.floor(h.t * FPS), Math.ceil((h.t + h.ms / 1000) * FPS)])
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

function keptFrameRuns(removed, totalFrames) {
  const kept = [];
  let from = 0;
  for (const [a, b] of removed) { if (a > from) kept.push([from, a]); from = b; }
  if (from < totalFrames) kept.push([from, totalFrames]);
  return kept;
}

// Decoded on the container clock (silence fills the holes), so sample n sits at n/SR seconds.
function timedPcm(file) {
  const buf = run("ffmpeg", ["-v", "error", "-i", file, "-vn", "-af", "aresample=async=1:first_pts=0",
    "-ac", String(CH), "-ar", String(SR), "-f", "f32le", "-"]);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

function spliceAudio(pcm, kept) {
  const perFrame = SR / FPS, fade = Math.round(FADE_S * SR);
  const total = kept.reduce((n, [a, b]) => n + (b - a) * perFrame, 0);
  const out = new Float32Array(total * CH);
  let o = 0;
  for (const [a, b] of kept) {
    const s0 = a * perFrame, len = (b - a) * perFrame;
    for (let i = 0; i < len; i++) {
      const g = Math.min(1, i / fade, (len - 1 - i) / fade);
      for (let c = 0; c < CH; c++) out[(o + i) * CH + c] = (pcm[(s0 + i) * CH + c] || 0) * g;
    }
    o += len;
  }
  return out;
}

function selectExpr(removed) {
  if (!removed.length) return "1";
  return "not(" + removed.map(([a, b]) => `between(n,${a},${b - 1})`).join("+") + ")";
}

function encode(src, audioRaw, removed, out, clean) {
  const vf = `fps=${FPS}:start_time=0,select='${selectExpr(removed)}',setpts=N/${FPS}/TB`;
  run("ffmpeg", ["-v", "error", "-y", "-i", src,
    "-f", "f32le", "-ar", String(SR), "-ac", String(CH), "-i", audioRaw,
    "-map", "0:v:0", "-map", "1:a:0", "-vf", vf, "-af", clean ? CLEAN : "anull",
    "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
    "-c:a", "pcm_s16le", "-shortest", out]);
}

function parseArgs(args) {
  const [src, out] = args;
  if (!src || !out || src.startsWith("--")) {
    console.error("usage: repair_holes.mjs <video> <out.mov> [--holes holes.json] [--no-clean] [--keep-tmp]");
    process.exit(2);
  }
  const hi = args.indexOf("--holes");
  const holes = hi > 0 ? JSON.parse(readFileSync(args[hi + 1], "utf8")).list : analyze(src).list;
  return { src, out, holes, keepTmp: args.includes("--keep-tmp"), clean: !args.includes("--no-clean") };
}

function main() {
  const { src, out, holes, keepTmp, clean } = parseArgs(process.argv.slice(2));
  const totalFrames = Math.floor(durationS(src) * FPS);
  const removed = removedFrameRuns(holes);
  const kept = keptFrameRuns(removed, totalFrames);
  const tmp = out.replace(/\.\w+$/, ".audio.f32");
  writeFileSync(tmp, Buffer.from(spliceAudio(timedPcm(src), kept).buffer));
  encode(src, tmp, removed, out, clean);
  if (!keepTmp) rmSync(tmp);
  const cuts = removed.map(([a, b]) => ({ from_s: +(a / FPS).toFixed(3), to_s: +(b / FPS).toFixed(3) }));
  const removedS = removed.reduce((n, [a, b]) => n + (b - a), 0) / FPS;
  writeFileSync(out + ".cuts.json", JSON.stringify({ src, fps: FPS, removed_s: +removedS.toFixed(3), cuts }, null, 2));
  console.log(JSON.stringify({ out, cuts: cuts.length, removed_s: +removedS.toFixed(2),
    out_s: +((totalFrames / FPS) - removedS).toFixed(2) }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

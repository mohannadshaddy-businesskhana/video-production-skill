// One picture per joint of a cut: frames either side, the waveform with the joint marked, and the
// words placed on their times. It puts in one image what clipcheck.mjs (the ear), pause_sheet.mjs
// (the eyes) and voice_timings --plot (the sound) give separately — for the joints joint_check.mjs
// flags, or any time a reviewer names. After browser-use/video-use's timeline_view.
// Usage: node joint_sheet.mjs <work/name> [--joints flagged.json | --at 12.3,40.1] [--video f.mp4]
//          [--span 1.0] [--font f.ttf] [--out dir]
//   default joints: <work>/joints.json · default video: <work>/aroll_norm.mp4 · audio: <work>/aroll16k.mp3
//   · words: <work>/words_final.json — all on the cut clock. Writes <out>/joint-<t>.png.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const W = 1280, FRAME_W = W / 8, WAVE_H = 140, WORDS_H = 84, HEAD_H = 36;
// frames before the joint and after it, denser near the cut. The last "before" frame is two frames
// out, not one: a joint time and the picture's cut can sit a frame apart (seen on a rendered preview),
// and a one-frame offset then showed the after-cut picture labelled as before.
const OFFSETS_S = [-0.6, -0.3, -0.1, -2 / 30, 0, 0.1, 0.3, 0.6];
const FONTS = ["C:/Windows/Fonts/tahoma.ttf", "C:/Windows/Fonts/arial.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"];

const arg = (args, name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
// filtergraph escaping: a value inside '…' in a drawtext option
const esc = (s) => String(s).replace(/\\/g, "/").replace(/[':%,;[\]]/g, (c) => "\\" + c);

function options(args) {
  const work = args[0];
  if (!work || work.startsWith("--")) {
    console.error("usage: joint_sheet.mjs <work/name> [--joints f.json | --at t,t] [--video f] [--span s] [--font f] [--out dir]");
    process.exit(2);
  }
  const font = arg(args, "--font", FONTS.find(existsSync));
  if (!font) { console.error("no font found — pass --font <a .ttf with Arabic glyphs>"); process.exit(2); }
  const at = arg(args, "--at");
  const listed = JSON.parse(readFileSync(arg(args, "--joints", join(work, "joints.json")), "utf8"));
  // a time a reviewer names carries the reason of the joint it lands on, when it lands on one
  const named = (t) => listed.find((j) => Math.abs(j.t - t) < 0.05) ?? { t, reason: "asked" };
  const joints = at ? at.split(",").map((t) => named(+t)) : listed;
  return { work, font, joints, span: +arg(args, "--span", 1.0),
    video: arg(args, "--video", join(work, "aroll_norm.mp4")), out: arg(args, "--out", join(work, "joints")) };
}

function cutWords(work) {
  const f = join(work, "words_final.json");
  if (!existsSync(f)) return [];
  const j = JSON.parse(readFileSync(f, "utf8"));
  return (j.segments ?? [{ words: j }]).flatMap((s) => s.words).filter((w) => w.start != null);
}

function frameFilters(o) {
  const text = (k) => `${OFFSETS_S[k] < 0 ? "" : "+"}${Math.round(OFFSETS_S[k] * 1000)}ms`;
  const color = (k) => (OFFSETS_S[k] < 0 ? "white" : "yellow");
  const one = (k) => `[${k}:v]scale=${FRAME_W}:-2,setsar=1,drawtext=fontfile='${esc(o.font)}':text='${esc(text(k))}'` +
    `:fontcolor=${color(k)}:fontsize=18:x=6:y=6:box=1:boxcolor=black@0.6,format=rgb24[f${k}]`;
  return OFFSETS_S.map((_, k) => one(k)).join(";") + ";" + OFFSETS_S.map((_, k) => `[f${k}]`).join("") + `hstack=${OFFSETS_S.length}[row]`;
}

function wordFilters(o, t, words) {
  const from = t - o.span, near = words.filter((w) => w.end > from && w.start < t + o.span);
  const x = (s) => Math.round(((Math.max(s, from) - from) / (2 * o.span)) * W);
  const label = (w, i) => `drawtext=fontfile='${esc(o.font)}':text='${esc(w.text)}':fontcolor=white:fontsize=22` +
    `:x=${x(w.start)}:y=${i % 2 ? 46 : 10}`;
  const ticks = near.map((w) => `drawbox=x=${x(w.start)}:y=0:w=1:h=${WORDS_H}:color=gray:t=fill`);
  return [`color=c=0x181818:s=${W}x${WORDS_H}:d=1`, ...ticks, ...near.map(label),
    `drawbox=x=${W / 2 - 1}:y=0:w=2:h=${WORDS_H}:color=red:t=fill`, "format=rgb24[lab]"].join(",");
}

function sheetGraph(o, j, words) {
  const n = OFFSETS_S.length, head = `${j.t.toFixed(2)}s  ${String(j.reason ?? "").slice(0, 70)}`;
  return [frameFilters(o),
    `[${n}:a]showwavespic=s=${W}x${WAVE_H}:colors=0x9fd4ff,drawbox=x=${W / 2 - 1}:y=0:w=2:h=${WAVE_H}:color=red:t=fill,format=rgb24[wave]`,
    wordFilters(o, j.t, words),
    `color=c=black:s=${W}x${HEAD_H}:d=1,drawtext=fontfile='${esc(o.font)}':text='${esc(head)}':fontcolor=white:fontsize=20:x=10:y=8,format=rgb24[hd]`,
    "[hd][row][wave][lab]vstack=4"].join(";");
}

function sheet(o, j, words) {
  const seeks = OFFSETS_S.flatMap((d) => ["-ss", Math.max(0, j.t + d).toFixed(3), "-i", o.video]);
  const audio = ["-ss", Math.max(0, j.t - o.span).toFixed(3), "-t", (2 * o.span).toFixed(3), "-i", join(o.work, "aroll16k.mp3")];
  const png = join(o.out, `joint-${j.t.toFixed(2)}.png`);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...seeks, ...audio,
    "-filter_complex", sheetGraph(o, j, words), "-frames:v", "1", "-update", "1", png]);
  if (r.status !== 0) throw new Error(`ffmpeg failed at ${j.t}s:\n${r.stderr.toString().slice(-1500)}`);
  return png;
}

function main() {
  const o = options(process.argv.slice(2));
  if (!existsSync(o.video)) { console.error(`no video at ${o.video} — pass --video`); process.exit(2); }
  mkdirSync(o.out, { recursive: true });
  const words = cutWords(o.work);
  for (const j of o.joints) console.log(sheet(o, j, words));
}

main();

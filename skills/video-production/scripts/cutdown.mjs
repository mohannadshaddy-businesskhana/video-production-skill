/* Cut a master down to shorter durations using marked segments.
 *
 *   node cutdown.mjs --master master.mp4 --marks marks.json --out out/
 *   node cutdown.mjs --template
 *
 * A cutdown is a story decision, not a trim. `marks.json` records which segments
 * a shorter version is allowed to keep, so the decision is made once by a person
 * and applied mechanically after that.
 *
 * Segments are cut on frame boundaries and concatenated with a re-encode — a
 * stream copy would snap every cut to the nearest keyframe, which is what makes
 * naive cutdowns drift out of sync with their own audio.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf("--" + n); return i === -1 ? d : argv[i + 1]; };

const TEMPLATE = {
  fps: 30,
  durations: [30, 15, 6],
  segments: [
    { id: "hook",  in: 0,    out: 90,   keepIn: [30, 15, 6] },
    { id: "claim", in: 600,  out: 870,  keepIn: [30, 15] },
    { id: "proof", in: 870,  out: 1080, keepIn: [30] },
    { id: "cta",   in: 1080, out: 1260, keepIn: [30, 15, 6] },
  ],
};

if (argv.includes("--template")) {
  console.log(JSON.stringify(TEMPLATE, null, 2));
  process.exit(0);
}

const master = flag("master");
const marksPath = flag("marks");
const outDir = flag("out", "cutdowns");
if (!master || !marksPath) {
  console.error("usage: cutdown.mjs --master <mp4> --marks <json> [--out <dir>]");
  console.error("       cutdown.mjs --template");
  process.exit(2);
}

const marks = JSON.parse(await (await import("node:fs/promises")).readFile(marksPath, "utf8"));
const fps = marks.fps || 30;

const run = (args) => new Promise((res, rej) => {
  const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  p.stderr.on("data", (d) => { err += d; });
  p.on("close", (c) => (c === 0 ? res() : rej(new Error(err.slice(-800)))));
});

await mkdir(outDir, { recursive: true });
const tmp = join(outDir, ".cut-tmp");
await mkdir(tmp, { recursive: true });

for (const target of marks.durations) {
  const keep = marks.segments.filter((s) => (s.keepIn || []).includes(target));
  if (!keep.length) {
    console.error(`no segments marked for ${target}s — skipping`);
    continue;
  }

  const frames = keep.reduce((n, s) => n + (s.out - s.in), 0);
  const have = frames / fps;
  const parts = [];

  for (const [i, s] of keep.entries()) {
    const part = join(tmp, `${target}-${i}.mp4`);
    await run(["-y", "-v", "error", "-i", master,
      "-ss", (s.in / fps).toFixed(3), "-to", (s.out / fps).toFixed(3),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", part]);
    parts.push(part);
  }

  const list = join(tmp, `${target}.txt`);
  await writeFile(list, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"), "utf8");
  const out = join(outDir, `cutdown-${target}s.mp4`);
  await run(["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out]);

  const flag2 = Math.abs(have - target) > 1.5 ? "  ⚠ marked segments do not sum to the target" : "";
  console.log(`${out}  ${have.toFixed(1)}s from ${keep.length} segment(s)${flag2}`);
}

await rm(tmp, { recursive: true, force: true });
console.log("\nRe-run delivery_qc.mjs on each cutdown — a trim changes duration, and duration is a spec.");

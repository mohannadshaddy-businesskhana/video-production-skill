// Where the eyes can leave the lens: every stretch without speech that the cut kept. A glance to
// the side with a chair creak survived the pause rule because the creak was not silence (200646,
// review 1). This tiles each such stretch, 5 frames a second, one row per stretch, so the gaze can
// be checked by eye before rendering.
// Usage: node pause_sheet.mjs <work dir> <out.png> [--min 0.3]
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const SR = 8000, HOP = 80, SPEECH_BELOW_LOUD_DB = 22, FPS_SHEET = 5, MAX_ROWS = 24;
const args = process.argv.slice(2);
const [dir, out] = args;
const min = args.includes("--min") ? +args[args.indexOf("--min") + 1] : 0.3;
const r = spawnSync("ffmpeg", ["-v", "error", "-i", join(dir, "aroll16k.mp3"), "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 2 ** 30 });
const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
const db = [];
for (let i = 0; i + HOP <= pcm.length; i += HOP) { let s = 0; for (let k = i; k < i + HOP; k++) s += pcm[k] * pcm[k]; db.push(10 * Math.log10(s / HOP + 1e-12)); }
const loud = [...db].sort((a, b) => a - b)[Math.floor(db.length * 0.95)];

// "not speech" is looser than the pause rule's silence: a creak or a breath counts as no speech
const stretches = [];
for (let f = 0, a = -1; f <= db.length; f++) {
  const quiet = f < db.length && db[f] < loud - SPEECH_BELOW_LOUD_DB;
  if (quiet && a < 0) a = f;
  if (!quiet && a >= 0) { const s = a * HOP / SR, e = f * HOP / SR; if (e - s >= min) stretches.push([s, e]); a = -1; }
}
const rows = stretches.slice(0, MAX_ROWS);
const inputs = rows.flatMap(([s, e]) => ["-ss", String(Math.max(0, s - 0.2)), "-t", String(e - s + 0.4), "-i", join(dir, "aroll_norm.mp4")]);
const cols = Math.max(...rows.map(([s, e]) => Math.ceil((e - s + 0.4) * FPS_SHEET)), 1);
const graph = rows.map((_, i) => `[${i}:v]fps=${FPS_SHEET},crop=640:420:220:170,scale=160:105,tile=${cols}x1:padding=2[r${i}]`).join(";")
  + ";" + rows.map((_, i) => `[r${i}]`).join("") + `vstack=inputs=${rows.length}[o]`;
if (rows.length) spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", rows.length > 1 ? graph : graph.replace(/;\[r0\]vstack=inputs=1\[o\]/, "").replace("[r0]", "[o]"), "-map", "[o]", "-frames:v", "1", out]);
console.log(`${stretches.length} stretches without speech ≥ ${min}s${stretches.length > MAX_ROWS ? ` (first ${MAX_ROWS} drawn)` : ""}:`);
rows.forEach(([s, e], i) => console.log(`  row ${i + 1}: ${s.toFixed(2)}–${e.toFixed(2)}`));

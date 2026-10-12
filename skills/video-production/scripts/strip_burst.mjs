#!/usr/bin/env node
/* strip_burst.mjs — cut the noise burst Gemini TTS leaves at the end of a take.
 *
 *   node strip_burst.mjs <dir of line wavs> [--apply]   (dry run lists; --apply rewrites, originals backed up to tmp)
 *   import { stripLine } — call it on every line right after it is cached (tts_batch / your voice step)
 *
 * Gemini's raw PCM ends with ~100–200 ms of broadband noise at −4…−10 dB, after a short silence (measured
 * 12 Oct 2026 on 3.8-flash-tts, 3.1 and lite). It is louder than speech, so the trim-to-speech step keeps it
 * and the breath fix (which only touches QUIET stretches) leaves it: the client heard it as hiss (failure-log #81).
 * Rule: a loud run of ≤ MAX_BURST at the very end, after ≥ MIN_GAP below QUIET, is cut at the gap.
 */
import { readdirSync, copyFileSync, mkdirSync, renameSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";


const CACHE = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const STEP = 0.01, QUIET = -45, MIN_GAP = 0.08, MAX_BURST = 0.35, KEEP = 0.05, LOUD = -14, FLAT = 8;

function levels(f) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af",
    "aresample=48000,asetnsamples=480,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level",
    "-f", "null", "-"], { encoding: "utf8" });
  return [...(r.stderr || "").matchAll(/RMS_level=(-?[0-9.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -120 : +m[1]));
}

// where to cut (seconds), or null when the take ends cleanly
export function burstCut(lv) {
  let end = lv.length;
  while (end > 0 && lv[end - 1] < QUIET) end--;           // trailing silence after the burst, if any
  let b = end;
  while (b > 0 && lv[b - 1] >= QUIET) b--;                 // the last loud run
  if (end === b || (end - b) * STEP > MAX_BURST) return null;
  let g = b;
  while (g > 0 && lv[g - 1] < QUIET) g--;                  // the gap before it
  if ((b - g) * STEP < MIN_GAP || g === 0) return null;
  // noise, not a short last word: loud and FLAT (speech moves by more than ${FLAT} dB across 100 ms)
  const run = lv.slice(b, end), core = run.length > 6 ? run.slice(2, -2) : run;   // its own rise and fall excluded
  const mean = core.reduce((x, y) => x + y, 0) / core.length;
  if (mean < LOUD || Math.max(...core) - Math.min(...core) > FLAT) return null;
  return +(g * STEP + KEEP).toFixed(3);
}


// cut the burst from one cached line (wav + its word timings); returns the cut, or null when clean
export function stripLine(src, bak) {
  const cut = burstCut(levels(src));
  if (cut === null) return null;
  const jf = src.replace(/\.wav$/, ".json");
  if (bak) { copyFileSync(src, join(bak, basename(src))); if (existsSync(jf)) copyFileSync(jf, join(bak, basename(jf))); }
  const tmp = src + ".tmp.wav";
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", `atrim=end=${cut},afade=t=out:st=${Math.max(0, cut - 0.03)}:d=0.03`, tmp], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(src + ": " + r.stderr);
  renameSync(tmp, src);
  // the aligner stretched the last word over the burst: end it where the audio now ends
  if (existsSync(jf)) writeFileSync(jf, JSON.stringify(JSON.parse(readFileSync(jf, "utf8"))
    .map(([s, d, w]) => [s, +Math.max(0.05, Math.min(d, cut - 0.02 - s)).toFixed(3), w])), "utf8");
  return cut;
}

if (/[\\/]strip_burst\.mjs$/.test(process.argv[1] || "")) {
  const apply = process.argv.includes("--apply");
  const bak = join(tmpdir(), "tts-burst-backup"); if (apply) mkdirSync(bak, { recursive: true });
  const files = readdirSync(CACHE).filter((x) => x.endsWith(".wav"));
  const hit = files.filter((f) => (apply ? stripLine(join(CACHE, f), bak) : burstCut(levels(join(CACHE, f)))) !== null).length;
  console.log(`${hit}/${files.length} cached lines end with a noise burst${apply ? ` — cut (originals in ${bak})` : " (dry run)"}`);
}

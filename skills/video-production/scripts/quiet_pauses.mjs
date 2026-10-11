#!/usr/bin/env node
/* quiet_pauses.mjs — take the breath and hiss out of the pauses in a TTS line, leave the speech alone.
 *
 *   node quiet_pauses.mjs <in.wav> <out.wav> [--floor -34] [--min 0.15] [--cut 0.125]
 *
 * Measures the RMS level every 10 ms; every stretch below --floor dB that lasts at least --min seconds
 * is turned down by --cut (0.125 = −18 dB) in its core, keeping 30 ms at each edge so word tails and
 * attacks are untouched. Failure-log #73: a gate (agate) took only 3–4 dB off, and silencedetect —
 * which reads peaks — did not see a breath at all; RMS per 10 ms does.
 */
import { spawnSync } from "node:child_process";

export function quietPauses(src, dst, { floor = -34, min = 0.15, cut = 0.125 } = {}) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", src, "-af",
    "aresample=48000,asetnsamples=480,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level",
    "-f", "null", "-"], { encoding: "utf8" });
  const lv = [...(r.stderr || "").matchAll(/RMS_level=(-?[0-9.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -120 : +m[1]));
  const spans = [];
  for (let i = 0; i < lv.length;) {
    if (lv[i] >= floor) { i++; continue; }
    let j = i; while (j < lv.length && lv[j] < floor) j++;
    if ((j - i) * 0.01 >= min) spans.push([(i + 3) * 0.01, (j - 3) * 0.01]);
    i = j;
  }
  const f = spans.filter(([a, b]) => b - a > 0.04)
    .map(([a, b]) => `volume=volume=${cut}:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'`);
  const g = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", f.length ? f.join(",") : "anull", dst], { encoding: "utf8" });
  if (g.status !== 0) throw new Error("quietPauses failed: " + g.stderr);
  return spans.length;
}

if (/quiet_pauses\.mjs$/.test(process.argv[1] || "")) {
  const [src, dst, ...rest] = process.argv.slice(2);
  if (!src || !dst) { console.error("usage: quiet_pauses.mjs <in.wav> <out.wav> [--floor -34] [--min 0.15] [--cut 0.125]"); process.exit(2); }
  const opt = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? +rest[i + 1] : d; };
  const n = quietPauses(src, dst, { floor: opt("--floor", -34), min: opt("--min", 0.15), cut: opt("--cut", 0.125) });
  console.log(`${n} pauses quietened → ${dst}`);
}

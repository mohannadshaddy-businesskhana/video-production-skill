// Every joint of a cut should meet silence on both sides. A joint that lands on sound is where a
// word was split — "...الموقع" was left hanging between two sentences in 135148b (review 1).
// Flags each joint whose last or first 40 ms is speech-loud; listen to the flagged ones by ear
// (clipcheck.mjs) before rendering.
// Usage: node joint_check.mjs <aroll16k.mp3> <joints.json>   (exit 1 if any joint is flagged)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SR = 16000, SIDE_S = 0.04, SPEECH_BELOW_LOUD_DB = 22, LEAD_MAX_S = 0.15, QUIET_BELOW_LOUD_DB = 30;
const [audio, jointsFile] = process.argv.slice(2);
const r = spawnSync("ffmpeg", ["-v", "error", "-i", audio, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 2 ** 30 });
const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
const level = (a, b) => {
  let s = 0, n = 0;
  for (let i = Math.max(0, Math.round(a * SR)); i < Math.min(pcm.length, Math.round(b * SR)); i++, n++) s += pcm[i] * pcm[i];
  return 10 * Math.log10(s / Math.max(n, 1) + 1e-12);
};
const hops = [];
for (let t = 0; t + 0.01 <= pcm.length / SR; t += 0.01) hops.push(level(t, t + 0.01));
const loud = [...hops].sort((a, b) => a - b)[Math.floor(hops.length * 0.95)];

let bad = 0;
const lead = hops.findIndex((d) => d > loud - QUIET_BELOW_LOUD_DB) * 0.01;
if (lead > LEAD_MAX_S) { bad++; console.log(`SILENT OPENING ${lead.toFixed(2)}s before the first sound`); }
for (const j of JSON.parse(readFileSync(jointsFile, "utf8"))) {
  const before = level(j.t - SIDE_S, j.t), after = level(j.t, j.t + SIDE_S);
  const hot = [before, after].map((d) => d > loud - SPEECH_BELOW_LOUD_DB);
  if (hot[0] || hot[1]) {
    bad++;
    console.log(`JOINT ${j.t.toFixed(2)}s on sound (${hot[0] ? "end of kept word" : ""}${hot[0] && hot[1] ? " + " : ""}${hot[1] ? "start of next" : ""}) — ${j.reason.slice(0, 50)}`);
  }
}
console.log(bad ? `${bad} joint(s) to listen to` : "joints land on silence");
process.exit(bad ? 1 : 0);

// Ends a take with a stretch of another take of the same talk — 131735 trailed off before its
// close, and the earlier take 131305 (same set, minutes before) carries the close (review 1).
// The work dir's source becomes [whole take] + [other from..to]; words.json follows. The original
// source is kept as repaired_norm.orig.mp4 / words.orig.json, so a re-run starts from it.
// Usage: node append.mjs <work dir> <other work dir> <from> <to>     (seconds on the other take's clock)
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const [dir, other, from, to] = process.argv.slice(2);
const a = +from, b = +to;
const src = join(dir, "repaired_norm.orig.mp4"), words = join(dir, "words.orig.json");
if (!existsSync(src)) { renameSync(join(dir, "repaired_norm.mp4"), src); renameSync(join(dir, "words.json"), words); }
const takeLen = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], { encoding: "utf8" }).stdout;

const graph = `[0:v]setpts=PTS-STARTPTS[v0];[0:a]asetpts=PTS-STARTPTS[a0];`
  + `[1:v]trim=${a}:${b},setpts=PTS-STARTPTS[v1];[1:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]`;
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-i", join(other, "repaired_norm.mp4"), "-filter_complex", graph,
  "-map", "[v]", "-map", "[a]", "-r", "30", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p",
  "-c:a", "pcm_s16le", join(dir, "repaired_norm.mp4")], { encoding: "utf8" });
if (r.status) { console.error(r.stderr); process.exit(1); }
spawnSync("ffmpeg", ["-v", "error", "-y", "-i", join(dir, "repaired_norm.mp4"), "-vn", "-ac", "1", "-ar", "16000",
  "-c:a", "libmp3lame", "-b:a", "48k", join(dir, "voice16k.mp3")]);

const mine = JSON.parse(readFileSync(words, "utf8"));
const theirs = JSON.parse(readFileSync(join(other, "words.json"), "utf8"));
const shift = (w, d) => ({ ...w, start: +(w.start + d).toFixed(3), end: +(w.end + d).toFixed(3) });
const tail = theirs.segments.map((s) => ({ ...s, words: s.words.filter((w) => w.start >= a - 0.05 && w.end <= b + 0.05) }))
  .filter((s) => s.words.length)
  .map((s) => { const ws = s.words.map((w) => shift(w, takeLen - a)); return { ...s, words: ws, start: ws[0].start, end: ws.at(-1).end, text: ws.map((w) => w.text).join(" ") }; });
writeFileSync(join(dir, "words.json"), JSON.stringify({ ...mine, segments: [...mine.segments, ...tail] }, null, 1));
console.log(`take ${takeLen.toFixed(2)} s + ${(b - a).toFixed(2)} s from ${other}: the close starts at ${takeLen.toFixed(2)}`);

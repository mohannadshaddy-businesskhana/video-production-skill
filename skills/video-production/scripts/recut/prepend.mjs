// Puts a stretch of the take in front of it as a cold open — the take's own hook was lost to
// receiver holes, and its closing line says the same thing cleanly (200316, review 1).
// The work dir's source becomes [open] + [whole take]; words.json follows. The original source is
// kept as repaired_norm.orig.mp4 / words.orig.json, so a re-run starts from it.
// Usage: node prepend.mjs <work dir> <from> <to>      (raw seconds of the stretch to open with)
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const [dir, from, to] = process.argv.slice(2);
const a = +from, b = +to, len = b - a;
const src = join(dir, "repaired_norm.orig.mp4"), words = join(dir, "words.orig.json");
if (!existsSync(src)) { renameSync(join(dir, "repaired_norm.mp4"), src); renameSync(join(dir, "words.json"), words); }

// one re-encode with trim + concat keeps picture and sound on the same frames (30 fps CFR)
const graph = `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v0];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a0];`
  + `[0:v]setpts=PTS-STARTPTS[v1];[0:a]asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]`;
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
  "-r", "30", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le",
  join(dir, "repaired_norm.mp4")], { encoding: "utf8" });
if (r.status) { console.error(r.stderr); process.exit(1); }
spawnSync("ffmpeg", ["-v", "error", "-y", "-i", join(dir, "repaired_norm.mp4"), "-vn", "-ac", "1", "-ar", "16000",
  "-c:a", "libmp3lame", "-b:a", "48k", join(dir, "voice16k.mp3")]);

const doc = JSON.parse(readFileSync(words, "utf8"));
const shift = (w, d) => ({ ...w, start: +(w.start + d).toFixed(3), end: +(w.end + d).toFixed(3) });
const open = doc.segments.map((s) => ({ ...s, words: s.words.filter((w) => w.start >= a - 0.05 && w.end <= b + 0.05) }))
  .filter((s) => s.words.length)
  .map((s) => { const ws = s.words.map((w) => shift(w, -a)); return { ...s, words: ws, start: ws[0].start, end: ws.at(-1).end, text: ws.map((w) => w.text).join(" ") }; });
const rest = doc.segments.map((s) => { const ws = s.words.map((w) => shift(w, len)); return { ...s, words: ws, start: ws[0].start, end: ws.at(-1).end }; });
writeFileSync(join(dir, "words.json"), JSON.stringify({ ...doc, segments: [...open, ...rest] }, null, 1));
console.log(`opened with ${len.toFixed(2)} s (${open.map((s) => s.text).join(" / ")}); the take now starts at ${len.toFixed(2)}`);

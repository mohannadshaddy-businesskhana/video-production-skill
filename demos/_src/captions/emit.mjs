/* Demo 10 — captions-led, from a measured voice.
 *
 *   node demos/_src/captions/emit.mjs
 *
 * The voice sets the timing. Its timings.json, from voice_timings.mjs --words,
 * holds every line's measured duration and every word's measured start. This
 * places the lines on the film's clock, writes the composition with the
 * voice's own takes placed line by line, and a script whose beats are those
 * lines. A slower voice makes a longer film, and nothing here is estimated.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, "..", "..");
const DEMO = join(DEMOS, "10-captions");
const VOICE = { dir: "captions-podcaster-1", label: "Gemini TTS, ar-eg-podcaster-1" };
const MEASURED = join(DEMOS, "_assets", "voice", VOICE.dir, "measured");

const LEAD = 0.1;               // s before the first word: the note has just started playing
const SHOW_AHEAD = 0.25;        // a line is on the page this long before its first word is said
// after the last word: the name comes up (0.3s) and is read (1.5s)
const TAIL = 2.0;
const FPS = 30, BARS = 44;
const BED_AT_19 = 0.09;         // the bed's gain under a voice at -19 LUFS, as in the whiteboard

const shift = (s) => +(LEAD + s).toFixed(3);
function layout(T) {
  const lines = T.lines.map((l) => {
    if (!l.words) throw new Error(`${l.id} has no word timings — measure with voice_timings.mjs --words`);
    return { id: l.id, text: l.text, file: l.file, duration: l.duration, start: shift(l.start), end: shift(l.end),
             words: l.words.map((w) => ({ w: w.w, start: shift(w.start), end: shift(w.end) })) };
  });
  const last = lines[lines.length - 1];
  const dur = Math.ceil((last.end + TAIL) * FPS) / FPS;
  lines.forEach((l, i) => { l.in = i === 0 ? 0 : +(l.words[0].start - SHOW_AHEAD).toFixed(3); });
  lines.forEach((l, i) => { l.out = i < lines.length - 1 ? lines[i + 1].in : dur; });
  return { lines, dur, voiceEnd: last.end, ctaAt: +(last.end + 0.1).toFixed(3) };
}

/* the voice's loudness, read from the narration itself: the bars of the note
   over the time it plays, and one level per frame for the speaker's ring */
const RATE = 16000;
function samples(file) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"],
                      { maxBuffer: 1 << 27 });
  if (r.status !== 0) throw new Error(`could not read ${file}`);
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
}
function rms(pcm, a, b) {                     // a, b on the film's clock
  const i0 = Math.max(0, Math.round((a - LEAD) * RATE)), i1 = Math.min(pcm.length, Math.round((b - LEAD) * RATE));
  let s = 0;
  for (let i = i0; i < i1; i++) s += pcm[i] * pcm[i];
  return i1 > i0 ? Math.sqrt(s / (i1 - i0)) : 0;
}
function loudness(pcm, lay) {
  const bin = lay.voiceEnd / BARS;
  const raw = Array.from({ length: BARS }, (_, k) => rms(pcm, k * bin, (k + 1) * bin));
  const top = Math.max(...raw) || 1;
  const wave = raw.map((v) => +((v / top) ** 0.6).toFixed(3));
  const per = Array.from({ length: Math.round(lay.dur * FPS) + 1 }, (_, f) => rms(pcm, f / FPS, (f + 1) / FPS));
  const p95 = [...per].sort((x, y) => x - y)[Math.floor(per.length * 0.95)] || 1;
  return { wave, level: per.map((v) => +(Math.min(1, v / p95) ** 0.8).toFixed(3)) };
}

// the page's words: one span per spoken word; a dash rides with the word before it
function captionHtml(l) {
  const spans = [];
  for (const tok of l.text.split(/\s+/).filter(Boolean)) {
    if (/[\p{L}\p{N}]/u.test(tok)) spans.push(tok);
    else if (spans.length) spans[spans.length - 1] += " " + tok;
  }
  if (spans.length !== l.words.length)
    throw new Error(`${l.id}: ${spans.length} words on the page, ${l.words.length} measured`);
  return `        <div class="cap" id="cap-${l.id}">${spans.map((s) => `<span class="w">${s}</span>`).join(" ")}</div>`;
}

/* the beats end where their lines end: the pause after a line belongs to the
   one it leads into, and the hook is judged by when its last word is said */
const frames = (s) => Math.round(s * FPS);
function scriptFor(base, lay) {
  const edges = [0, ...lay.lines.slice(0, -1).map((l) => frames(l.end)), frames(lay.dur)];
  return {
    ...base,
    title: `${base.title} · ${VOICE.label}`,
    note: `Frames from the measured narration (${VOICE.label}): each beat is its line's spoken duration `
      + "and the pause before it — emitted by demos/_src/captions/emit.mjs.",
    beats: base.beats.map((b, i) => ({ ...b, frames: [edges[i], edges[i + 1]], spoken_s: lay.lines[i].duration })),
  };
}

function page(T, lay, { wave, level }) {
  const mean = T.lines.reduce((s, l) => s + (l.lufs ?? -19), 0) / T.lines.length;
  const bed = BED_AT_19 * 10 ** ((mean + 19) / 20);
  const audio = lay.lines.map((l, i) =>
    `      <audio id="vo-${l.id}" src="assets/voice/${VOICE.dir}/measured/${l.file}" data-role="voice" `
    + `data-start="${l.start}" data-duration="${l.duration}" data-track-index="${11 + i}" data-volume="1"></audio>`)
    .join("\n");
  const html = readFileSync(join(HERE, "audiogram.html"), "utf8")
    .replace("@@VOICE@@", VOICE.label).replace("@@TITLE@@", "الكلام اللي بتقراه ده بيتقال دلوقتي")
    .replaceAll("@@DUR@@", String(+lay.dur.toFixed(3))).replace("@@BED@@", bed.toFixed(3))
    .replace("@@CAPTIONS@@", lay.lines.map(captionHtml).join("\n")).replace("@@AUDIO@@", audio)
    .replace("@@LINES@@", JSON.stringify(lay.lines.map(({ file, duration, ...l }) => l)))
    .replace("@@WAVE@@", JSON.stringify(wave)).replace("@@LEVEL@@", JSON.stringify(level))
    .replace("@@VOICE_END@@", String(lay.voiceEnd)).replace("@@CTA_AT@@", String(lay.ctaAt));
  if (html.includes("@@")) throw new Error("a placeholder was left unfilled");
  return html;
}

const timings = join(MEASURED, "timings.json");
if (!existsSync(timings)) {
  console.error(`not measured yet: ${relative(DEMOS, timings)} — run tts_gemini.mjs, then voice_timings.mjs --words`);
  process.exit(1);
}
const T = JSON.parse(readFileSync(timings, "utf8"));
const lay = layout(T);
const base = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
if (base.beats.length !== lay.lines.length) throw new Error(`${base.beats.length} beats for ${lay.lines.length} lines`);
writeFileSync(join(DEMO, "index.html"), page(T, lay, loudness(samples(join(MEASURED, "narration.wav")), lay)), "utf8");
writeFileSync(join(DEMO, "script.json"), JSON.stringify(scriptFor(base, lay), null, 2) + "\n", "utf8");
console.log(`10-captions  ${lay.dur.toFixed(2)}s  ${lay.lines.map((l) => `${l.id}@${l.start.toFixed(2)}`).join(" ")}`);

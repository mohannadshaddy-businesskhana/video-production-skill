// Word times from Groq Whisper, sent in pieces cut at the quietest moment near every CHUNK_S
// seconds. In one request Whisper collapsed after 52s of an 88s take (the rest came back as
// "??????"), and on others it invented a channel outro over the opening; short pieces with the
// talk's opening sentence as a prompt hold up.
// Usage: node groq_words.mjs <audio> <out.json> --key-file <.env with GROQ_API_KEY=> [--prompt "…"]
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const CHUNK_S = 15, SEARCH_S = 4;
const MIN_WORDS_PER_S = 1.2, MIN_SPLIT_S = 4, ECHO_WORD_S = 0.05, ECHO_RUN = 5;
// what Whisper writes when it stops listening: a YouTube outro, a subtitle credit
const INVENTED = /اشترك|القناة|ترجمة|نانسي|شكرا للمشاهدة/u;
const args = process.argv.slice(2);
const [audio, out] = args;
const opt = (n) => { const i = args.indexOf(`--${n}`); return i < 0 ? undefined : args[i + 1]; };
const key = (readFileSync(opt("key-file"), "utf8").match(/^GROQ_API_KEY=(.*)$/m) || [])[1]?.replace(/["\r ]/g, "");
if (!key) { console.error("no GROQ_API_KEY"); process.exit(2); }

function quietCuts(total) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", audio, "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], { maxBuffer: 2 ** 30 });
  const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const energy = (i) => { let e = 0; for (let k = i; k < i + 2400 && k < pcm.length; k++) e += pcm[k] * pcm[k]; return e; };
  const cuts = [0];
  for (let target = CHUNK_S; target < total - CHUNK_S / 2; target += CHUNK_S) {
    let best = target * 8000, bestE = Infinity;
    for (let i = (target - SEARCH_S) * 8000; i < (target + SEARCH_S) * 8000; i += 400) { const e = energy(i); if (e < bestE) { bestE = e; best = i; } }
    cuts.push(+((best + 1200) / 8000).toFixed(2));
  }
  return [...cuts, total];
}

async function piece(a, b, prompt) {
  const mp3 = spawnSync("ffmpeg", ["-v", "error", "-ss", String(a), "-t", String(b - a), "-i", audio, "-ac", "1", "-ar", "16000", "-f", "mp3", "-"], { maxBuffer: 1e8 }).stdout;
  const form = new FormData();
  form.append("file", new Blob([mp3], { type: "audio/mpeg" }), "piece.mp3");
  for (const [k, v] of [["model", "whisper-large-v3"], ["language", "ar"], ["temperature", "0"], ["response_format", "verbose_json"], ["timestamp_granularities[]", "word"]]) form.append(k, v);
  if (prompt) form.append("prompt", prompt);
  for (let i = 0; i < 4; i++) {
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
    if (r.ok) return (await r.json()).words || [];
    if (r.status !== 429 && r.status < 500) throw new Error(`groq ${r.status} ${(await r.text()).slice(0, 200)}`);
    await new Promise((z) => setTimeout(z, 8000));
  }
  throw new Error("groq kept refusing");
}

const total = +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio], { encoding: "utf8" }).stdout;
// A piece that comes back too sparse for its length, or carrying an invented outro, is split in
// two and asked again: a 22s piece came back as "اشتركوا في القناة" where its first 12s alone
// transcribed cleanly. A word with no letter ("??????") is Whisper giving up, not speech.
async function words(a, b, prompt, depth = 0) {
  let got = (await piece(a, b, prompt)).filter((w) => /\p{L}/u.test(w.word));
  // the prompt can come back as the transcript: on one take the opening sentence was returned
  // packed at 0.02s a word over the wrong seconds. Packed words are an echo — ask again without it
  // (a run of them, not a share: a 12-word echo sat inside a 40-word piece)
  let run = 0, longest = 0;
  for (const w of got) { run = w.end - w.start < ECHO_WORD_S ? run + 1 : 0; longest = Math.max(longest, run); }
  if (prompt && longest >= ECHO_RUN) return words(a, b, undefined, depth);
  const invented = got.some((w) => INVENTED.test(w.word));
  if ((invented || got.length < MIN_WORDS_PER_S * (b - a)) && b - a > MIN_SPLIT_S && depth < 3) {
    const mid = (a + b) / 2;
    return [...await words(a, mid, prompt, depth + 1), ...await words(mid, b, prompt, depth + 1)];
  }
  return got.filter((w) => !INVENTED.test(w.word))
    .map((w) => ({ word: w.word, start: +(a + w.start).toFixed(2), end: +(a + w.end).toFixed(2) }));
}

const cuts = quietCuts(total), all = [];
for (let i = 0; i + 1 < cuts.length; i++) all.push(...await words(cuts[i], cuts[i + 1], opt("prompt")));
writeFileSync(out, JSON.stringify({ words: all }, null, 1));
console.log(`groq: ${all.length} words in ${cuts.length - 1} pieces`);

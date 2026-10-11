// Hears what a short stretch of a recording actually contains, to place an edit point by ear:
// an aligner's word times were 0.4s off at a stumble, and only the transcribed clip showed it.
// Usage: node clipcheck.mjs <audio> <from:to> [<from:to> …] --key-file <.env>
import { spawnSync } from "node:child_process";
import { ask, keyFrom } from "./gemini.mjs";

const PROMPT = "Egyptian Arabic speech clip. Transcribe verbatim exactly what is audible, including partial syllables at the very start or end (write a partial syllable followed by -). Output only the transcript.";

const args = process.argv.slice(2);
const ki = args.indexOf("--key-file");
const key = keyFrom(args[ki + 1]);
const [src, ...ranges] = args.slice(0, ki);
for (const r of ranges) {
  const [a, b] = r.split(":").map(Number);
  const mp3 = spawnSync("ffmpeg", ["-v", "error", "-ss", String(a), "-t", String(b - a), "-i", src, "-ac", "1", "-ar", "16000", "-f", "mp3", "-"],
    { maxBuffer: 1e8 }).stdout;
  const { text } = await ask(key, [{ inline_data: { mime_type: "audio/mp3", data: mp3.toString("base64") } }, { text: PROMPT }]);
  console.log(`${r} => ${text.trim()}`);
}

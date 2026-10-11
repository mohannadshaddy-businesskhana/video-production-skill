// One door to Gemini for the tools: the key from a .env, and a model list walked in order.
// The free tier allows 20 requests a day per project per model (measured: the 21st answered 429
// GenerateRequestsPerDayPerProjectPerModel), so a model that is out of quota hands over to the next;
// a 503 (busy) waits and asks the same model again.
import { readFileSync } from "node:fs";

const MODELS = ["gemini-flash-latest", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview"];
const BUSY_RETRIES = 4, BUSY_WAIT_MS = 15000;
const exhausted = new Set();

export function keyFrom(envFile) {
  const k = (readFileSync(envFile, "utf8").match(/^GEMINI_API_KEY=(.*)$/m) || [])[1]?.replace(/["\r ]/g, "");
  if (!k) throw new Error(`no GEMINI_API_KEY in ${envFile}`);
  return k;
}

async function once(key, model, body) {
  for (let i = 0; i <= BUSY_RETRIES; i++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method: "POST", headers: { "content-type": "application/json" }, body });
    const j = await r.json();
    if (r.ok) return { text: j.candidates[0].content.parts.map((p) => p.text).join("") };
    if (r.status === 429) return { exhausted: true };
    if (r.status !== 503) throw new Error(`${model} ${r.status} ${j.error?.message?.slice(0, 200)}`);
    await new Promise((z) => setTimeout(z, BUSY_WAIT_MS));
  }
  throw new Error(`${model} stayed busy`);
}

// parts: Gemini content parts; json: ask for a JSON reply. Returns { text, model }.
export async function ask(key, parts, { json = false } = {}) {
  const body = JSON.stringify({ contents: [{ parts }],
    generationConfig: { temperature: 0, ...(json ? { responseMimeType: "application/json" } : {}) } });
  for (const model of MODELS) {
    if (exhausted.has(model)) continue;
    const r = await once(key, model, body);
    if (r.exhausted) { exhausted.add(model); continue; }
    return { text: r.text, model };
  }
  throw new Error("every Gemini model is out of today's free quota");
}

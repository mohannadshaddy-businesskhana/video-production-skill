// Turns an edit decision (where to start and end, what to remove, how long a pause may be) into
// a cut list repair_holes.mjs --no-clean executes, and re-times the words onto the edited clock.
// Usage: node plan_cuts.mjs <edit.json> <words.json> <outDir>
//   edit.json: { start, end, max_pause, keep_pause, remove: [{ from, to, reason }] } — start is moved
//   to the first sound after it, and every remove edge to the quietest point within SNAP_S
// Writes: cuts.json (holes format) · words_edit.json · joints.json (output times of every cut)
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const FPS = 30;
const SR = 16000, HOP = 160, QUIET_BELOW_LOUD_DB = 30;
// an edge is moved to the quietest 10 ms within this reach; one left mid-word kept "...الموقع"
// fragments between two sentences (135148b, review 1)
const SNAP_S = 0.15, EDGE_SPEECH_BELOW_LOUD_DB = 20;
// the first sound lands this soon after the first frame — a second of silence opened several videos
const LEAD_S = 0.06;

// Pauses are measured on the audio, not read from the transcript: a sentence boundary that was
// 6.5s out left 6.5s of silence at the head of one cut (195737).
function loudness(audio) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", audio, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 2 ** 30 });
  const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const db = [];
  for (let i = 0; i + HOP <= pcm.length; i += HOP) {
    let s = 0;
    for (let k = i; k < i + HOP; k++) s += pcm[k] * pcm[k];
    db.push(10 * Math.log10(s / HOP + 1e-12));
  }
  return { db, loud: [...db].sort((a, b) => a - b)[Math.floor(db.length * 0.95)] };
}

function quietest({ db }, t) {
  const lo = Math.max(0, Math.round((t - SNAP_S) * SR / HOP)), hi = Math.min(db.length - 1, Math.round((t + SNAP_S) * SR / HOP));
  let best = Math.round(t * SR / HOP);
  for (let f = lo; f <= hi; f++) if (db[f] < db[best]) best = f;
  return { t: (best + 0.5) * HOP / SR, db: db[best] ?? -120 };
}

// every hand-placed edge goes to the quiet beside it; one that finds no quiet is reported
function snapRemoves(lv, removes) {
  return removes.map((c) => {
    // exact: an edge placed by ear, where the quietest point nearby is inside a word
    if (c.exact) return c;
    const a = quietest(lv, c.from), b = quietest(lv, c.to);
    for (const [e, name] of [[a, "from"], [b, "to"]])
      if (e.db > lv.loud - EDGE_SPEECH_BELOW_LOUD_DB) console.error(`SPEECH AT EDGE ${name} ${c[name]}s (${c.reason.slice(0, 40)})`);
    return { ...c, from: a.t, to: b.t };
  });
}

function firstSound({ db, loud }, after) {
  for (let f = Math.round(after * SR / HOP); f < db.length; f++) if (db[f] > loud - QUIET_BELOW_LOUD_DB) return f * HOP / SR;
  return after;
}

function pauseCuts({ db, loud }, maxPause, keep) {
  const out = [];
  for (let f = 0, a = -1; f <= db.length; f++) {
    const quiet = f < db.length && db[f] < loud - QUIET_BELOW_LOUD_DB;
    if (quiet && a < 0) a = f;
    if (!quiet && a >= 0) {
      const from = a * HOP / SR, to = f * HOP / SR;
      if (to - from > maxPause) out.push({ from: from + keep, to: to - keep, reason: "pause" });
      a = -1;
    }
  }
  return out;
}

// Same snapping as repair_holes.mjs, so the clock re-timed here is the clock it cuts.
function frameRuns(cuts) {
  const runs = cuts.map((c) => [Math.floor(c.from * FPS), Math.ceil(c.to * FPS), c.reason])
    .sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) { last[1] = Math.max(last[1], r[1]); last[2] += "+" + r[2]; }
    else merged.push([...r]);
  }
  return merged;
}

function retimer(runs) {
  return (t) => {
    let shift = 0;
    for (const [a, b] of runs) {
      if (t >= b / FPS) shift += (b - a) / FPS;
      else if (t > a / FPS) return null;              // inside a removed range
    }
    return +(t - shift).toFixed(3);
  };
}

function main() {
  const [editFile, wordsFile, outDir] = process.argv.slice(2);
  const edit = JSON.parse(readFileSync(editFile, "utf8"));
  const segments = JSON.parse(readFileSync(wordsFile, "utf8")).segments;
  const lv = loudness(join(outDir, "voice16k.mp3"));
  const sourceEnd = lv.db.length * HOP / SR;           // the true end — a short source_end left 3 s of an empty chair
  const head = Math.max(edit.start, firstSound(lv, edit.start) - LEAD_S);
  const cuts = [{ from: 0, to: head, reason: "head" }, ...snapRemoves(lv, edit.remove),
    ...pauseCuts(lv, edit.max_pause, edit.keep_pause), { from: edit.end, to: sourceEnd + 0.1, reason: "tail" }];
  const runs = frameRuns(cuts.filter((c) => c.to > c.from));
  const at = retimer(runs);
  const words = segments.flatMap((s, si) => s.words.map((w) => ({ ...w, seg: si })))
    .map((w) => ({ text: w.text, seg: w.seg, start: at(w.start), end: at(Math.min(w.end, edit.end)) }))
    .filter((w) => w.start !== null && w.end !== null);
  const inner = runs.filter(([a, , r]) => a > 0 && !r.includes("tail"));
  const joints = inner.map(([a, , r]) => ({ t: at(a / FPS - 1e-6) ?? 0, reason: r }));
  // A quarter frame inside each edge: repair_holes floors the start and ceils the end, and an
  // edge sitting exactly on a frame boundary gained a frame from float error (7 frames over 11 cuts).
  const list = runs.map(([a, b, reason]) => ({ t: +((a + 0.25) / FPS).toFixed(4),
    ms: Math.round(((b - a - 0.5) / FPS) * 1000), reason }));
  writeFileSync(join(outDir, "cuts.json"), JSON.stringify({ list }, null, 2));
  writeFileSync(join(outDir, "words_edit.json"), JSON.stringify(words, null, 2));
  writeFileSync(join(outDir, "joints.json"), JSON.stringify(joints, null, 2));
  const removed = runs.reduce((n, [a, b]) => n + (b - a), 0) / FPS;
  console.log(JSON.stringify({ cuts: runs.length, joints: joints.length, removed_s: +removed.toFixed(2),
    words: words.length, out_s: +(sourceEnd - removed).toFixed(2) }));
}

main();

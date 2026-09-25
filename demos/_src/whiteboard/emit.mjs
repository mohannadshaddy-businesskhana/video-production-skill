/* Demo 05 — the whiteboard, one composition per voice.
 *
 *   node demos/_src/whiteboard/emit.mjs                     every voice that has been measured
 *   node demos/_src/whiteboard/emit.mjs --main gemini-male  …and that one as 05-explainer itself
 *
 * The voice sets the timing. A voice's timings.json — from tts_gemini.mjs or
 * voice_timings.mjs — holds every line's measured duration. This lays the
 * lines out, writes the composition with the voice's own takes placed line by
 * line, and writes a script whose beats are those lines; the hand draws each
 * line's drawing inside its beat. A slower voice makes a longer film, and
 * nothing here is estimated.
 *
 * Each voice gets a folder, 05-explainer/<key>/, so the same board can be
 * heard in every voice before one is chosen.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, "..", "..");
const DEMO = join(DEMOS, "05-explainer");
const argv = process.argv.slice(2);
const main = argv.includes("--main") ? argv[argv.indexOf("--main") + 1] : null;

const VOICES = [
  { key: "gemini-male", dir: "gemini-podcaster-1", label: "Gemini TTS, ar-eg-podcaster-1" },
  { key: "gemini-female", dir: "gemini-podcaster-11", label: "Gemini TTS, ar-eg-podcaster-11" },
  { key: "recorded", dir: "recorded", label: "a recorded voice" },
];

/* ── the drawings ─────────────────────────────────────────────────────────
   One stroke per path: a path with several subpaths would make the pen jump
   between them, so every lift of the pen is a separate stroke.

   A stroke is [class, path] — drawn as its line begins — or [class, path,
   group]: a finishing detail. Details are what keep the hand moving while the
   voice pauses (#49); each line takes whole groups of them, in order, for as
   long as they fit before the next line begins, so a clock gets all four of
   its ticks or none. */

// a closed circle or ellipse starting at its rightmost point. The arc's end
// sits just ABOVE the start — an end offset sideways solves to a different
// ellipse, one whose top or bottom is the start point, shifted by a radius
const ring = (cx, cy, rx, ry = rx) => `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy - 0.1}`;
const box = (x0, y0, x1, y1, r) =>
  `M ${x0 + r} ${y0} H ${x1 - r} Q ${x1} ${y0} ${x1} ${y0 + r} V ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1} `
  + `H ${x0 + r} Q ${x0} ${y1} ${x0} ${y1 - r} V ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0} Z`;

const PEOPLE = [900, 660, 420, 180];     // the first in line stands on the right, where Arabic starts
const HEAD = { y: 936, r: 46 };
const DRAW = {
  l1: [                                   // a calendar page: ٧ crossed out, ١ written beside it
    ["ink", box(580, 262, 1000, 600, 20)],
    ["ink", "M 660 238 V 290"], ["ink", "M 920 238 V 290"],  // its rings
    ["ink", "M 580 330 H 1000"],
    ["ink b", "M 820 395 L 880 560 L 940 395"],            // ٧
    // an X, never one diagonal: a V with a single stroke through it reads as a
    // tick in a box — "done", the opposite of what is meant
    ["ink a b", "M 800 400 L 960 560"], ["ink a b", "M 960 400 L 800 560"],
    ["ink a b", "M 690 395 V 560"],                        // ١
    ["ink a", "M 664 588 H 716", "underline"],
  ],
  l2: [                                   // the idea
    ["ink", "M 162 528 A 100 100 0 1 1 298 528"],
    ["ink", "M 290 548 H 170"], ["ink", "M 182 582 H 278"], ["ink", "M 260 614 H 200"],
    ["ink a", "M 76 428 H 40"], ["ink a", "M 118 326 L 90 302"], ["ink a", "M 230 278 V 240"],
    ["ink a", "M 342 326 L 370 302"], ["ink a", "M 384 428 H 420"],
    ["ink t", "M 206 512 L 214 482 L 222 512 L 230 482 L 238 512 L 246 482 L 254 512", "filament"],
    ["ink t", "M 164 431 A 70 70 0 0 1 195 394", "shine"],
  ],
  l3: [                                   // four people in a row
    ...PEOPLE.flatMap((x) => [
      ["ink", ring(x, HEAD.y, HEAD.r)],
      ["ink", `M ${x + 70} 1145 Q ${x + 70} 1005 ${x} 1005 Q ${x - 70} 1005 ${x - 70} 1145`],
    ]),
    ...PEOPLE.map((x) => ["ink t", `M ${x - 16} 1012 L ${x} 1032 L ${x + 16} 1012`, "collars"]),
  ],
  // after the names: who hands the work to whom. Drawn from the left, where the
  // last name ends — starting at the far arrow cost a hop that did not fit
  l4: PEOPLE.slice(0, 3).reverse().flatMap((x) => [
    ["ink", `M ${x - 82} 1080 H ${x - 158}`, "arrows"],
    ["ink", `M ${x - 142} 1064 L ${x - 160} 1080 L ${x - 142} 1096`, "arrows"],
  ]),
  l5: [                                   // each waits for the one before: a clock between them
    ...PEOPLE.slice(0, 3).flatMap((x) => [
      ["ink a", ring(x - 120, HEAD.y, 32)],
      ["ink a", `M ${x - 120} 914 V ${HEAD.y} H ${x - 102}`],
    ]),
    // a clock face's ticks, all three clocks' twelve first, then their six…
    ...[["t12", 0, -29, 0, -25], ["t6", 0, 29, 0, 25], ["t3", 29, 0, 25, 0], ["t9", -29, 0, -25, 0]]
      .flatMap(([g, x1, y1, x2, y2]) => PEOPLE.slice(0, 3).map((x) =>
        ["ink a t", `M ${x - 120 + x1} ${HEAD.y + y1} L ${x - 120 + x2} ${HEAD.y + y2}`, g])),
  ],
  l6: [                                   // the tool does the four at once
    ["ink a b", ring(540, 1065, 520, 335)],
    ["ink a b", "M 1066 1065 A 526 341 0 0 1 540 1406", "again"],
  ],
  l7: [                                   // delivered in three sizes — 9:16, 1:1, 16:9
    ["ink", box(775, 1430, 854, 1570, 10)],
    ["ink", box(555, 1430, 695, 1570, 10)],
    ["ink", box(226, 1430, 475, 1570, 10)],
    ["ink t", "M 806 1486 L 828 1500 L 806 1514 Z", "play"],
    ["ink t", "M 614 1484 L 640 1500 L 614 1516 Z", "play"],
    ["ink t", "M 340 1484 L 366 1500 L 340 1516 Z", "play"],
  ],
  l8: [["ink a b", "M 800 1633 L 842 1673 L 930 1591"]], // try it — after the name has been read
};
const WORDS = {
  l4: ["كاتب", "مصمم", "مونتير", "مراجع"].map((text, i) =>
    ({ id: `w${i + 1}`, text, x: PEOPLE[i] - 120, y: 1160, w: 240, size: 54 })),
  l8: [{ id: "w5", text: "video-production", latin: true, x: 120, y: 1602, w: 620, size: 52 }],
};

// strokes come after their line's words (a list is written, then connected);
// the order within a line is the table's
const board = () => Object.entries(DRAW).map(([id, strokes]) =>
  `          <g id="g-${id}" data-line="${id}">\n`
  + strokes.map(([cls, d, group], k) => `            <path class="${cls}" d="${d}" data-seq="${100 + k}"`
    + `${group ? ` data-group="${group}"` : ""}/>`).join("\n")
  + "\n          </g>").join("\n");
const words = () => Object.entries(WORDS).flatMap(([line, ws]) => ws.map((w, k) =>
  `        <div class="word${w.latin ? " latin" : ""}" id="${w.id}" data-line="${line}" data-seq="${k}" `
  + `style="left:${w.x}px; top:${w.y}px; width:${w.w}px; font-size:${w.size}px"><span>${w.text}</span></div>`))
  .join("\n");

/* ── the timing ───────────────────────────────────────────────────────────
   Lines follow each other with the pause they were measured with; after the
   list of four names the voice breathes a little longer, as anyone would.
   The drawing fills every pause (board.html), so a pause is never dead air. */
const LEAD = 0.15;                      // s before the first word: the pen is already on the board
const GAP = 0.35;
const BREATH = { l4: 0.6 };
// after the last line starts: the name written (1.0s) and held to be read
// (1.6s), the tick, the hand gone — and the film ends with it
const TAIL = 3.25;
const FPS = 30;
const BED_AT_19 = 0.09;                 // the bed's gain under a voice at -19 LUFS

function layout(T) {
  let t = LEAD;
  const lines = T.lines.map((l) => {
    const row = { id: l.id, text: l.text, file: l.file, start: +t.toFixed(3), duration: l.duration,
                  end: +(t + l.duration).toFixed(3) };
    t += l.duration + (BREATH[l.id] ?? GAP);
    return row;
  });
  const last = lines[lines.length - 1];
  return { lines, dur: Math.ceil((last.start + TAIL) * FPS) / FPS };
}

const frames = (s) => Math.round(s * FPS);
function scriptFor(base, v, { lines, dur }) {
  const edges = [0, ...lines.slice(1).map((l) => frames(l.start)), frames(dur)];
  return {
    ...base,
    title: `${base.title} · ${v.label}`,
    note: `Frames from the measured narration (${v.label}): each beat is its line's spoken `
      + "duration and the pause after it — emitted by demos/_src/whiteboard/emit.mjs.",
    // spoken_s: the line is heard, so its beat is held to the voice's own time
    beats: base.beats.map((b, i) => ({ ...b, frames: [edges[i], edges[i + 1]], spoken_s: lines[i].duration })),
  };
}

function writeDemo(dir, v, T, lay, base) {
  mkdirSync(dir, { recursive: true });
  const level = T.lines.reduce((s, l) => s + (l.lufs ?? -19), 0) / T.lines.length;
  const bed = BED_AT_19 * 10 ** ((level + 19) / 20);
  const audio = lay.lines.map((l, i) =>
    `      <audio id="vo-${l.id}" src="assets/voice/${v.dir}/measured/${l.file}" data-role="voice" `
    + `data-start="${l.start}" data-duration="${l.duration}" data-track-index="${11 + i}" data-volume="1"></audio>`)
    .join("\n");
  const html = readFileSync(join(HERE, "board.html"), "utf8")
    .replace("@@VOICE@@", v.label).replace("@@TITLE@@", `سبورة — ${v.label}`)
    .replaceAll("@@DUR@@", String(+lay.dur.toFixed(3))).replace("@@BED@@", bed.toFixed(3))
    .replace("@@BOARD@@", board()).replace("@@WORDS@@", words()).replace("@@AUDIO@@", audio)
    .replace("@@LINES@@", JSON.stringify(lay.lines.map(({ file, duration, ...l }) => l)));
  if (html.includes("@@")) throw new Error(`${v.key}: a placeholder was left unfilled`);
  writeFileSync(join(dir, "index.html"), html, "utf8");
  writeFileSync(join(dir, "script.json"), JSON.stringify(scriptFor(base, v, lay), null, 2) + "\n", "utf8");
  if (dir !== DEMO) {
    copyFileSync(join(DEMO, "structure.json"), join(dir, "structure.json"));
    writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: "main", name: `05-explainer-${v.key}` }) + "\n");
    copyFileSync(join(DEMO, "package.json"), join(dir, "package.json"));
    const link = join(dir, "assets");
    if (!existsSync(link)) {
      const target = join(DEMOS, "_assets");
      const r = process.platform === "win32"
        ? spawnSync("cmd", ["/c", "mklink", "/J", link, target])
        : spawnSync("ln", ["-s", relative(dir, target), link]);
      if (r.status !== 0) throw new Error(`could not link ${link}`);
    }
  }
}

// the script's words live beside this file; only its frames are the voice's
const base = JSON.parse(readFileSync(join(HERE, "script.json"), "utf8"));
let emitted = 0;
for (const v of VOICES) {
  const timings = join(DEMOS, "_assets", "voice", v.dir, "measured", "timings.json");
  if (!existsSync(timings)) { console.log(`${v.key}: not measured yet — skipped (${relative(DEMOS, timings)})`); continue; }
  const T = JSON.parse(readFileSync(timings, "utf8"));
  const lay = layout(T);
  writeDemo(join(DEMO, v.key), v, T, lay, base);
  if (main === v.key) writeDemo(DEMO, v, T, lay, base);
  emitted++;
  console.log(`${v.key.padEnd(14)} ${lay.dur.toFixed(2)}s  ${lay.lines.map((l) => `${l.id}@${l.start.toFixed(2)}`).join(" ")}`
    + (main === v.key ? "   → 05-explainer" : ""));
}
if (main && !VOICES.some((v) => v.key === main)) throw new Error(`--main ${main}: no such voice`);
if (!emitted) { console.error("no voice has been measured — run tts_gemini.mjs or voice_timings.mjs first"); process.exitCode = 1; }

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

/* ── the board ────────────────────────────────────────────────────────────
   A real whiteboard, larger than the frame: 1620×2880 board units, in four
   parts of 810×1440. The camera frames one part at a time — a part fills the
   1080×1920 frame at 1.333× — and crosses the board in Arabic reading order:
   top right, top left, bottom right, bottom left. At the end it pulls back to
   the whole board, every drawing side by side. All coordinates below are
   board units. */
const PART = { w: 810 };
const PARTS = { z1: [810, 0], z2: [0, 0], z3: [810, 1440], z4: [0, 1440] };
const STAGE = {
  views: {
    open: [905, -26, 620],             // the hook: close on the calendar, the board's top edge in view
    ...Object.fromEntries(Object.entries(PARTS).map(([k, [x, y]]) => [k, [x, y, PART.w]])),
    all: [-30, -27, 1680],             // the whole board, its frame and its tray
    rest: [-52, -66, 1724],            // …drifting back a little further while it is looked at
  },
  // the part each line is drawn in; a line in a new part is where the camera moves
  lines: { l1: "open", l2: "z1", l3: "z2", l4: "z2", l5: "z2", l6: "z2", l7: "z3", l8: "z4" },
};

const PEOPLE = [675, 495, 315, 135];     // the first in line stands on the right, where Arabic starts
const HEAD = { y: 600, r: 40 };
const DRAW = {
  l1: [                                   // top right: a calendar page, ٧ crossed out, ١ beside it
    ["ink", box(1000, 330, 1430, 720, 22)],
    ["ink", "M 1085 300 V 362"], ["ink", "M 1345 300 V 362"],  // its rings
    ["ink", "M 1000 420 H 1430"],
    ["ink b", "M 1245 500 L 1305 680 L 1365 500"],         // ٧
    // an X, never one diagonal: a V with a single stroke through it reads as a
    // tick in a box — "done", the opposite of what is meant
    ["ink a b", "M 1225 505 L 1385 675"], ["ink a b", "M 1385 505 L 1225 675"],
    ["ink a b", "M 1110 500 V 680"],                       // ١
    ["ink a", "M 1080 712 H 1140", "underline"],
  ],
  l2: [                                   // top right, under it: the idea
    ["ink", "M 1140 1090 A 110 110 0 1 1 1290 1090"],
    ["ink", "M 1282 1112 H 1148"], ["ink", "M 1160 1150 H 1270"], ["ink", "M 1250 1186 H 1180"],
    ["ink a", "M 1030 980 H 990"], ["ink a", "M 1075 870 L 1045 842"], ["ink a", "M 1215 830 V 788"],
    ["ink a", "M 1355 870 L 1385 842"], ["ink a", "M 1400 980 H 1440"],
    ["ink t", "M 1188 1070 L 1197 1036 L 1206 1070 L 1215 1036 L 1224 1070 L 1233 1036 L 1242 1070", "filament"],
    ["ink t", "M 1142 983 A 78 78 0 0 1 1176 942", "shine"],
  ],
  l3: [                                   // top left: four people in a row
    ...PEOPLE.flatMap((x) => [
      ["ink", ring(x, HEAD.y, HEAD.r)],
      ["ink", `M ${x + 58} 780 Q ${x + 58} 660 ${x} 660 Q ${x - 58} 660 ${x - 58} 780`],
    ]),
    ...PEOPLE.map((x) => ["ink t", `M ${x - 13} 666 L ${x} 684 L ${x + 13} 666`, "collars"]),
  ],
  // after the names: who hands the work to whom. Drawn from the left, where the
  // last name ends — starting at the far arrow cost a hop that did not fit
  l4: PEOPLE.slice(0, 3).reverse().flatMap((x) => [
    ["ink", `M ${x - 66} 725 H ${x - 114}`, "arrows"],
    ["ink", `M ${x - 100} 713 L ${x - 116} 725 L ${x - 100} 737`, "arrows"],
  ]),
  l5: [                                   // each waits for the one before: a clock between them
    ...PEOPLE.slice(0, 3).flatMap((x) => [
      ["ink a", ring(x - 90, HEAD.y, 24)],
      ["ink a", `M ${x - 90} 584 V ${HEAD.y} H ${x - 78}`],
    ]),
    // a clock face's ticks, all three clocks' twelve first, then their six…
    ...[["t12", 0, -21, 0, -18], ["t6", 0, 21, 0, 18], ["t3", 21, 0, 18, 0], ["t9", -21, 0, -18, 0]]
      .flatMap(([g, x1, y1, x2, y2]) => PEOPLE.slice(0, 3).map((x) =>
        ["ink a t", `M ${x - 90 + x1} ${HEAD.y + y1} L ${x - 90 + x2} ${HEAD.y + y2}`, g])),
  ],
  l6: [                                   // the tool does the four's work at once
    ["ink a b", ring(405, 710, 395, 300)],
    ["ink a b", "M 802 710 A 399 304 0 0 1 405 1014", "again"],
    // a bridge ends a part: it leads the pen, and the camera with it, into the
    // next one, so the next line starts there on its first word
    ["ink a bridge to-z3", "M 640 975 Q 700 1750 955 2030"],
    ["ink a", "M 947 1999 L 955 2030 L 925 2019"],
  ],
  l7: [                                   // bottom right: delivered in three sizes — 9:16, 1:1, 16:9
    ["ink", box(1375, 2062, 1447, 2190, 10)],
    ["ink", box(1215, 2070, 1335, 2190, 10)],
    ["ink", box(983, 2082, 1175, 2190, 10)],
    ["ink t", "M 1404 2116 L 1420 2126 L 1404 2136 Z", "play"],
    ["ink t", "M 1266 2118 L 1286 2130 L 1266 2142 Z", "play"],
    ["ink t", "M 1070 2124 L 1090 2136 L 1070 2148 Z", "play"],
    ["ink a bridge to-z4", "M 975 2140 Q 860 2118 752 2135"],
    ["ink a", "M 775 2147 L 750 2135 L 774 2121"],
  ],
  l8: [                                   // bottom left: try it
    ["ink a b", "M 330 2262 L 380 2312 L 480 2212"],      // the tick — after the name has been read
  ],
};
const WORDS = {
  l4: ["كاتب", "مصمم", "مونتير", "مراجع"].map((text, i) =>
    ({ id: `w${i + 1}`, text, x: PEOPLE[i] - 85, y: 792, w: 170, size: 42 })),
  l8: [{ id: "w5", text: "video-production", latin: true, x: 105, y: 2105, w: 600, size: 50 }],
};

// strokes come after their line's words (a list is written, then connected),
// except a bridge, which leads into the part the words are on; the order
// within a line is the table's
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
// after the last line starts: the bridge into the last part, the name
// written (1.0s) and held to be read (1.6s), the tick, then the pull-back to
// the whole board (1.2s) and a moment to look at it — the CTA stays within
// the last 5s the script gate allows
const TAIL = 4.85;
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
    .replace("@@LINES@@", JSON.stringify(lay.lines.map(({ file, duration, ...l }) => l)))
    .replace("@@STAGE@@", JSON.stringify(STAGE));
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

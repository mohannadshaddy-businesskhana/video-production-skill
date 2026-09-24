/* One film, every ratio and language: writes 06-motion-graphics (vertical,
 * Arabic), its square and wide versions under 11-versions/, and its English
 * version under 12-localized/, each with the timeline inlined.
 *
 *   node demos/_src/motion-graphics/emit.mjs
 *
 * The timeline in film.html is shared verbatim; formats.mjs (geometry) and
 * LANGS below (strings) are the only things that fork — references/formats.md,
 * routes/localization.md. Output folders are named with words, never ratios:
 * a folder named 9x16 once broke the renderer's audio stage.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { FORMATS } from "./formats.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, "..", "..");
const SOURCE = join(DEMOS, "06-motion-graphics");

const x = (s) => `<span class="x">${s}</span>`;
/* The strings. English is not a translation of the layout, only of the words:
 * its lines run longer than the Arabic in this face, so the English version
 * sets them smaller and lets the longest take three lines (see OVERRIDES). */
const LANGS = {
  ar: {
    title: "شكل واحد بيحكي الفكرة", dir: "rtl", align: "right", font: '"Cairo",sans-serif',
    digits: "arabic", pct: "٪",
    lines: [[`الفيديو ده<br>${x("مفيهوش كاميرا.")}`, "الفيديو ده مفيهوش كاميرا."],
            [`أداة بتعمل الفيديو<br>من فكرة، ${x("بدل يوم تصوير.")}`, "أداة بتعمل الفيديو من فكرة، بدل يوم تصوير."],
            [`عندك رقم؟<br>${x("بيكبر قدامك.")}`, "عندك رقم؟ بيكبر قدامك."],
            [`عندك خطوات؟<br>${x("بتتبني ورا بعض.")}`, "عندك خطوات؟ بتتبني ورا بعض."],
            [`وكله<br>${x("من غير تصوير.")}`, "وكله من غير تصوير."],
            [`تابع —<br>${x("نوع جديد بكرة.")}`, "تابع — نوع جديد بكرة."]],
  },
  en: {
    title: "One shape tells the whole idea", dir: "ltr", align: "left", font: '"Inter",sans-serif',
    digits: "latin", pct: "%",
    lines: [[`This video<br>${x("has no camera.")}`, "This video has no camera."],
            [`A tool that makes video<br>from an idea —<br>${x("no shoot day.")}`,
             "A tool that makes video from an idea — no shoot day."],
            [`Got a number?<br>${x("Watch it grow.")}`, "Got a number? Watch it grow."],
            [`Got steps?<br>${x("They build in order.")}`, "Got steps? They build in order."],
            [`All of it,<br>${x("no filming.")}`, "All of it, no filming."],
            [`Follow —<br>${x("a new type tomorrow.")}`, "Follow — a new type tomorrow."]],
  },
};

/* what gets built: every ratio in Arabic, the vertical in English */
const BUILDS = [
  { lang: "ar", fmt: "vertical", dir: SOURCE },
  { lang: "ar", fmt: "square", dir: join(DEMOS, "11-versions", "square"), name: "11-versions-square" },
  { lang: "ar", fmt: "wide", dir: join(DEMOS, "11-versions", "wide"), name: "11-versions-wide" },
  { lang: "en", fmt: "vertical", dir: join(DEMOS, "12-localized", "english"), name: "12-localized-english",
    script: join(DEMOS, "12-localized", "english.script.json") },
];
// the re-layout the translation forced: measured with scripts/localize.mjs
const OVERRIDES = { en: { vertical: { win: { box: [88, 1330, 904, 260], top: 21, size: 56, push: 280 } } } };

/* a left-to-right language reads the frame from the other side: every box is
 * mirrored, and so are its corners — the steps climb left to right */
const flipR = (r) => (typeof r === "number" ? r : [r[1], r[0], r[3], r[2]]);
const flipBox = (w) => ([bx, by, bw, bh, r]) => [w - bx - bw, by, bw, bh, flipR(r)];
function mirror(g) {
  const b = flipBox(g.w), trio = (t) => ({ A: b(t.A), B: b(t.B), C: b(t.C) });
  return {
    ...g,
    DOT: b(g.DOT), CIRCLE: b(g.CIRCLE), BLOCK: b(g.BLOCK), PILL: b(g.PILL),
    BAR: trio(g.BAR), COLUMN: trio(g.COLUMN), STEPS: trio(g.STEPS),
    base: [g.w - g.base[0] - g.base[2], g.base[1], g.base[2]],
    cnt: { ...g.cnt, box: b([...g.cnt.box, 0]).slice(0, 4) },
    lbl: { ...g.lbl, at: g.lbl.at.map(([lx, ly]) => [g.w - lx - g.lbl.w, ly]) },
    win: { ...g.win, box: b([...g.win.box, 0]).slice(0, 4) },
  };
}

const px = (v) => `${v}px`;
const css = (g) => {
  const [cx, cy, cw, ch] = g.cnt.box, [px0, py0, pw, ph] = g.PILL, [wx, wy, ww, wh] = g.win.box;
  const rule = (sel, o) => `      ${sel} { ${Object.entries(o).map(([k, v]) => `${k}:${v};`).join(" ")} }`;
  return [
    rule("#base", { left: px(g.base[0]), top: px(g.base[1]), width: px(g.base[2]) }),
    rule("#cnt", { left: px(cx), top: px(cy), width: px(cw), height: px(ch), "font-size": px(g.cnt.size) }),
    rule("#stage", { width: px(g.w), height: px(g.h) }),
    rule(".lbl", { width: px(g.lbl.w), height: px(g.lbl.h), "font-size": px(g.lbl.size) }),
    ...g.lbl.at.map(([lx, ly], i) => rule(`#l${i + 1}`, { left: px(lx), top: px(ly) })),
    rule("#tag", { left: px(px0), top: px(py0), width: px(pw), height: px(ph), "font-size": px(g.tag.size) }),
    rule("#win", { left: px(wx), top: px(wy), width: px(ww), height: px(wh) }),
    rule(".ln", { top: px(g.win.top), "font-size": px(g.win.size) }),
  ].join("\n");
};

/* a demo folder needs its project files and a link to the shared assets */
function scaffold(b) {
  mkdirSync(b.dir, { recursive: true });
  writeFileSync(join(b.dir, "meta.json"), JSON.stringify({ id: "main", name: b.name }) + "\n");
  writeFileSync(join(b.dir, "package.json"), JSON.stringify({
    name: "main", private: true, type: "module",
    scripts: { check: "npx --yes hyperframes@0.8.48 check", render: "npx --yes hyperframes@0.8.48 render" },
  }, null, 2) + "\n");
  // the same film: the same script, or its translation, and the same checks in its language
  copyFileSync(b.script || join(SOURCE, "script.json"), join(b.dir, "script.json"));
  const st = JSON.parse(readFileSync(join(SOURCE, "structure.json"), "utf8"));
  if (b.lang !== "ar") st.text_language = "latin";
  writeFileSync(join(b.dir, "structure.json"), JSON.stringify(st, null, 2) + "\n");
  const link = join(b.dir, "assets");
  if (!existsSync(link)) {
    const target = join(DEMOS, "_assets");
    const r = process.platform === "win32"
      ? spawnSync("cmd", ["/c", "mklink", "/J", link, target])
      : spawnSync("ln", ["-s", relative(b.dir, target), link]);
    if (r.status !== 0) throw new Error(`could not link ${link}: ${r.stderr}`);
  }
}

const template = readFileSync(join(HERE, "film.html"), "utf8");
for (const b of BUILDS) {
  const L = LANGS[b.lang];
  const base = FORMATS[b.fmt];
  const g = { ...(L.dir === "ltr" ? mirror(base) : base), ...((OVERRIDES[b.lang] || {})[b.fmt] || {}) };
  const labels = [1, 2, 3].map((n) =>
    `        <div class="lbl" id="l${n}">${L.digits === "arabic" ? "٠١٢٣٤٥٦٧٨٩"[n] : n}</div>`).join("\n");
  const lines = L.lines.map(([h], i) => `          <div class="ln" id="k${i + 1}">${h}</div>`).join("\n");
  const html = template
    .replaceAll("@@FORMAT@@", b.fmt).replaceAll("@@W@@", String(g.w)).replaceAll("@@H@@", String(g.h))
    .replaceAll("@@LANG@@", b.lang).replace("@@TITLE@@", L.title)
    .replaceAll("@@DIR@@", L.dir).replaceAll("@@ALIGN@@", L.align).replaceAll("@@FONT@@", L.font)
    .replace("@@LABELS@@", labels).replace("@@LINES@@", lines)
    .replace("/*@@GEO_CSS@@*/", css(g))
    .replace("/*@@GEO_JS@@*/", `const G = ${JSON.stringify({ id: b.fmt, ...g })};`)
    .replace("/*@@LANG_JS@@*/", `const L = ${JSON.stringify({ digits: L.digits, pct: L.pct, text: L.lines.map(([, t]) => t) })};`);
  if (/@@|\/\*@@/.test(html)) throw new Error(`${b.lang}/${b.fmt}: a placeholder was left unfilled`);
  if (b.dir !== SOURCE) scaffold(b);
  writeFileSync(join(b.dir, "index.html"), html, "utf8");
  console.log(`${b.lang} ${b.fmt.padEnd(8)} ${g.w}×${g.h} → ${relative(DEMOS, join(b.dir, "index.html"))}`);
}

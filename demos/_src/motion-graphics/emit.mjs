/* One film, three ratios: writes 06-motion-graphics (vertical) and the square
 * and wide versions under 11-versions/, each with the timeline inlined.
 *
 *   node demos/_src/motion-graphics/emit.mjs
 *
 * The timeline in film.html is shared verbatim; formats.mjs is the only thing
 * that forks (references/formats.md). Output folders are named with words,
 * never ratios — a folder named 9x16 once broke the renderer's audio stage.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { FORMATS } from "./formats.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, "..", "..");
const SOURCE = join(DEMOS, "06-motion-graphics");
const OUT = { vertical: SOURCE, square: join(DEMOS, "11-versions", "square"),
              wide: join(DEMOS, "11-versions", "wide") };

const px = (v) => `${v}px`;
const css = (g) => {
  const [cx, cy, cw, ch] = g.cnt.box, [px0, py0, pw, ph] = g.PILL, [wx, wy, ww, wh] = g.win.box;
  const rule = (sel, o) => `      ${sel} { ${Object.entries(o).map(([k, v]) => `${k}:${v};`).join(" ")} }`;
  return [
    rule("#base", { left: px(g.base[0]), top: px(g.base[1]), width: px(g.base[2]) }),
    rule("#cnt", { left: px(cx), top: px(cy), width: px(cw), height: px(ch), "font-size": px(g.cnt.size) }),
    rule("#stage", { width: px(g.w), height: px(g.h) }),
    rule(".lbl", { width: px(g.lbl.w), height: px(g.lbl.h), "font-size": px(g.lbl.size) }),
    ...g.lbl.at.map(([x, y], i) => rule(`#l${i + 1}`, { left: px(x), top: px(y) })),
    rule("#tag", { left: px(px0), top: px(py0), width: px(pw), height: px(ph), "font-size": px(g.tag.size) }),
    rule("#win", { left: px(wx), top: px(wy), width: px(ww), height: px(wh) }),
    rule(".ln", { top: px(g.win.top), "font-size": px(g.win.size) }),
  ].join("\n");
};

/* a demo folder needs its project files and a link to the shared assets */
function scaffold(dir, name) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: "main", name }) + "\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    name: "main", private: true, type: "module",
    scripts: { check: "npx --yes hyperframes@0.8.48 check", render: "npx --yes hyperframes@0.8.48 render" },
  }, null, 2) + "\n");
  // the same film, so the same script and the same checks
  for (const f of ["script.json", "structure.json"]) copyFileSync(join(SOURCE, f), join(dir, f));
  const link = join(dir, "assets");
  if (!existsSync(link)) {
    const target = join(DEMOS, "_assets");
    const r = process.platform === "win32"
      ? spawnSync("cmd", ["/c", "mklink", "/J", link, target])
      : spawnSync("ln", ["-s", relative(dir, target), link]);
    if (r.status !== 0) throw new Error(`could not link ${link}: ${r.stderr}`);
  }
}

const template = readFileSync(join(HERE, "film.html"), "utf8");
for (const [id, g] of Object.entries(FORMATS)) {
  const html = template
    .replaceAll("@@FORMAT@@", id).replaceAll("@@W@@", String(g.w)).replaceAll("@@H@@", String(g.h))
    .replace("/*@@GEO_CSS@@*/", css(g))
    .replace("/*@@GEO_JS@@*/", `const G = ${JSON.stringify({ id, ...g })};`);
  if (/@@|\/\*@@/.test(html)) throw new Error(`${id}: a placeholder was left unfilled`);
  if (id !== "vertical") scaffold(OUT[id], `11-versions-${id}`);
  writeFileSync(join(OUT[id], "index.html"), html, "utf8");
  console.log(`${id.padEnd(8)} ${g.w}×${g.h} → ${relative(DEMOS, join(OUT[id], "index.html"))}`);
}

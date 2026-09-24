/* The product tour's cutdowns: 15s and a 6s bumper, each with its own words.
 *
 *   node demos/_src/textless.mjs 08-product-tour 13-cutdowns/master   # the master
 *   (render the master; cut it with scripts/cutdown.mjs and 13-cutdowns/marks.json)
 *   node demos/_src/cutdowns/emit.mjs                                 # these
 *
 * Every frame here is on the CUT timeline. The tour's camera moves are mapped
 * through the marked segments (a move at 390–410 in the tour sits at 210–230
 * in the 15s cut), and every line starts after the move it would compete with.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, "..", "..");
const a = (s) => `<span class="a">${s}</span>`;

const VERSIONS = {
  short: {
    title: "فيديو جاهز من سطر واحد", frames: 450, cut: "13-cutdowns/cuts/cutdown-15s.mp4",
    captions: [
      { id: "c1", at: 14, end: 90, html: `فيديو جاهز من ${a("سطر واحد")}.`, text: "فيديو جاهز من سطر واحد." },
      { id: "c2", at: 92, end: 210, html: `أداة بتعمل الفيديو من طلبك، ${a("بدل أسبوع مع مونتير")}.`,
        text: "أداة بتعمل الفيديو من طلبك، بدل أسبوع مع مونتير." },
      { id: "c3", at: 232, end: 350, html: `وبيعدّي على ${a("١٥ اختبار")} قبل ما يوصلك.`,
        text: "وبيعدّي على ١٥ اختبار قبل ما يوصلك." },
      { id: "c4", at: 362, end: 450, html: `جرّبه — ${a("اللينك في البايو")}.`, text: "جرّبه — اللينك في البايو." },
    ],
    // the tour's moves, through the cut: hook 0–90, request 120–240 → 90–210,
    // render 390–530 → 210–350, outputs 550–650 → 350–450
    motion: [[0, 14, "intro"], [168, 186, "pull-out"], [210, 230, "to-render"],
             [350, 360, "to-outputs"], [430, 450, "ease-back"]],
  },
  bumper: {
    title: "أداة بتعمل الفيديو من سطر واحد", frames: 180, cut: "13-cutdowns/cuts/cutdown-6s.mp4",
    captions: [
      { id: "c1", at: 14, end: 90, html: `أداة بتعمل الفيديو من ${a("سطر واحد")}.`,
        text: "أداة بتعمل الفيديو من سطر واحد." },
      { id: "c2", at: 92, end: 180, html: `جرّبه — ${a("اللينك في البايو")}.`, tag: "video-production",
        text: "جرّبه — اللينك في البايو. video-production" },
    ],
    // hook 0–90, outputs 560–650 → 90–180
    motion: [[0, 14, "intro"], [160, 180, "ease-back"]],
  },
};

const template = readFileSync(join(HERE, "cut.html"), "utf8");
for (const [name, v] of Object.entries(VERSIONS)) {
  const dir = join(DEMOS, "13-cutdowns", name);
  mkdirSync(dir, { recursive: true });
  const caps = v.captions.map((c) =>
    `        <div class="cap" id="${c.id}"><span>${c.html}</span>`
    + (c.tag ? `<div class="tag">${c.tag}</div>` : "") + `</div>`).join("\n");
  const data = { frames: v.frames, motion: v.motion,
                 captions: v.captions.map(({ id, at, end, text }) => ({ id, at, end, text })) };
  const html = template
    .replaceAll("@@NAME@@", name).replaceAll("@@DUR@@", String(v.frames / 30))
    .replace("@@TITLE@@", v.title).replace("@@CAPTIONS@@", caps)
    .replace("@@VERSION@@", JSON.stringify(data));
  if (html.includes("@@")) throw new Error(`${name}: a placeholder was left unfilled`);
  writeFileSync(join(dir, "index.html"), html, "utf8");

  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: "main", name: `13-cutdowns-${name}` }) + "\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    name: "main", private: true, type: "module",
    scripts: { check: "npx --yes hyperframes@0.8.48 check", render: "npx --yes hyperframes@0.8.48 render" },
  }, null, 2) + "\n");
  writeFileSync(join(dir, "media.json"), JSON.stringify({ "cut.mp4": v.cut }, null, 2) + "\n");
  copyFileSync(join(DEMOS, "08-product-tour", "structure.json"), join(dir, "structure.json"));
  const link = join(dir, "assets");
  if (!existsSync(link)) {
    const target = join(DEMOS, "_assets");
    const r = process.platform === "win32"
      ? spawnSync("cmd", ["/c", "mklink", "/J", link, target])
      : spawnSync("ln", ["-s", relative(dir, target), link]);
    if (r.status !== 0) throw new Error(`could not link ${link}`);
  }
  console.log(`${name.padEnd(7)} ${v.frames / 30}s → ${relative(DEMOS, join(dir, "index.html"))}`);
}

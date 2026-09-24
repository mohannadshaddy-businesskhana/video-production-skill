/* "نوع النهارده" — a series of six-second episodes from ONE template.
 *
 *   node demos/_src/series/emit.mjs
 *
 * routes/section-series.md: everything that varies lives in one table, and
 * the timeline never changes. Each row below becomes an episode folder under
 * 04-section-series/ with its composition, its script (a bumper — six seconds,
 * one message) and the demo render its sample is cut from.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMOS = resolve(HERE, "..", "..");
const x = (s) => `<span class="x">${s}</span>`;

/* the table. `from` is where the six-second sample starts in the type's own
   render — the moment that type is most itself */
const EPISODES = [
  { type: "فيديو على أغنية", body: `الأداة بتقطعه على ${x("كل ضربة")}.`, bodyText: "الأداة بتقطعه على كل ضربة.",
    next: "موشن جرافيك", sample: "07-music-video", from: 8.7 },
  { type: "موشن جرافيك", body: `الأداة بتحرّك الفكرة، ${x("مش الكاميرا")}.`, bodyText: "الأداة بتحرّك الفكرة، مش الكاميرا.",
    next: "جولة في المنتج", sample: "06-motion-graphics", from: 7.1 },
  { type: "جولة في المنتج", body: `الأداة بتشتغل قدامك، ${x("خطوة بخطوة")}.`, bodyText: "الأداة بتشتغل قدامك، خطوة بخطوة.",
    next: "فيديو إطلاق", sample: "08-product-tour", from: 3.8 },
];
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const count = (n) => `${ARABIC_DIGITS[n]} من ${ARABIC_DIGITS[EPISODES.length]}`;

const script = (e, n) => ({
  title: `04 — نوع النهارده، الحلقة ${ARABIC_DIGITS[n]} · «${e.type}»`,
  fps: 30, format: "bumper", content_type: "teach",
  audience: "فرق ماركتنج ووكالات بتطلّع فيديوهات لعملاء",
  category_noun: "أداة بتعمل الفيديو",
  alternative: "تعرف أنواع الفيديو من أمثلة متفرقة، ومحدش يقولك كل نوع ينفع لإيه",
  mechanism: `بتعمل ${e.type} بنفسها`,
  claim: e.bodyText.replace(/\.$/, ""),
  repeat_sentence: `كل يوم نوع فيديو في ست ثواني، والنهارده ${e.type}`,
  hook: { type: "educational", line: `نوع النهارده: ${e.type}.`, verbal: "—",
          visual: `مقطع حقيقي من ${e.type} شغال من أول كادر`, written: "اسم النوع كبير فوق المقطع" },
  cta: { kind: "follow", words: `بكرة: ${e.next}.` },
  assumed_known: [], jargon: [],
  beats: [
    { id: "type", frames: [0, 60], job: "الخطّاف — النوع ظاهر وشغال",
      says: [`نوع النهارده: ${e.type}.`], shows: `مقطع حقيقي من ${e.type}`,
      establishes: [`في نوع فيديو اسمه ${e.type}`], is_hook: true, shows_subject: true },
    { id: "body", frames: [60, 120], job: "الأداة بتعمل إيه في النوع ده",
      says: [e.bodyText], shows: "نفس المقطع",
      needs: [`في نوع فيديو اسمه ${e.type}`], establishes: [`الأداة بتعمل ${e.type}`],
      names_category: true, is_claim: true, shows_subject: true },
    { id: "cta", frames: [120, 180], job: "حلقة بكرة",
      says: [`بكرة: ${e.next}.`], shows: "اسم نوع بكرة",
      needs: [`الأداة بتعمل ${e.type}`], is_cta: true },
  ],
});

const template = readFileSync(join(HERE, "episode.html"), "utf8");
EPISODES.forEach((e, i) => {
  const n = i + 1, dir = join(DEMOS, "04-section-series", `ep${n}`);
  mkdirSync(dir, { recursive: true });
  const data = { badge: `نوع النهارده · ${count(n)}`, type: e.type, body: e.bodyText, next: `بكرة: ${e.next}` };
  const html = template
    .replaceAll("@@N@@", String(n)).replaceAll("@@TYPE@@", e.type)
    .replace("@@COUNT@@", count(n)).replace("@@BODY@@", e.body).replace("@@NEXT@@", e.next)
    .replace("@@FROM@@", String(e.from)).replace("@@EPISODE@@", JSON.stringify(data));
  if (html.includes("@@")) throw new Error(`ep${n}: a placeholder was left unfilled`);
  writeFileSync(join(dir, "index.html"), html, "utf8");
  writeFileSync(join(dir, "script.json"), JSON.stringify(script(e, n), null, 2) + "\n", "utf8");
  writeFileSync(join(dir, "media.json"),
    JSON.stringify({ "sample.mp4": `${e.sample}/renders/${e.sample}.mp4` }, null, 2) + "\n");
  copyFileSync(join(DEMOS, "08-product-tour", "structure.json"), join(dir, "structure.json"));
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id: "main", name: `04-section-series-ep${n}` }) + "\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    name: "main", private: true, type: "module",
    scripts: { check: "npx --yes hyperframes@0.8.48 check", render: "npx --yes hyperframes@0.8.48 render" },
  }, null, 2) + "\n");
  const link = join(dir, "assets");
  if (!existsSync(link)) {
    const target = join(DEMOS, "_assets");
    const r = process.platform === "win32"
      ? spawnSync("cmd", ["/c", "mklink", "/J", link, target])
      : spawnSync("ln", ["-s", relative(dir, target), link]);
    if (r.status !== 0) throw new Error(`could not link ${link}`);
  }
  console.log(`ep${n} «${e.type}» ← ${e.sample} from ${e.from}s`);
});

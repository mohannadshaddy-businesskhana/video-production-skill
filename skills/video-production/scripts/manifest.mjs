/* Measures a rendered composition and writes the layout manifest verify.py reads.
 *
 * This is the other half of the ZoneGuard contract: the timeline DECLARES
 * (window.__MF) and this MEASURES what actually landed. A disagreement between
 * the two is a bug, not a detail.
 *
 *   node manifest.mjs <projectDir> <w> <h> <out.json> [--fps 30] [--roles a,b,c]
 *
 * Roles resolve in this order: a section's own data-role attribute, then
 * --roles by index, then omitted. Chapter roles only matter to routes that
 * declare a narrative skeleton.
 */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf("--" + name);
  return i === -1 ? dflt : argv[i + 1];
};
const [dir, W, H, outPath] = argv.filter((a, i) =>
  !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const FPS = Number(flag("fps", 30));
const ROLES = (flag("roles", "") || "").split(",").map((r) => r.trim()).filter(Boolean);
const ROOT = resolve(dir);
const T = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png",
            ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ogg": "audio/ogg" };

const server = createServer(async (rq, rs) => {
  try {
    const f = join(ROOT, rq.url === "/" ? "index.html" : decodeURIComponent(rq.url.split("?")[0]));
    rs.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" });
    rs.end(await readFile(f));
  } catch { rs.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, r));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +W, height: +H } });
p.on("pageerror", (e) => console.error("[pageerror]", e.message));
await p.addInitScript(() => { window.__timelines = {}; });
await p.goto("http://127.0.0.1:" + server.address().port + "/index.html", { waitUntil: "domcontentloaded", timeout: 60000 });
for (let i = 0; i < 80; i++) {
  if (await p.evaluate(() => !!(window.__timelines && window.__timelines.main && window.__MF))) break;
  await p.waitForTimeout(400);
}

const report = await p.evaluate(({ FW, FH, FPS, ROLES }) => {
  const root = document.getElementById("root");
  const fps = FPS;
  const dur = Math.round(parseFloat(root.dataset.duration) * fps);
  const secs = [...document.querySelectorAll("section[data-start]")];
  const chapters = secs.map((s, i) => ({
    id: s.id,
    role: s.dataset.role || ROLES[i] || undefined,
    start: Math.round(parseFloat(s.dataset.start) * fps),
    end: Math.round((parseFloat(s.dataset.start) + parseFloat(s.dataset.duration)) * fps),
  }));

  // the clip the runtime shows is decided by data-start, not by the timeline
  const showAt = (f) => secs.forEach((s) => {
    const st = parseFloat(s.dataset.start) * fps;
    const du = parseFloat(s.dataset.duration) * fps;
    s.style.visibility = f >= st && f < st + du ? "visible" : "hidden";
  });

  // clip a rect to every overflow:hidden ancestor, else a cropped image
  // measures at its full off-frame size
  const boxOf = (node) => {
    let r = node.getBoundingClientRect();
    let q = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let a = node.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowY === "hidden") {
        const c = a.getBoundingClientRect();
        q = { left: Math.max(q.left, c.left), top: Math.max(q.top, c.top),
              right: Math.min(q.right, c.right), bottom: Math.min(q.bottom, c.bottom) };
      }
    }
    return [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)];
  };

  const tl = window.__timelines.main;
  const out = [];
  const extraZones = {};
  for (const d of window.__MF) {
    const node = document.querySelector(d.el);
    if (!node) { out.push({ ...d, bbox: [0, 0, 0, 0], missing: true }); continue; }
    // measure on a STILL frame inside the element's own window, never mid-tween
    const f0 = d.frames[0], f1 = d.frames[1];
    // +10: entrances run up to 0.3s from entry and still_from is entry+6, so
    // anything earlier measures a tween in flight, not the design (T9)
    const at = Math.min(f1 - 1, Math.max(f0, (d.still_from ?? f0) + 10));
    tl.seek(at / fps, false);          // suppressEvents:false or onUpdate never fires
    showAt(at);
    const e = { ...d, bbox: boxOf(node) };
    if (d.zoneEl) {
      const zn = document.querySelector(d.zoneEl);
      if (zn) { const k = 'z-' + d.id; extraZones[k] = boxOf(zn); e.zone = k; }
    }
    delete e.el; delete e.zoneEl;
    out.push(e);
  }

  const zones = {};
  const declared = (window.__FMT && window.__FMT.zones) || {};
  for (const [k, v] of Object.entries(declared)) zones[k] = [v[0], v[1], v[0] + v[2], v[1] + v[3]];
  Object.assign(zones, extraZones);

  for (const c of chapters) if (c.role === undefined) delete c.role;

  return {
    fps, duration_frames: dur, frame_size: [FW, FH],
    safe_zone: window.__FMT && window.__FMT.safeTop !== undefined
      ? { y_min: window.__FMT.safeTop, y_max: window.__FMT.safeBottom }
      : undefined,
    zones, chapters,
    motion_events: window.__MOTION,
    elements: out,
  };
}, { FW: +W, FH: +H, FPS, ROLES });

await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
const missing = report.elements.filter((e) => e.missing).map((e) => e.id);
console.log(`manifest → ${outPath}  (${report.elements.length} elements, ${report.chapters.length} chapters)`);
if (missing.length) console.error("MISSING ELEMENTS:", missing.join(", "));
await b.close();
server.close();

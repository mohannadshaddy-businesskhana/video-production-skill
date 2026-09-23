/* Frame preview without a full render — seeks the timeline and screenshots.
   Usage: node video-output/v32/shot.mjs <projectDir> <w> <h> <frame> [frame...]
   A 2-minute render to look at one frame is the slowest possible feedback loop. */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const [dir, W, H, ...frames] = process.argv.slice(2);
const ROOT = resolve(dir);
const OUT = join(ROOT, "renders", "shots");
const T = { ".html":"text/html", ".js":"text/javascript", ".png":"image/png", ".svg":"image/svg+xml", ".woff2":"font/woff2", ".mp3":"audio/mpeg", ".ogg":"audio/ogg" };

const server = createServer(async (rq, rs) => {
  try { const f = join(ROOT, rq.url === "/" ? "index.html" : decodeURIComponent(rq.url.split("?")[0]));
    rs.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" }); rs.end(await readFile(f)); }
  catch { rs.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, r));
await mkdir(OUT, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +W, height: +H } });
p.on("pageerror", e => console.error("[pageerror]", e.message));
await p.addInitScript(() => { window.__timelines = {}; });
await p.goto("http://127.0.0.1:" + server.address().port + "/index.html", { waitUntil: "domcontentloaded", timeout: 60000 });
for (let i = 0; i < 60; i++) {
  if (await p.evaluate(() => !!(window.__timelines && window.__timelines.main))) break;
  await p.waitForTimeout(500);
}
for (const f of frames) {
  await p.evaluate((n) => {
    // seek() suppresses events by default, so every onUpdate-driven counter
    // freezes at its initial value — the same trap that kills tl.call in a render
    window.__timelines.main.seek(n / 30, false);
    // the runtime, not the timeline, decides which clip is on screen
    document.querySelectorAll("section[data-start]").forEach((s) => {
      const st = parseFloat(s.dataset.start) * 30;
      const du = parseFloat(s.dataset.duration) * 30;
      s.style.visibility = n >= st && n < st + du ? "visible" : "hidden";
    });
  }, +f);
  await p.waitForTimeout(120);
  const out = join(OUT, "f" + f + ".png");
  await p.screenshot({ path: out, animations: "disabled" });
  console.log(out);
}
await b.close(); server.close();

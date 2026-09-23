/* Still frames from a composition without rendering the video.
 *
 *   node shot.mjs <projectDir> <w> <h> <frame> [frame...]
 *
 * A two-minute render to look at one frame is the slowest feedback loop there
 * is. This seeks the timeline and screenshots, in seconds.
 *
 * No npm dependencies required — see lib/page.mjs for the driver.
 */
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { openPage, sleep } from "./lib/page.mjs";

const [dir, W, H, ...frames] = process.argv.slice(2);
if (!dir || !W || !H || !frames.length) {
  console.error("usage: shot.mjs <projectDir> <w> <h> <frame> [frame...]");
  process.exit(2);
}

const ROOT = resolve(dir);
const OUT = join(ROOT, "renders", "shots");
const T = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png",
            ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
            ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
            ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
            ".mp4": "video/mp4", ".json": "application/json", ".css": "text/css" };

const server = createServer(async (rq, rs) => {
  try {
    const f = join(ROOT, rq.url === "/" ? "index.html" : decodeURIComponent(rq.url.split("?")[0]));
    const body = await readFile(f);            // read BEFORE the header, or a miss
    rs.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" });
    rs.end(body);                              // tries to send a second header
  } catch { if (!rs.headersSent) rs.writeHead(404); rs.end(); }
});
await new Promise((r) => server.listen(0, r));
await mkdir(OUT, { recursive: true });

const page = await openPage({ width: +W, height: +H });
await page.goto("http://127.0.0.1:" + server.address().port + "/index.html");

let ready = false;
for (let i = 0; i < 80; i++) {
  ready = await page.evaluate(() => !!(window.__timelines && window.__timelines.main));
  if (ready) break;
  await sleep(400);
}
if (!ready) {
  await page.close(); server.close();
  console.error("The composition never registered window.__timelines.main.");
  process.exit(3);
}

for (const f of frames) {
  await page.evaluate((n) => {
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
  await sleep(140);
  const out = join(OUT, "f" + f + ".png");
  await page.screenshot(out);
  console.log(out);
}

await page.close();
server.close();

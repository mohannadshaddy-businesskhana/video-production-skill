/* One page API, two drivers.
 *
 *   Playwright, if the project already has it  → preferred
 *   CDP over a browser found on the machine    → always available, zero install
 *
 * Why prefer Playwright when it is present, given the whole point of the CDP
 * driver is to remove it as a requirement:
 *
 * MEASURE WITH THE BROWSER THAT RENDERS. Text advance widths differ between
 * Chromium builds — measuring one while another renders produced boxes up to
 * 23px wider than the video actually contained. The renderer drives its browser
 * through Playwright, so when Playwright is installed, using it is the closest
 * match available. Without it, CDP picks the newest cached Chromium, which is
 * usually the same build.
 *
 * Neither is required. `VP_DRIVER=cdp` or `VP_DRIVER=playwright` forces one,
 * and `VP_BROWSER` pins an executable for the CDP path.
 */

async function tryPlaywright(width, height) {
  const { createRequire } = await import("node:module");
  const { pathToFileURL } = await import("node:url");
  const { join } = await import("node:path");
  const req = createRequire(pathToFileURL(join(process.cwd(), "noop.js")).href);

  let chromium = null;
  for (const name of ["@playwright/test", "playwright", "playwright-core"]) {
    try {
      const mod = await import(pathToFileURL(req.resolve(name)).href);
      // CommonJS: import() puts module.exports on `default` and the lexer does
      // not always surface named bindings
      chromium = mod?.chromium || mod?.default?.chromium;
      if (chromium) break;
    } catch { /* next */ }
  }
  if (!chromium) return null;

  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width, height } });
  return {
    driver: "playwright",
    exe: "playwright chromium",
    goto: (url) => p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }),
    evaluate: (fn, arg) => p.evaluate(fn, arg ?? null),
    screenshot: (path) => p.screenshot({ path, animations: "disabled" }),
    setViewport: (w, h) => p.setViewportSize({ width: w, height: h }),
    close: () => browser.close(),
  };
}

export async function openPage({ width = 1920, height = 1080 } = {}) {
  const want = (process.env.VP_DRIVER || "").toLowerCase();

  if (want !== "cdp") {
    try {
      const p = await tryPlaywright(width, height);
      if (p) return p;
    } catch { /* fall through to CDP */ }
    if (want === "playwright") throw new Error("VP_DRIVER=playwright but Playwright is not usable here.");
  }

  const { openPage: cdpOpen } = await import("./cdp.mjs");
  const p = await cdpOpen({ width, height });
  return { driver: "cdp", ...p };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

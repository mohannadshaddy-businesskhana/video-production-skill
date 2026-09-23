/* A minimal Chrome DevTools Protocol client — zero npm dependencies.
 *
 * Playwright is a 200 MB install plus a browser download, for three operations:
 * navigate, evaluate, screenshot. Node 22+ ships a WebSocket client, and every
 * machine that can render video already has a Chromium somewhere. So this talks
 * CDP directly and the skill installs with `git clone`.
 *
 * Browser search order, first hit wins:
 *   1. $VP_BROWSER          — explicit override
 *   2. the renderer's own cached Chromium (ms-playwright / puppeteer)
 *   3. system Chrome / Edge / Chromium
 *
 * The order matters and it is not "whatever is easiest to find". MEASURE WITH
 * THE BROWSER THAT RENDERS. Font fallback differs between a bundled Chromium
 * and a system Chrome — measuring one while the other renders produced text
 * boxes up to 23px wider than the video actually contained.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const isWin = platform() === "win32";
const isMac = platform() === "darwin";

function candidates() {
  const out = [];
  if (process.env.VP_BROWSER) out.push(process.env.VP_BROWSER);

  for (const p of cachedBrowsers()) out.push(p);

  if (isWin) {
    const pf = [process.env["PROGRAMFILES"], process.env["PROGRAMFILES(X86)"],
                process.env["LOCALAPPDATA"]].filter(Boolean);
    for (const base of pf) {
      out.push(join(base, "Google/Chrome/Application/chrome.exe"));
      out.push(join(base, "Microsoft/Edge/Application/msedge.exe"));
      out.push(join(base, "Chromium/Application/chrome.exe"));
    }
  } else if (isMac) {
    out.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    out.push("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
    out.push("/Applications/Chromium.app/Contents/MacOS/Chromium");
  } else {
    out.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
             "/usr/bin/chromium", "/usr/bin/chromium-browser",
             "/snap/bin/chromium", "/usr/bin/microsoft-edge");
  }

  return out;
}

/** Chromium builds a renderer has already downloaded — these are what render. */
function cachedBrowsers() {
  const out = [];
  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    isWin ? join(process.env.LOCALAPPDATA || "", "ms-playwright") : join(homedir(), ".cache/ms-playwright"),
    isWin ? join(process.env.LOCALAPPDATA || "", "puppeteer") : join(homedir(), ".cache/puppeteer"),
    join(homedir(), ".cache/ms-playwright"),
  ].filter(Boolean);

  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    let dirs = [];
    try { dirs = readdirSync(cache); } catch { continue; }
    // prefer a full chromium over a headless shell: the shell cannot screenshot
    // reliably on every build
    const ver = (d) => parseInt((d.match(/(\d+)$/) || [0, 0])[1], 10);
    dirs.sort((a, b) =>
      (a.includes("headless") ? 1 : 0) - (b.includes("headless") ? 1 : 0) ||
      ver(b) - ver(a));                                   // newest build first
    for (const d of dirs) {
      const base = join(cache, d);
      for (const rel of [
        "chrome-win/chrome.exe", "chrome-win64/chrome.exe",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium",
        "chrome-linux/chrome", "chrome-linux64/chrome",
        "chrome-headless-shell-win64/chrome-headless-shell.exe",
        "chrome-headless-shell-linux64/chrome-headless-shell",
      ]) {
        const p = join(base, rel);
        if (existsSync(p)) out.push(p);
      }
    }
  }
  return out;
}

export function findBrowser() {
  for (const p of candidates()) if (p && existsSync(p)) return p;
  return null;
}

export function allBrowsers() {
  const seen = new Set();
  return candidates().filter((p) => p && existsSync(p) && !seen.has(p) && seen.add(p));
}

class Session {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.sessionId = null;
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (this.sessionId) payload.sessionId = this.sessionId;
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP timeout: ${method}`));
      }, 120000);
    });
  }
}

/** Launch a browser, open one page, and return a tiny page API. */
export async function openPage({ width = 1920, height = 1080 } = {}) {
  const found = allBrowsers();
  if (!found.length) {
    throw new Error(
      "No Chromium-based browser found.\n" +
      "  Install Google Chrome, Microsoft Edge, or Chromium — or set VP_BROWSER to an executable.\n" +
      "  Any Chromium the renderer already downloaded is used automatically.");
  }

  // A cached build can exist and still refuse to run — a partial download, a
  // blocked binary, the wrong architecture. Try each one rather than trusting
  // the first path that happens to exist.
  const failures = [];
  for (const exe of found) {
    try { return await launch(exe, width, height); }
    catch (e) { failures.push(`  ${exe}\n    ${String(e.message).split("\n")[0]}`); }
  }
  throw new Error("Every browser found failed to launch:\n" + failures.join("\n") +
    "\n  Set VP_BROWSER to a working Chromium executable.");
}

async function launch(exe, width, height) {
  const profile = await mkdtemp(join(tmpdir(), "vp-cdp-"));
  const proc = spawn(exe, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu",
    "--hide-scrollbars", "--mute-audio", "--disable-extensions",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
    `--window-size=${width},${height}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const fail = (e) => {
      clearTimeout(to);
      rm(profile, { recursive: true, force: true }).catch(() => {});
      reject(e);
    };
    const to = setTimeout(() => fail(new Error("no debugging port reported:\n" + buf)), 30000);
    proc.on("error", fail);                     // ENOENT / EACCES / UNKNOWN
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/ws:\/\/[^\s]+/);
      if (m) { clearTimeout(to); resolve(m[0]); }
    });
    proc.on("exit", (c) => fail(new Error(`browser exited (${c})\n${buf.slice(-300)}`)));
  });

  const browserWs = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    browserWs.addEventListener("open", res, { once: true });
    browserWs.addEventListener("error", () => rej(new Error("CDP connect failed")), { once: true });
  });

  const browser = new Session(browserWs);
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });
  const page = new Session(browserWs);
  page.sessionId = sessionId;

  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Emulation.setDeviceMetricsOverride",
    { width, height, deviceScaleFactor: 1, mobile: false });

  const api = {
    exe,
    async goto(url) {
      const done = new Promise((res) => {
        const h = (ev) => {
          const m = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
          if (m.sessionId === sessionId && m.method === "Page.loadEventFired") {
            browserWs.removeEventListener("message", h); res();
          }
        };
        browserWs.addEventListener("message", h);
        setTimeout(res, 30000);            // navigate anyway; readiness is polled
      });
      await page.send("Page.navigate", { url });
      await done;
    },
    /** Evaluate a function in the page. `fn` is stringified; `arg` is JSON. */
    async evaluate(fn, arg) {
      const expr = `(${fn.toString()})(${JSON.stringify(arg ?? null)})`;
      const r = await page.send("Runtime.evaluate",
        { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) {
        const e = r.exceptionDetails;
        throw new Error("page error: " + (e.exception?.description || e.text));
      }
      return r.result?.value;
    },
    async screenshot(path) {
      const { data } = await page.send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path, Buffer.from(data, "base64"));
    },
    async setViewport(w, h) {
      await page.send("Emulation.setDeviceMetricsOverride",
        { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    },
    async close() {
      try { browserWs.close(); } catch {}
      try { proc.kill(); } catch {}
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
  return api;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

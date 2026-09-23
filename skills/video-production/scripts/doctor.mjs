#!/usr/bin/env node
/* What is installed, what is missing, and what you lose without it.
 *
 *   node doctor.mjs
 *
 * Every line says which capability depends on it, because "python: not found"
 * is useless and "python: not found — you can render but not verify" is not.
 *
 * Exit 0 if the skill can render AND verify, 1 otherwise.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// on Windows an absolute path is not a valid ESM specifier — "C:" reads as a
// URL scheme — so every dynamic import here goes through pathToFileURL
const mod = (...p) => import(pathToFileURL(join(HERE, ...p)).href);
const ok = (s) => `  OK      ${s}`;
const no = (s) => `  MISSING ${s}`;
const meh = (s) => `  note    ${s}`;

const probe = (cmd, args) => {
  try {
    const r = spawnSync(cmd, args, { encoding: "utf8", shell: false, timeout: 20000 });
    if (r.error || r.status === null) return null;
    return ((r.stdout || "") + (r.stderr || "")).split("\n")[0].trim();
  } catch { return null; }
};

const lines = [];
let blocking = 0;

// ── Node ────────────────────────────────────────────────────────────────────
const major = Number(process.versions.node.split(".")[0]);
lines.push(major >= 18
  ? ok(`node ${process.versions.node}`)
  : no(`node ${process.versions.node} — need 18+`));
if (major < 18) blocking++;
if (major < 22 && !globalThis.WebSocket) {
  lines.push(meh("node <22 has no built-in WebSocket — the CDP driver needs one."));
  lines.push(meh("  Either upgrade Node, or install Playwright in the project."));
}

// ── FFmpeg ──────────────────────────────────────────────────────────────────
for (const bin of ["ffmpeg", "ffprobe"]) {
  const v = probe(bin, ["-version"]);
  if (v) lines.push(ok(`${bin} — ${v.replace(/ Copyright.*/, "")}`));
  else { lines.push(no(`${bin} — no render, no verify. https://ffmpeg.org/download.html`)); blocking++; }
}

// ── a browser to measure with ───────────────────────────────────────────────
let browser = null;
try {
  const { allBrowsers } = await mod("lib", "cdp.mjs");
  const found = allBrowsers();
  if (found.length) {
    browser = found[0];
    lines.push(ok(`browser — ${found.length} found, will use ${browser}`));
  } else {
    lines.push(no("no Chromium-family browser — the manifest cannot be measured."));
    lines.push(meh("  Install Chrome/Edge/Chromium, or set VP_BROWSER, or run the"));
    lines.push(meh("  renderer once: it downloads its own Chromium and this finds it."));
    blocking++;
  }
} catch (e) {
  lines.push(no("lib/cdp.mjs did not load — " + e.message));
  blocking++;
}

// does it actually LAUNCH? a cached build can exist and still refuse to run
if (browser) {
  try {
    const { openPage } = await mod("lib", "page.mjs");
    const page = await openPage({ width: 320, height: 240 });
    await page.evaluate(() => 1 + 1);
    lines.push(ok(`browser launches — driver: ${page.driver}`));
    await page.close();
  } catch (e) {
    lines.push(no("the browser was found but would not launch:"));
    lines.push(meh("  " + String(e.message).split("\n").slice(0, 3).join("\n  ")));
    blocking++;
  }
}

// ── the renderer ────────────────────────────────────────────────────────────
lines.push(existsSync(join(process.cwd(), "node_modules", "hyperframes"))
  ? ok("hyperframes — installed in this project")
  : meh("hyperframes — not installed here; `npx hyperframes` fetches it on first use (needs network once)"));

// ── optional, never blocking ────────────────────────────────────────────────
const brand = join(HERE, "..", "assets", "brand-config.md");
lines.push(existsSync(brand)
  ? ok("brand config present")
  : meh("no brand config — the palette check will warn instead of fail until you add one"));

console.log("\nvideo-production — environment check\n");
console.log(lines.join("\n"));
console.log(blocking === 0
  ? "\nReady: you can build, render and verify.\n"
  : `\n${blocking} blocking problem(s) above. Fix those and re-run.\n`);
process.exit(blocking === 0 ? 0 : 1);

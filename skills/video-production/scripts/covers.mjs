#!/usr/bin/env node
/* covers.mjs — real covers: download, normalise, check, and sheet them for a visual check.
 *
 *   node covers.mjs <found.json> [--out <dir>]   (default --out ./assets/covers; found.json = [{ key, url, source_page, publisher_seen, confidence, note }])
 *
 * Each cover goes to <out>/<key>.jpg, 2:3, ≤900 px wide. Failure-log #74: search → download → check → LOOK.
 * Refused: not an image, under 250 px wide (250–300 kept, marked low-res), or not portrait (w/h outside 0.5–0.85 — a banner or a 3D mock-up).
 * Writes <out>/covers.json (provenance per key) and <out>/covers-sheet.png (every cover with its key) —
 * a cover is only trusted after a human (or Claude) has LOOKED at the sheet and matched title to image.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const A = process.argv.slice(2), oi = A.indexOf("--out");
const found = JSON.parse(readFileSync(A[0], "utf8"));
const OUT = oi >= 0 ? A[oi + 1] : join(process.cwd(), "assets/covers"), TMP = join(tmpdir(), "vp-covers-dl"); // curl.exe cannot write to a non-ASCII path
mkdirSync(OUT, { recursive: true }); mkdirSync(TMP, { recursive: true });
const prov = existsSync(join(OUT, "covers.json")) ? JSON.parse(readFileSync(join(OUT, "covers.json"), "utf8")) : {};
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const dims = (f) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], { encoding: "utf8" });
  const [w, h] = (r.stdout || "").trim().split(",").map(Number);
  return { w, h };
};

const report = [];
for (const c of found) {
  if (!c.url) { report.push([c.key, "NO URL", c.note || ""]); continue; }
  const raw = join(TMP, c.key + ".bin");
  rmSync(raw, { force: true });
  const d = spawnSync("curl", ["-sSL", "-m", "40", "-A", UA, "-e", c.source_page || "", "-o", raw, c.url], { encoding: "utf8" });
  if (d.status !== 0 || !existsSync(raw) || statSync(raw).size < 3000) { report.push([c.key, "DOWNLOAD FAILED", (d.stderr || "").slice(0, 80)]); continue; }
  let { w, h } = dims(raw);
  if (!w || !h) { report.push([c.key, "NOT AN IMAGE", ""]); continue; }
  // store photos are often the cover centred on a white square: trim the white before judging the shape
  let crop = "";
  if (w / h > 0.85) {
    const cd = spawnSync("ffmpeg", ["-hide_banner", "-loop", "1", "-i", raw, "-vf", "negate,cropdetect=limit=0.08:round=2:reset=0", "-frames:v", "5", "-f", "null", "-"], { encoding: "utf8" });
    const m = [...(cd.stderr || "").matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
    if (m && +m[1] > 0 && +m[2] > 0) { crop = `crop=${m[1]}:${m[2]}:${m[3]}:${m[4]},`; w = +m[1]; h = +m[2]; }
  }
  if (w < 250) { report.push([c.key, `TOO SMALL ${w}x${h}`, ""]); continue; }
  const ar = w / h;
  if (ar < 0.5 || ar > 0.85) { report.push([c.key, `NOT PORTRAIT ${w}x${h}`, ""]); continue; }
  // normalise to a 2:3 portrait JPEG, max 900 px wide (the frame shows it at ≤520 px)
  const dst = join(OUT, c.key + ".jpg");
  const tw = Math.min(900, w - (w % 2));
  const v = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-vf",
    `${crop}scale=${tw}:-2,crop=iw:'min(ih,iw*1.5)',pad=iw:'max(ih,iw*1.5)':0:(oh-ih)/2:color=white`, "-q:v", "3", dst], { encoding: "utf8" });
  if (v.status !== 0) { report.push([c.key, "CONVERT FAILED", (v.stderr || "").slice(0, 80)]); continue; }
  prov[c.key] = { url: c.url, source_page: c.source_page, publisher_seen: c.publisher_seen || "", confidence: c.confidence || "", note: (c.note || "") + (w < 300 ? " · low-res" : ""), size: `${w}x${h}` };
  report.push([c.key, `OK ${w}x${h}`, c.confidence || ""]);
}
writeFileSync(join(OUT, "covers.json"), JSON.stringify(prov, null, 1), "utf8");

// a contact sheet of everything now in assets/covers, labelled, for the visual title check
const keys = Object.keys(prov).filter((k) => existsSync(join(OUT, k + ".jpg"))).sort();
const sheetDir = join(TMP, "sheet"); rmSync(sheetDir, { recursive: true, force: true }); mkdirSync(sheetDir, { recursive: true });
keys.forEach((k, i) => spawnSync("ffmpeg", ["-v", "error", "-y", "-i", join(OUT, k + ".jpg"), "-vf",
  "scale=200:300,pad=200:330:0:0:color=white,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='" + k + "':x=4:y=308:fontsize=16:fontcolor=black",
  join(sheetDir, `c${String(i).padStart(3, "0")}.png`)]));
if (keys.length) spawnSync("ffmpeg", ["-v", "error", "-y", "-i", join(sheetDir, "c%03d.png"), "-vf", "tile=10x" + Math.ceil(keys.length / 10), "-frames:v", "1", join(OUT, "covers-sheet.png")]);
for (const r of report) console.log(r.join("  ·  "));
console.log(`${report.filter((r) => r[1].startsWith("OK")).length}/${found.length} covers in place · sheet → ${join(OUT, "covers-sheet.png")}`);

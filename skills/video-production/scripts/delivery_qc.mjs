#!/usr/bin/env node
/* Check a finished file against a platform delivery spec.
 *
 *   node delivery_qc.mjs --video out.mp4 --spec youtube-16x9 [--json qc.json]
 *   node delivery_qc.mjs --video out.mp4 --spec-file custom.json
 *   node delivery_qc.mjs --list
 *
 * Answers the question `hyperframes check` cannot: the composition is valid, but is
 * the FILE acceptable where it is going? Container, codec, resolution, frame rate,
 * duration bounds, loudness, true peak, silence, bitrate.
 *
 * Specs live in assets/delivery-specs.json. They are derived from published
 * platform guidance where it exists; the ones marked "unverified" there are
 * community consensus and should be confirmed before a contractual delivery.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPECS = resolve(HERE, "..", "assets", "delivery-specs.json");

const run = (cmd, args) =>
  spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function probe(video) {
  const r = run("ffprobe", ["-v", "error", "-show_format", "-show_streams",
                            "-of", "json", video]);
  if (r.status !== 0) {
    console.error("ffprobe failed: " + (r.stderr || "").trim());
    process.exit(1);
  }
  return JSON.parse(r.stdout);
}

function loudness(video) {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", video,
                           "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const out = r.stderr || "";
  const tail = out.includes("Summary:") ? out.slice(out.lastIndexOf("Summary:")) : out;
  const got = {};
  for (const line of tail.split("\n")) {
    const s = line.trim();
    const parts = s.split(/\s+/);
    if (s.startsWith("I:") && s.includes("LUFS")) got.lufs = parseFloat(parts[1]);
    else if (s.startsWith("Peak:") && s.includes("dBFS")) got.true_peak = parseFloat(parts[1]);
    else if (s.startsWith("LRA:") && s.includes("LU") && got.lra === undefined)
      got.lra = parseFloat(parts[1]);
  }
  return got;
}

function silence(video, floor = -50, dur = 0.25) {
  const r = run("ffmpeg", ["-v", "error", "-i", video,
                           "-af", `silencedetect=n=${floor}dB:d=${dur}`, "-f", "null", "-"]);
  return (r.stderr || "").split("\n").map((l) => l.trim()).filter((l) => l.includes("silence_start"));
}

function integrity(video) {
  const r = run("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"]);
  return (r.stderr || "").trim();
}

/* A dB ceiling and a ratio are float-valued fields, and an integral one still
 * reads as a measurement: "-1.0 dBFS", not "-1". `lufs` is written as a whole
 * number in the spec file and stays one. */
const pyNum = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

/* 1080/1920 is exactly 0.5625 — a true tie, and the aspect tolerance is only
 * ±0.01, so which way it breaks is a verdict, not a decoration. Round half to
 * even, the same rule the rest of the toolchain uses. */
const pyRound = (v, d) => {
  const m = 10 ** d, x = v * m;
  if (Math.abs(x - Math.trunc(x)) === 0.5) {
    const t = Math.trunc(x);
    return (t % 2 === 0 ? t : t + Math.sign(x)) / m;
  }
  return Math.round(x) / m;
};
const pyList = (a) => "[" + a.map((x) => (typeof x === "string" ? `'${x}'` : x)).join(", ") + "]";
const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));

class Report {
  constructor() { this.rows = []; }
  add(name, ok, detail, warn = false) { this.rows.push({ name, ok, detail, warn }); }
  render() {
    const w = Math.max(...this.rows.map((r) => r.name.length)) + 2;
    const bar = "=".repeat(78);
    console.log(bar);
    console.log(pad("DELIVERY QC", w) + "RESULT   DETAIL");
    console.log(bar);
    let bad = 0;
    for (const r of this.rows) {
      const tag = r.ok ? " ok  " : (r.warn ? "warn " : "FAIL ");
      if (!r.ok && !r.warn) bad++;
      console.log(pad(r.name, w) + tag + "   " + r.detail);
    }
    console.log(bar);
    console.log(bad === 0 ? "PASSED" : `${bad} CHECK(S) FAILED`);
    return bad;
  }
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ── main ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf("--" + n); return i === -1 ? undefined : argv[i + 1]; };
const flag = (n) => argv.includes("--" + n);
const die = (m) => { console.error(m); process.exit(2); };

const catalog = JSON.parse(readFileSync(SPECS, "utf8"));

if (flag("list")) {
  for (const [k, v] of Object.entries(catalog)) {
    if (k.startsWith("_")) continue;
    console.log(pad(k, 22) + " " + (v.label || ""));
  }
  process.exit(0);
}

const video = opt("video");
if (!video) die("--video is required");

let spec;
if (opt("spec-file")) spec = JSON.parse(readFileSync(opt("spec-file"), "utf8"));
else if (opt("spec")) {
  if (!(opt("spec") in catalog)) die(`unknown spec '${opt("spec")}' — try --list`);
  spec = catalog[opt("spec")];
} else die("pass --spec or --spec-file");

const info = probe(video);
const fmt = info.format || {};
const vs = info.streams.find((s) => s.codec_type === "video");
const as_ = info.streams.find((s) => s.codec_type === "audio");

const rep = new Report();

const err = integrity(video);
rep.add("file integrity", !err, !err ? "clean" : err.slice(0, 70));

if (!vs) {
  rep.add("video stream", false, "none found");
  process.exit(rep.render() ? 1 : 0);
}

const w = parseInt(vs.width, 10), h = parseInt(vs.height, 10);
if (spec.resolution) {
  const ok = w === spec.resolution[0] && h === spec.resolution[1];
  rep.add("resolution", ok,
    `${w}x${h}` + (ok ? "" : ` (want ${spec.resolution[0]}x${spec.resolution[1]})`));
}

if (spec.aspect) {
  const got = pyRound(w / h, 3);
  const ok = near(got, spec.aspect, 0.01);
  rep.add("aspect ratio", ok,
          `${pyNum(got)}` + (ok ? "" : ` (want ${pyNum(spec.aspect)})`));
}

const [num, den] = (vs.r_frame_rate || "0/1").split("/");
const fps = parseFloat(num) / (parseFloat(den) || 1);
if (spec.fps) {
  const ok = spec.fps.some((x) => near(fps, x, 0.05));
  rep.add("frame rate", ok, fps.toFixed(2) + (ok ? "" : ` (want ${pyList(spec.fps)})`));
}

const dur = parseFloat(fmt.duration || 0);
const [lo, hi] = spec.duration_s || [null, null];
if (lo !== null || hi !== null) {
  const ok = (lo === null || dur >= lo - 0.05) && (hi === null || dur <= hi + 0.05);
  rep.add("duration", ok, `${dur.toFixed(2)}s (allowed ${lo}-${hi})`);
}

if (spec.video_codec) {
  const ok = spec.video_codec.includes(vs.codec_name);
  rep.add("video codec", ok, vs.codec_name + (ok ? "" : ` (want ${pyList(spec.video_codec)})`));
}

const bitrate = fmt.bit_rate ? parseInt(fmt.bit_rate, 10) / 1e6 : null;
if (spec.max_bitrate_mbps && bitrate) {
  rep.add("bitrate", bitrate <= spec.max_bitrate_mbps,
          `${bitrate.toFixed(1)} Mbps (max ${spec.max_bitrate_mbps})`);
}

const sizeMb = parseInt(fmt.size || 0, 10) / 1048576;
if (spec.max_size_mb) {
  rep.add("file size", sizeMb <= spec.max_size_mb,
          `${sizeMb.toFixed(1)} MB (max ${spec.max_size_mb})`);
}

if (!as_) {
  rep.add("audio stream", spec.audio_required === false,
          spec.audio_required === false ? "none — silent deliverable" : "missing");
} else {
  if (spec.audio_codec) rep.add("audio codec", spec.audio_codec.includes(as_.codec_name), as_.codec_name);
  if (spec.sample_rate)
    rep.add("sample rate", spec.sample_rate.includes(parseInt(as_.sample_rate || 0, 10)),
            `${as_.sample_rate} Hz`);

  const ln = loudness(video);
  if (spec.lufs !== undefined && spec.lufs !== null && ln.lufs !== undefined) {
    const tol = spec.lufs_tolerance ?? 1.0;
    rep.add("loudness", near(ln.lufs, spec.lufs, tol),
            `${pyNum(ln.lufs)} LUFS (target ${spec.lufs} ±${pyNum(tol)})`);
  }
  if (spec.true_peak !== undefined && spec.true_peak !== null && ln.true_peak !== undefined) {
    rep.add("true peak", ln.true_peak <= spec.true_peak + 0.05,
            `${pyNum(ln.true_peak)} dBFS (ceiling ${pyNum(spec.true_peak)})`);
  }

  if (spec.no_silence !== false) {
    const sil = silence(video);
    rep.add("no dropout", !sil.length, !sil.length ? "continuous" : `${sil.length} gap(s)`);
  }
}

if (spec.notes) rep.add("spec notes", true, spec.notes, true);

const bad = rep.render();

if (opt("json")) {
  writeFileSync(opt("json"), JSON.stringify({
    video,
    spec: opt("spec") || opt("spec-file"),
    passed: bad === 0,
    checks: rep.rows.map((r) => ({ name: r.name, ok: r.ok, detail: r.detail, warn: r.warn })),
  }, null, 2), "utf8");
}

process.exit(bad ? 1 : 0);

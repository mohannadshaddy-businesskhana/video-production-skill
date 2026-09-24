#!/usr/bin/env node
/* verify.mjs — automated gate for brand video renders.
 *
 * Reads a rendered video plus the layout manifest emitted by ZoneGuard and
 * fails the build on any violation. No render should be shown to the user
 * until this exits 0.
 *
 *   node verify.mjs --video out.mp4 --manifest layout.json --config brand.json
 *
 * Requires: ffmpeg/ffprobe on PATH. Nothing else — no npm install.
 *
 * Every check maps to a numbered entry in references/failure-log.md.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── plumbing ────────────────────────────────────────────────────────────────

/* Python's format() rounds halves to EVEN; JS toFixed rounds them away from
 * zero. Every other value agrees because both read the same double. Ties are
 * rare but a report that differs by a digit is a report nobody trusts. */
function f(v, d) {
  if (!isFinite(v)) return String(v);
  const m = 10 ** d;
  const x = v * m;
  if (Math.abs(x - Math.trunc(x)) === 0.5) {
    const t = Math.trunc(x);
    const n = t % 2 === 0 ? t : t + Math.sign(x);
    return (n / m).toFixed(d);
  }
  return v.toFixed(d);
}

const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));

/* The failure detail quotes the offending list back at you. Python's repr is
 * what every existing report and every screenshot in the docs shows, so the
 * spacing is part of the output contract, not a detail. */
const pyRepr = (v) => {
  if (Array.isArray(v)) return "[" + v.map(pyRepr).join(", ") + "]";
  if (v === null || v === undefined) return "None";
  if (typeof v === "string") return "'" + v + "'";
  return String(v);
};

function* pairs(arr) {
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) yield [arr[i], arr[j]];
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

const quantile = (a, q) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
};

const pstdev = (a) => {
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
};

class Report {
  constructor() { this.rows = []; }
  add(name, ok, detail, ref = "", warn = false) {
    this.rows.push({ name, ok, detail, ref, warn });
  }
  get failed() { return this.rows.filter((r) => !r.ok && !r.warn); }
  render() {
    const w = Math.max(...this.rows.map((r) => r.name.length)) + 2;
    const bar = "=".repeat(78);
    console.log("\n" + bar);
    console.log(pad("VERIFY", w) + "RESULT   DETAIL");
    console.log(bar);
    for (const r of this.rows) {
      const tag = r.ok ? "  ok  " : (r.warn ? " warn " : " FAIL ");
      console.log(pad(r.name, w) + tag + "  " + r.detail + (r.ref ? `   [${r.ref}]` : ""));
    }
    console.log(bar);
    const n = this.failed.length;
    console.log(`${n === 0 ? "PASSED" : `${n} CHECK(S) FAILED`}\n`);
    return n === 0 ? 0 : 1;
  }
}

const run = (cmd, args) =>
  spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function ffprobeDuration(video) {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration",
                            "-of", "csv=p=0", video]);
  const v = parseFloat((r.stdout || "").trim());
  return isFinite(v) ? v : null;
}

function ffprobeSize(video) {
  const r = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height", "-of", "csv=p=0", video]);
  const [w, h] = (r.stdout || "").trim().split(",").map(Number);
  return w > 0 && h > 0 ? [w, h] : null;
}

// ── file / container ────────────────────────────────────────────────────────

function checkIntegrity(video, rep) {
  // #35 — a truncated file was once handed over for review.
  const r = run("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"]);
  const err = (r.stderr || "").trim();
  rep.add("file integrity", err === "",
          err === "" ? "clean" : err.split("\n")[0].slice(0, 60), "#35");
}

function checkDuration(video, manifest, rep) {
  const dur = ffprobeDuration(video);
  if (dur === null) { rep.add("duration", false, "unreadable"); return; }
  const expected = manifest.duration_frames / manifest.fps;
  rep.add("duration", Math.abs(dur - expected) < 0.1,
          `${f(dur, 2)}s (expected ${f(expected, 2)}s)`);
}

// ── audio ───────────────────────────────────────────────────────────────────

function checkLoudness(video, target, rep) {
  // #25 — a render once shipped 11 dB under platform normalisation.
  const r = run("ffmpeg", ["-i", video, "-af", "ebur128", "-f", "null", "-"]);
  let val = null;
  for (const line of (r.stderr || "").split("\n")) {
    if (line.includes("I:") && line.includes("LUFS")) {
      const v = parseFloat(line.split("I:")[1].split("LUFS")[0].trim());
      if (isFinite(v)) val = v;             // the LAST one is the summary
    }
  }
  if (val === null) { rep.add("loudness", false, "could not measure", "#25"); return; }
  rep.add("loudness", Math.abs(val - target) <= 1.0,
          `${f(val, 1)} LUFS (target ${target})`, "#25");
}

function loadAudio(video, sr = 22050) {
  const path = join(tmpdir(), `vp-audio-${process.pid}-${Date.now()}.raw`);
  run("ffmpeg", ["-y", "-v", "error", "-i", video,
                 "-ac", "1", "-ar", String(sr), "-f", "f32le", path]);
  let buf;
  try { buf = readFileSync(path); } catch { return [new Float32Array(0), sr]; }
  try { unlinkSync(path); } catch { /* windows may hold it briefly */ }
  const n = Math.floor(buf.length / 4);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4);
  return [out, sr];
}

function checkBeatContinuity(video, rep) {
  /* #27 — the hardest bug in the source production.
   *
   * The music transport stopped for 0.32 s and restarted 0.59 of a beat off
   * the grid. silencedetect passed; the ear still heard a fault.
   *
   * A transport stop shows as ONE isolated phase jump against an otherwise
   * stable grid. Most library tracks drift a little throughout — that is
   * inaudible and must not fail the build. So we look for an isolated jump,
   * not for global drift, and we cross-check with a level dropout. */
  const [x, sr] = loadAudio(video);
  if (x.length < sr * 8) {
    rep.add("beat continuity", true, "track too short to test", "#27", true); return;
  }

  const hop = 256;
  const n = Math.floor((x.length - hop) / hop);
  const env = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = i * hop; k < (i + 1) * hop; k++) s += x[k] * x[k];
    env[i] = Math.sqrt(s / hop);
  }
  let flux = new Array(env.length - 1);
  for (let i = 0; i < flux.length; i++) flux[i] = Math.max(0, env[i + 1] - env[i]);
  if (pstdev(flux) < 1e-9) {
    rep.add("beat continuity", true, "no rhythmic content", "#27", true); return;
  }
  const mean = flux.reduce((s, v) => s + v, 0) / flux.length;
  flux = flux.map((v) => v - mean);
  const fpsEnv = sr / hop;

  // only the lags that can be a beat are needed, so this is ~80 dot products
  // rather than a full correlation
  const lo = Math.trunc(fpsEnv * 0.28), hi = Math.trunc(fpsEnv * 1.2);
  if (hi >= flux.length) {
    rep.add("beat continuity", true, "track too short", "#27", true); return;
  }
  let period = lo, bestAc = -1e18;
  for (let k = lo; k < hi; k++) {
    let ac = 0;
    for (let i = 0; i < flux.length - k; i++) ac += flux[i] * flux[i + k];
    if (ac > bestAc) { bestAc = ac; period = k; }
  }
  const bpm = 60 * fpsEnv / period;

  const phase = (seg, offset) => {
    let best = 0.0, bestVal = -1e18;
    for (let pi = 0; pi < 64; pi++) {
      const p = pi / 64;
      let v = 0;
      for (let j = 0; j < seg.length; j++)
        v += seg[j] * Math.cos(2 * Math.PI * (((j + offset) / period) - p));
      if (v > bestVal) { bestVal = v; best = p; }
    }
    return best;
  };

  const win = Math.trunc(fpsEnv * 5), step = Math.trunc(fpsEnv * 2.5);
  const phases = [], times = [];
  for (let s = 0; s < flux.length - win; s += step) {
    phases.push(phase(flux.slice(s, s + win), s));
    times.push(s / fpsEnv);
  }
  if (phases.length < 4) {
    rep.add("beat continuity", true, "track too short", "#27", true); return;
  }

  const deltas = [];
  for (let i = 1; i < phases.length; i++) {
    const d = Math.abs(phases[i] - phases[i - 1]);
    deltas.push(Math.min(d, 1 - d));
  }
  const baseline = median(deltas);
  const worst = Math.max(...deltas);
  const worstI = deltas.indexOf(worst);

  // a transport stop = one big jump against an otherwise stable grid
  const isolatedJump = worst > 0.25 && baseline < 0.12;

  // cross-check: a level dropout in the middle of the track. The floor is a
  // quarter of the track's QUIET level, its 25th percentile, not of its median
  // (#47): under a narration the median is the voice, and every pause between
  // two lines, where the bed plays alone, fell under a quarter of it. In a
  // music-only mix the two are about 2 dB apart; a stopped track falls far
  // below either.
  const mid = env.slice(Math.trunc(env.length * 0.05), Math.trunc(env.length * 0.95));
  const thresh = quantile(mid, 0.25) * 0.25;
  let longest = 0, cur = 0;
  for (const v of mid) { cur = v < thresh ? cur + 1 : 0; if (cur > longest) longest = cur; }
  const dropoutS = longest / fpsEnv;
  const hasDropout = dropoutS > 0.15;

  // A level dropout is the measurable defect. A phase jump on its own is
  // ambiguous — a library track that changes section shifts the detected
  // phase without any fault. So: fail on the dropout, warn on the jump.
  if (hasDropout) {
    rep.add("beat continuity", false,
      `${f(bpm, 0)} or ${f(bpm * 2, 0)} BPM — level dropout ${f(dropoutS, 2)}s`
      + (isolatedJump ? ` + phase jump ${f(worst, 2)} beat at ${f(times[worstI + 1], 1)}s` : "")
      + " — automate gain, do not stop the transport", "#27");
  } else if (isolatedJump) {
    rep.add("beat continuity", true,
      `${f(bpm, 0)} or ${f(bpm * 2, 0)} BPM, no dropout — but phase shifts `
      + `${f(worst, 2)} beat at ${f(times[worstI + 1], 1)}s; listen there `
      + `(usually a section change in the track, not a fault)`, "#27", true);
  } else {
    rep.add("beat continuity", true,
      `${f(bpm, 0)} or ${f(bpm * 2, 0)} BPM, continuous `
      + `(drift ${f(baseline, 2)}/window, no dropout)`, "#27");
  }
}

// ── palette ─────────────────────────────────────────────────────────────────

function hexToRgb(h) {
  const s = h.replace(/^#/, "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}

/* One frame as {buf,w,h}, buf a flat RGB byte string — straight from ffmpeg.
 * Decoding a PNG only to read it back needed an image library for nothing.
 *
 * At the delivered size, never a scaled copy (#46). This used to read a
 * 240-wide copy, and scaling a 4:2:0 frame rings at hard edges and slides
 * luma against chroma: the copy measured 3.5% off-palette on a frame that is
 * 0.7% off at full size. The check was grading its own resampling. */
function grabRgb(video, t, [w, h]) {
  const r = spawnSync("ffmpeg",
    ["-y", "-v", "error", "-ss", t.toFixed(2), "-i", video,
     "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    { maxBuffer: 256 * 1024 * 1024 });
  const buf = r.stdout;
  if (!buf || buf.length !== w * h * 3) return null;
  return { buf, w, h };
}

// a frame with less than this much unmasked is all product UI — nothing to hold to the palette
const MIN_UNMASKED = 0.005;

function checkPalette(video, colors, manifest, rep, samples = 12, tol = 26.0) {
  /* #01 #02 — a sixth colour means a value was guessed, not read.
   *
   * Regions occupied by product UI are masked out: the product legitimately
   * uses more colours than the marketing palette. Only the video's own
   * chrome is held to the five. */
  if (!colors || !colors.length) {
    rep.add("palette", true, "no colours configured", "#01", true); return;
  }
  const base = colors.map(hexToRgb);
  // brand colours first: with the early exit below, a pixel that IS a brand
  // colour costs one comparison instead of a hundred and thirty
  const allowed = base.map((c) => [...c]);
  for (const [ai, bi] of pairs(base.map((_, i) => i)))
    for (let k = 1; k < 20; k++) {
      const t = k / 20;
      allowed.push([0, 1, 2].map((c) => base[ai][c] * (1 - t) + base[bi][c] * t));
    }
  const tol2 = tol * tol;
  const cache = new Map();                  // exact RGB → off-palette?

  const offPalette = (key, r, g, b) => {
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let off = true;
    for (const [ar, ag, ab] of allowed) {
      const dr = r - ar, dg = g - ag, db = b - ab;
      if (dr * dr + dg * dg + db * db <= tol2) { off = false; break; }
    }
    cache.set(key, off);
    return off;
  };

  const fps = manifest.fps;
  const [fw, fh] = manifest.frame_size;
  const ui = manifest.elements.filter((e) => ["ui", "image", "video"].includes(e.type));
  const dur = manifest.duration_frames / fps;
  const size = ffprobeSize(video);
  let worst = 0.0, worstT = 0.0, skipped = 0, measured = 0;

  for (let i = 0; i < samples && size; i++) {
    const t = dur * (i + 0.5) / samples;
    const frameNo = Math.trunc(t * fps);
    const g = grabRgb(video, t, size);
    if (!g) continue;                 // ffmpeg gave us nothing back
    const { buf, w, h } = g;

    const masked = new Uint8Array(w * h);
    for (const e of ui) {
      if (e.frames[0] <= frameNo && frameNo < e.frames[1]) {
        const [x0, y0, x1, y1] = e.bbox;
        const ya = Math.max(0, Math.trunc(y0 / fh * h)), yb = Math.min(h, Math.trunc(y1 / fh * h));
        const xa = Math.max(0, Math.trunc(x0 / fw * w)), xb = Math.min(w, Math.trunc(x1 / fw * w));
        for (let yy = ya; yy < yb; yy++)
          for (let xx = xa; xx < xb; xx++) masked[yy * w + xx] = 1;
      }
    }

    let total = 0, bad = 0;
    for (let p = 0; p < w * h; p++) {
      if (masked[p]) continue;
      total++;
      const r = buf[p * 3], gg = buf[p * 3 + 1], b = buf[p * 3 + 2];
      if (offPalette((r << 16) | (gg << 8) | b, r, gg, b)) bad++;
    }
    if (total < w * h * MIN_UNMASKED) { skipped++; continue; }
    measured++;
    const frac = bad / total;
    if (frac > worst) { worst = frac; worstT = t; }
  }

  /* The positive control. "0.0% off-palette" is also what a missing file, an
   * unreadable codec and a broken ffmpeg all produce — the check reported a
   * clean pass on a file that did not exist. A result of zero is only
   * meaningful if something was actually looked at. */
  if (measured === 0) {
    rep.add("palette", false,
      "no frame could be read — the palette was never checked "
      + `(${samples} sample(s) attempted, ${skipped} fully masked)`, "#01");
    return;
  }

  const note = skipped ? ` (${skipped} frame(s) fully masked by UI)` : "";
  rep.add("palette", worst <= 0.02,
          `worst ${f(worst * 100, 1)}% off-palette at ${f(worstT, 1)}s (limit 2%)`
          + `${note} · ${measured}/${samples} frames read`, "#01");
}

// ── manifest ────────────────────────────────────────────────────────────────

const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);

const intersects = (a, b) =>
  !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);

const overlapsInTime = (a, b) =>
  !(a.frames[1] <= b.frames[0] || b.frames[1] <= a.frames[0]);

const critical = (e) => e.critical === undefined ? true : e.critical;

function checkSafeZone(manifest, rep) {
  // #18 — text under the caption strip on mobile.
  const sz = manifest.safe_zone;
  if (!sz) { rep.add("safe zone", true, "not declared", "#18", true); return; }
  const bad = manifest.elements
    .filter((e) => critical(e) && (e.bbox[1] < sz.y_min || e.bbox[3] > sz.y_max))
    .map((e) => e.id);
  rep.add("safe zone", !bad.length,
          !bad.length ? "all inside" : `outside: ${bad.slice(0, 4).join(", ")}`, "#18");
}

function checkZones(manifest, rep) {
  // #20 — 'no overlap' as prose was violated twice.
  const zones = manifest.zones || {};
  const stray = [];
  for (const e of manifest.elements) {
    const z = e.zone;
    if (z && z in zones) {
      const zb = zones[z], b = e.bbox;
      if (!(b[0] >= zb[0] - 1 && b[1] >= zb[1] - 1 && b[2] <= zb[2] + 1 && b[3] <= zb[3] + 1))
        stray.push(`${e.id}→${z}`);
    }
  }
  rep.add("zone containment", !stray.length,
          !stray.length ? "all contained" : `escaped: ${stray.slice(0, 4).join(", ")}`, "#20");
}

function checkOverlap(manifest, rep) {
  // #20 — the narration block once sat on top of three other layers.
  const hits = [];
  const els = manifest.elements.filter(critical);
  for (const [a, b] of pairs(els))
    if (overlapsInTime(a, b) && intersects(a.bbox, b.bbox)) hits.push(`${a.id}×${b.id}`);
  rep.add("no overlap", !hits.length,
          !hits.length ? "clean"
            : `${hits.length} collision(s): ${hits.slice(0, 3).join(", ")}`, "#20");
}

function checkCoverage(manifest, rep, floor) {
  // #21 — one feature frame carried under 10% content.
  const [fw, fh] = manifest.frame_size;
  const frameArea = fw * fh;
  let worst = 1.0, worstCh = null;
  for (const ch of manifest.chapters || []) {
    const mid = Math.floor((ch.start + ch.end) / 2);
    const live = manifest.elements
      .filter((e) => e.frames[0] <= mid && mid < e.frames[1]).map((e) => e.bbox);
    if (!live.length) continue;
    const x0 = Math.min(...live.map((b) => b[0])), y0 = Math.min(...live.map((b) => b[1]));
    const x1 = Math.max(...live.map((b) => b[2])), y1 = Math.max(...live.map((b) => b[3]));
    const cov = area([x0, y0, x1, y1]) / frameArea;
    // <= so a film that fills every chapter still names one, instead of "null"
    if (cov <= worst) { worst = cov; worstCh = ch.id; }
  }
  const ok = worst >= floor;
  rep.add("content coverage", ok,
    `worst ${f(worst * 100, 0)}% in ${worstCh} (floor ${f(floor * 100, 0)}%)`
    + (ok ? "" : " — redistribute, do not enlarge"), "#21");
}

function checkDwell(manifest, rep, minS = 1.5) {
  // #31 — text that nobody could read.
  const fps = manifest.fps;
  const short = [];
  for (const e of manifest.elements) {
    if (e.type !== "text" || e.texture) continue;
    const still = e.still_from ?? e.frames[0];
    const dwell = (e.frames[1] - still) / fps;
    if (dwell < minS) short.push(`${e.id}=${f(dwell, 1)}s`);
  }
  rep.add("reading dwell", !short.length,
          !short.length ? `all ≥${minS}s` : `too short: ${short.slice(0, 4).join(", ")}`, "#31");
}

function checkMotion(manifest, rep) {
  // #28 #29 — motion beats position; two large moves read as a glitch.
  const ev = (manifest.motion_events || []).filter((m) => m.magnitude === "large");
  const clash = [];
  for (const [a, b] of pairs(ev)) if (overlapsInTime(a, b)) clash.push(`${a.id}×${b.id}`);
  rep.add("single large motion", !clash.length,
          !clash.length ? "clean" : `simultaneous: ${clash.slice(0, 3).join(", ")}`, "#28");

  const busy = [];
  for (const e of manifest.elements) {
    if (e.type !== "text" || e.texture) continue;
    const still = e.still_from ?? e.frames[0];
    const window = { frames: [still, Math.min(still + Math.trunc(manifest.fps * 1.5), e.frames[1])] };
    for (const m of manifest.motion_events || []) {
      if (overlapsInTime(window, m)) { busy.push(`${e.id}↔${m.id}`); break; }
    }
  }
  rep.add("text reads in stillness", !busy.length,
          !busy.length ? "clean" : `competing motion: ${busy.slice(0, 3).join(", ")}`, "#29");
}

function checkChapters(manifest, rep) {
  const chs = [...(manifest.chapters || [])].sort((a, b) => a.start - b.start);
  if (!chs.length) { rep.add("chapter continuity", true, "none declared", "", true); return; }
  const problems = [];
  let cursor = 0;
  for (const c of chs) {
    if (c.start !== cursor) problems.push(`gap before ${c.id}`);
    cursor = c.end;
  }
  if (cursor !== manifest.duration_frames)
    problems.push(`ends at ${cursor}, expected ${manifest.duration_frames}`);
  rep.add("chapter continuity", !problems.length,
          !problems.length ? "contiguous" : problems.slice(0, 3).join("; "));
}

// ── narrative structure ─────────────────────────────────────────────────────

const ROLE_ORDER = ["situation", "old_way", "transition", "solution", "sweep", "cta"];

function checkStructure(manifest, structure, rep) {
  /* The six-chapter skeleton. Untested structures are the biggest risk in an
   * unattended batch: one wrong skeleton multiplies across every video. */
  if (!structure) {
    rep.add("chapter roles", true, "no structure spec supplied", "", true); return;
  }
  const chs = manifest.chapters || [];
  const sorted = [...chs].sort((a, b) => a.start - b.start);
  // A brand film or a music piece has no six-beat spine and must not be held to
  // one. The skeleton is checked when the spec ASKS for it, never by default —
  // but a declared `roles` is still checked exactly.
  if (!structure.roles) {
    rep.add("chapter roles", true, "spec declares no role skeleton", "", true);
    if (!structure.skeleton) return;
  }
  const roles = sorted.map((c) => c.role);
  const expected = structure.roles || ROLE_ORDER;
  if (structure.roles) {
    const ok = JSON.stringify(roles) === JSON.stringify(expected);
    rep.add("chapter roles", ok,
            ok ? "situation→old→transition→solution→sweep→cta" : `got ${pyRepr(roles)}`,
            "#07");
  }

  // boundaries must match the declared duration class exactly
  const skel = structure.skeleton;
  if (skel) {
    const got = sorted.map((c) => [c.start, c.end]);
    const same = JSON.stringify(got) === JSON.stringify(skel);
    rep.add("class skeleton", same,
      same ? `matches class ${structure.class ?? "?"}`
           : `drifted from class ${structure.class ?? "?"}: ${pyRepr(got.slice(0, 3))}...`);
  }
}

function checkHeroIntro(manifest, structure, rep) {
  // #08 — the source production never named its audience category.
  const limit = (structure || {}).hero_named_before_frame;
  if (!limit) return;
  const tagged = manifest.elements.filter((e) => e.names_hero);
  const first = tagged.length ? Math.min(...tagged.map((e) => e.frames[0])) : null;
  rep.add("hero named early", first !== null && first < limit,
          first !== null ? `frame ${first} (limit ${limit})` : "no element marked names_hero",
          "#08");
}

function checkSweep(manifest, structure, rep) {
  /* The sweep chapter is new and untested. It must accumulate, must not
   * zoom, and must carry enough items to read as breadth.  #30 */
  const sid = (structure || {}).sweep_chapter;
  if (!sid) return;
  const ch = (manifest.chapters || []).find((c) => c.id === sid);
  if (!ch) { rep.add("sweep chapter", false, `chapter '${sid}' not in manifest`); return; }

  const items = manifest.elements.filter((e) => e.chapter === sid && e.sweep_item);
  const need = (structure || {}).sweep_min_items ?? 5;
  rep.add("sweep item count", items.length >= need, `${items.length} items (min ${need})`);

  // accumulation: every item must still be on screen at the chapter's end
  const drops = items.filter((e) => e.frames[1] < ch.end - 2).map((e) => e.id);
  rep.add("sweep accumulates", !drops.length,
    !drops.length ? "all persist to chapter end"
      : `${drops.length} item(s) disappear early — replacement, not accumulation`, "#30");

  // no deep dive: no large motion inside the sweep
  const zooms = (manifest.motion_events || [])
    .filter((m) => m.magnitude === "large" && m.frames[0] < ch.end && m.frames[1] > ch.start)
    .map((m) => m.id);
  rep.add("sweep stays shallow", !zooms.length,
    !zooms.length ? "no zoom or interaction" : `deep dive detected: ${zooms.slice(0, 3).join(", ")}`);
}

function checkRelationShapes(manifest, rep) {
  /* #38 — a shape captioned 'everything is connected' rendered as four
   * boxes with zero lines. A shape that claims a relation must draw it. */
  const bad = [];
  for (const e of manifest.elements) {
    if (!e.claims_relation) continue;
    const n = e.nodes ?? 0;
    const need = e.relation === "mesh" ? Math.floor(n * (n - 1) / 2) : Math.max(n - 1, 0);
    if ((e.edges ?? 0) < need) bad.push(`${e.id} has ${e.edges ?? 0} edges, needs ${need}`);
  }
  rep.add("relation shapes drawn", !bad.length,
          !bad.length ? "all relations drawn" : bad.slice(0, 3).join("; "), "#38");
}

function checkLanguage(manifest, structure, rep) {
  // #39 — Latin strings leaked into an Arabic video.
  const allow = new Set((structure || {}).brand_names || []);
  const lang = (structure || {}).text_language;
  if (!lang) return;
  // an Arabic cut admits no Latin word but a brand; a Latin-script cut (an
  // English version) admits no Arabic one — routes/localization.md
  const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࡰ-ࣿﭐ-﷿ﹰ-﻿]/;
  const foreign = lang === "latin"
    ? (w) => ARABIC_SCRIPT.test(w)
    // every char ASCII and at least one a letter — Python's isascii/isalpha
    : (w) => /^[\x00-\x7F]+$/.test(w) && /[A-Za-z]/.test(w);
  const STRIP = ".,:·—-";
  const strip = (w) => {
    let a = 0, b = w.length;
    while (a < b && STRIP.includes(w[a])) a++;
    while (b > a && STRIP.includes(w[b - 1])) b--;
    return w.slice(a, b);
  };
  const offenders = [];
  for (const e of manifest.elements) {
    // the declared text AND the text the page actually holds: a label declared
    // as "" carried "CHECKS PASSED" through this check in four demos
    const pieces = [...(e.text_nodes || []), e.type === "text" ? (e.text || "") : ""];
    const stray = new Set(pieces.flatMap((p) => p.trim().split(/\s+/)).map(strip)
      .filter((w) => w && foreign(w) && !allow.has(w)));
    if (stray.size) offenders.push(`${e.id}:${[...stray].slice(0, 3).join(" ")}`);
  }
  rep.add("single language", !offenders.length,
          !offenders.length ? `all ${lang}` : offenders.slice(0, 3).join("; "), "#39");
}

function checkCtaStillness(manifest, structure, rep) {
  // #34 — the CTA once held for one second.
  const need = (structure || {}).cta_min_still_frames;
  if (!need) return;
  const cta = (manifest.chapters || []).find((c) => c.role === "cta");
  if (!cta) { rep.add("cta stillness", false, "no chapter with role 'cta'", "#34"); return; }
  const inCta = manifest.elements.filter((e) => e.chapter === cta.id);
  const lastEntry = inCta.length
    ? Math.max(...inCta.map((e) => e.still_from ?? e.frames[0])) : cta.start;
  const still = cta.end - lastEntry;
  rep.add("cta stillness", still >= need, `${still} frames still (min ${need})`, "#34");
}

// ── main ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf("--" + name);
  return i === -1 ? undefined : argv[i + 1];
};
const has = (name) => argv.includes("--" + name);

const video = opt("video"), manifestPath = opt("manifest");
if (!video || !manifestPath) {
  console.error("usage: verify.mjs --video out.mp4 --manifest layout.json "
    + "[--config brand.json] [--structure spec.json] [--skip-palette] [--json report.json]");
  process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const manifest = readJson(manifestPath);
const cfg = opt("config") ? readJson(opt("config")) : {};
const structure = opt("structure") ? readJson(opt("structure")) : null;
const colors = cfg.colors || [];
const lufs = cfg.lufs ?? -14;

const rep = new Report();
// file and audio
checkIntegrity(video, rep);
checkDuration(video, manifest, rep);
checkLoudness(video, lufs, rep);
checkBeatContinuity(video, rep);
if (!has("skip-palette")) checkPalette(video, colors, manifest, rep);
// layout
checkChapters(manifest, rep);
checkSafeZone(manifest, rep);
checkZones(manifest, rep);
checkOverlap(manifest, rep);
checkCoverage(manifest, rep, structure?.coverage_floor ?? 0.45);
checkDwell(manifest, rep);
checkMotion(manifest, rep);
// narrative structure
checkStructure(manifest, structure, rep);
checkHeroIntro(manifest, structure, rep);
checkSweep(manifest, structure, rep);
checkRelationShapes(manifest, rep);
checkLanguage(manifest, structure, rep);
checkCtaStillness(manifest, structure, rep);

const code = rep.render();

if (opt("json")) {
  writeFileSync(opt("json"), JSON.stringify({
    video,
    passed: code === 0,
    checks: rep.rows.map((r) => ({ name: r.name, ok: r.ok, detail: r.detail, ref: r.ref, warn: r.warn })),
    failed: rep.rows.filter((r) => !r.ok && !r.warn).map((r) => r.name),
  }, null, 2), "utf8");
}

if (code) {
  console.log("Do not show this render to the user. Fix and re-run.");
  console.log("Each [#n] maps to references/failure-log.md\n");
}
process.exit(code);

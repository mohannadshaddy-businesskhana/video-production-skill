#!/usr/bin/env node
/* Export the chapter structure as an edit timeline a human post house can open.
 *
 *   node timeline_export.mjs --manifest layout.json --media master.mp4 --edl cut.edl
 *   node timeline_export.mjs --manifest layout.json --media master.mp4 --otio cut.otio
 *
 * Two formats, on purpose:
 *
 *   EDL (CMX3600)  — ancient, ugly, and opened by everything. Use it when you do
 *                    not know what the other side runs.
 *   OTIO           — the modern interchange format. Richer, and readable by the
 *                    OpenTimelineIO adapters that most current tools ship.
 *
 * Neither carries effects, grades or graphics. An EDL is a list of cuts against a
 * source, and handing one over means "here is the structure, the look is in the
 * reference MP4 next to it".
 */
import { readFileSync, writeFileSync } from "node:fs";

const z = (n, w) => String(n).padStart(w, "0");

/** SMPTE non-drop timecode. Only correct for integer rates. */
function tc(frame, fps) {
  const f = Math.round(frame), r = Math.round(fps);
  const h = Math.floor(f / (r * 3600));
  let rem = f % (r * 3600);
  const m = Math.floor(rem / (r * 60));
  rem %= r * 60;
  const s = Math.floor(rem / r), fr = rem % r;
  return `${z(h, 2)}:${z(m, 2)}:${z(s, 2)}:${z(fr, 2)}`;
}

function loadEvents(manifestPath) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  const fps = m.fps ?? 30;
  let chapters = [...(m.chapters || [])].sort((a, b) => a.start - b.start);
  if (!chapters.length) {
    const total = m.duration_frames;
    if (!total) { console.error("manifest has neither chapters nor duration_frames"); process.exit(1); }
    chapters = [{ id: "whole", start: 0, end: total }];
  }
  return [fps, chapters];
}

function writeEdl(path, title, fps, chapters, reel) {
  const lines = [`TITLE: ${title}`, "FCM: NON-DROP FRAME", ""];
  let rec = 0;
  chapters.forEach((c, i) => {
    const dur = c.end - c.start;
    lines.push(`${z(i + 1, 3)}  ${reel.padEnd(8)} V     C        `
      + `${tc(c.start, fps)} ${tc(c.end, fps)} `
      + `${tc(rec, fps)} ${tc(rec + dur, fps)}`);
    const name = c.role || c.id;
    if (name) lines.push(`* FROM CLIP NAME: ${name}`);
    lines.push("");
    rec += dur;
  });
  writeFileSync(path, lines.join("\n"), "utf8");
  return rec;
}

function writeOtio(path, title, fps, chapters, media) {
  /* OTIO's rate and value are float fields, and JSON.stringify cannot emit
   * "30.0" for the number 30. Some adapters are strict about it, so the
   * numbers are parked as marked strings and unquoted on the way out. */
  const F = (n) => `@@${Number.isInteger(Number(n)) ? Number(n).toFixed(1) : String(Number(n))}`;
  const rt = (v) => ({ OTIO_SCHEMA: "RationalTime.1", rate: F(fps), value: F(v) });
  const rng = (start, dur) => ({ OTIO_SCHEMA: "TimeRange.1", start_time: rt(start), duration: rt(dur) });

  const clips = chapters.map((c) => ({
    OTIO_SCHEMA: "Clip.1",
    name: c.role || c.id || "clip",
    source_range: rng(c.start, c.end - c.start),
    media_reference: {
      OTIO_SCHEMA: "ExternalReference.1",
      target_url: String(media),
      available_range: rng(0, chapters[chapters.length - 1].end),
    },
  }));

  const doc = {
    OTIO_SCHEMA: "Timeline.1",
    name: title,
    global_start_time: rt(0),
    tracks: {
      OTIO_SCHEMA: "Stack.1",
      name: "tracks",
      children: [{ OTIO_SCHEMA: "Track.1", name: "V1", kind: "Video", children: clips }],
    },
  };
  writeFileSync(path, JSON.stringify(doc, null, 2).replace(/"@@([-\d.e+]+)"/g, "$1"), "utf8");
  return chapters.reduce((s, c) => s + (c.end - c.start), 0);
}

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf("--" + n); return i === -1 ? undefined : argv[i + 1]; };
const die = (m) => { console.error(m); process.exit(2); };

if (!opt("manifest")) die("--manifest is required");
if (!opt("media")) die("--media is required");
if (!opt("edl") && !opt("otio")) die("pass --edl and/or --otio");

const title = opt("title") || "TIMELINE";
const [fps, chapters] = loadEvents(opt("manifest"));
if (Math.abs(fps - Math.round(fps)) > 1e-6)
  console.error(`note: ${fps} fps is not an integer rate — non-drop timecode will drift. `
    + "Confirm the rate with the post house before delivering.");

if (opt("edl")) {
  const n = writeEdl(opt("edl"), title, fps, chapters, (opt("reel") || "AX").slice(0, 8));
  console.log(`wrote ${opt("edl")}  (${chapters.length} events, ${n} frames)`);
}
if (opt("otio")) {
  const n = writeOtio(opt("otio"), title, fps, chapters, opt("media"));
  console.log(`wrote ${opt("otio")}  (${chapters.length} clips, ${n} frames)`);
}

console.log("\nNeither format carries effects, grades or graphics. Send the reference "
  + "MP4 alongside it, and say which one it is.");

/* Format table — one entry per aspect ratio. Copy into the project and fill.
 *
 * THE CONTRACT
 *   The timeline is shared verbatim across ratios. Only geometry changes.
 *   The timeline is what costs the verification, so it must never fork.
 *
 * WHAT GOES IN A FORMAT
 *   Frame size, safe band, the zone rectangles, and every number the composition
 *   would otherwise hardcode: font sizes, box positions, entrance distances.
 *   If a number appears in the composition and differs between ratios, it
 *   belongs here.
 *
 * ZONES
 *   A zone is [x, y, w, h]. The contract: nothing paints outside its zone, and
 *   no two live boxes intersect. The verifier enforces both, so the zones are
 *   a real constraint and not documentation.
 *   A chapter that overrides a zone's box IS the zone for its children —
 *   declare it with `zoneEl` on the element so the manifest measures the
 *   container that was actually given, not the generic definition.
 *
 * SAFE BAND
 *   16:9  130 → 778   (12%–72%)
 *   9:16  230 → 1690  (12%–88%, clears Reels/Shorts chrome)
 *   1:1   130 → 950   (12%–88%)
 *
 * THINGS THAT BROKE WHEN A SECOND RATIO WAS ADDED
 *   · a max-content line wider than the frame     → white-space:normal + max-width
 *   · a ±56px stagger designed for 1920           → scale the offset per format
 *   · a monospace counter outgrowing its zone     → font ≈ zone width ÷ 5
 *   · a background exactly the frame's width      → make it wider, or a drift
 *                                                    reveals a black strip
 *   · inline styles silently winning              → generated CSS needs !important
 */

const SAFE = { "16x9": [130, 778], "9x16": [230, 1690], "1x1": [130, 950] };

export const F16x9 = {
  id: "16x9", w: 1920, h: 1080, safeTop: SAFE["16x9"][0], safeBottom: SAFE["16x9"][1],

  // a=counter · b=logo · c=narrative text · d=interface/figure · e=header
  zones: {
    a: [96, 140, 464, 160],
    b: [1560, 140, 264, 120],
    c: [96, 340, 804, 360],
    d: [940, 300, 884, 460],
    e: [620, 140, 880, 80],
  },

  // type that differs per ratio
  text: { counter: 92, counterTag: 24, counterTagTop: 110, head: 42, off: 56 },

  // entrance distances — a slide tuned for 1920 overshoots a 1080 frame
  slide: { head: 300, name: 90, def: 180 },

  // add one block per chapter: every position and size that chapter needs
  // ch1: { ... }, ch2: { ... }, ...
};

export const F9x16 = {
  id: "9x16", w: 1080, h: 1920, safeTop: SAFE["9x16"][0], safeBottom: SAFE["9x16"][1],
  zones: {
    a: [72, 250, 440, 170],
    b: [744, 250, 264, 120],
    c: [72, 1250, 936, 430],
    d: [72, 570, 936, 640],
    e: [72, 440, 936, 100],
  },
  text: { counter: 76, counterTag: 24, counterTagTop: 96, head: 44, off: 36 },
  slide: { head: 260, name: 90, def: 180 },
};

export const F1x1 = {
  id: "1x1", w: 1080, h: 1080, safeTop: SAFE["1x1"][0], safeBottom: SAFE["1x1"][1],
  zones: {
    a: [60, 140, 300, 130],
    b: [860, 140, 160, 76],
    c: [60, 700, 960, 246],
    d: [60, 310, 960, 360],
    e: [380, 140, 460, 80],
  },
  text: { counter: 52, counterTag: 20, counterTagTop: 66, head: 38, off: 30 },
  slide: { head: 240, name: 80, def: 160 },
};

export const FORMATS = { "16x9": F16x9, "9x16": F9x16, "1x1": F1x1 };

/* Output directory names: use WORDS, not ratios.
 *
 * A directory literally named "9x16" made the renderer fail at the audio stage
 * with `audio_processing_failed: spawn EPERM`, while byte-identical content in a
 * directory named "vertical" rendered first time. The output file is named after
 * the directory. Four attempts to find that.
 */
export const DIRS = { "16x9": "wide", "9x16": "vertical", "1x1": "square" };

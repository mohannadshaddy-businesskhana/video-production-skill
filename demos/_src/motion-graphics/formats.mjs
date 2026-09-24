/* The motion-graphics film, one geometry table per ratio.
 *
 * The timeline is shared verbatim (film.html) — only these numbers fork.
 * Each ratio is DESIGNED, not scaled: a square has 820px of safe height where
 * the vertical has 1460, so the chart gets shorter than a straight scale would
 * make it, to leave the counter room above it; the wide frame puts the words
 * on the right (where Arabic starts) and the shape on the left.
 *
 * A box is [x, y, w, h, radius], the radius a number or [tl, tr, br, bl].
 * Every shape state is centred on the same point per ratio, so the dot grows,
 * the circle returns and the button opens from one place.
 */

export const FORMATS = {
  vertical: {
    w: 1080, h: 1920, safe: [230, 1690],
    DOT: [460, 740, 160, 160, 80],
    CIRCLE: [230, 510, 620, 620, 310],
    BAR: { A: [691, 1030, 301, 150, [0, 75, 75, 0]], B: [390, 1030, 301, 150, 0],
           C: [88, 1030, 302, 150, [75, 0, 0, 75]] },
    BLOCK: [440, 1030, 200, 150, 36],
    COLUMN: { A: [430, 933, 220, 247, [0, 0, 36, 36]], B: [430, 687, 220, 246, 0],
              C: [430, 440, 220, 247, [36, 36, 0, 0]] },
    STEPS: { A: [724, 930, 268, 250, 28], B: [416, 680, 268, 500, 28], C: [108, 430, 268, 750, 28] },
    PILL: [140, 720, 800, 200, 100],
    base: [88, 1180, 904],
    cnt: { box: [290, 270, 500, 150], size: 150, from: 760 },
    lbl: { w: 268, h: 110, size: 96, at: [[724, 950], [416, 700], [108, 450]] },
    tag: { size: 56 },
    win: { box: [88, 1330, 904, 260], top: 26, size: 76, push: 280 },
  },

  square: {
    w: 1080, h: 1080, safe: [130, 950],
    DOT: [480, 380, 120, 120, 60],
    CIRCLE: [320, 220, 440, 440, 220],
    BAR: { A: [673, 580, 267, 120, [0, 60, 60, 0]], B: [407, 580, 266, 120, 0],
           C: [140, 580, 267, 120, [60, 0, 0, 60]] },
    BLOCK: [460, 580, 160, 120, 30],
    COLUMN: { A: [450, 567, 180, 133, [0, 0, 30, 30]], B: [450, 434, 180, 133, 0],
              C: [450, 300, 180, 134, [30, 30, 0, 0]] },
    STEPS: { A: [700, 580, 240, 120, 24], B: [420, 460, 240, 240, 24], C: [140, 340, 240, 360, 24] },
    PILL: [220, 360, 640, 160, 80],
    base: [140, 700, 800],
    cnt: { box: [340, 170, 400, 110], size: 110, from: 415 },
    lbl: { w: 240, h: 80, size: 64, at: [[700, 590], [420, 470], [140, 350]] },
    tag: { size: 44 },
    win: { box: [88, 790, 904, 150], top: 5, size: 54, push: 160 },
  },

  wide: {
    w: 1920, h: 1080, safe: [130, 778],
    DOT: [460, 385, 120, 120, 60],
    CIRCLE: [290, 215, 460, 460, 230],
    BAR: { A: [647, 620, 253, 120, [0, 60, 60, 0]], B: [393, 620, 254, 120, 0],
           C: [140, 620, 253, 120, [60, 0, 0, 60]] },
    BLOCK: [440, 620, 160, 120, 30],
    COLUMN: { A: [430, 594, 180, 146, [0, 0, 30, 30]], B: [430, 447, 180, 147, 0],
              C: [430, 300, 180, 147, [30, 30, 0, 0]] },
    STEPS: { A: [680, 620, 220, 120, 24], B: [410, 500, 220, 240, 24], C: [140, 380, 220, 360, 24] },
    PILL: [210, 365, 620, 160, 80],
    base: [140, 740, 760],
    cnt: { box: [320, 170, 400, 110], size: 110, from: 455 },
    lbl: { w: 220, h: 80, size: 64, at: [[680, 630], [410, 510], [140, 390]] },
    tag: { size: 44 },
    win: { box: [1040, 360, 792, 190], top: 12, size: 64, push: 210 },
  },
};

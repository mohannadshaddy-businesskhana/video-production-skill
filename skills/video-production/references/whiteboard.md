# Whiteboard / hand-drawn explainer

## No new dependency is needed

The obvious move is to install a whiteboard package. Don't — `/hyperframes-keyframes` already owns
**SVG draw and morph**, and that is the entire mechanism a whiteboard video uses. A dependency
would add a licence to audit and a renderer to babysit for something the stack does natively.

## The mechanism

A "hand drawing" is one line revealing itself:

```css
.ink { stroke-dasharray: var(--len); stroke-dashoffset: var(--len); }
```

Animate `stroke-dashoffset` from `--len` to `0` and the stroke appears to be drawn. `--len` is the
path's own `getTotalLength()`, measured once at build time and written into the composition as a
literal — **never measured at render time**, because a render seeks each frame independently and a
measurement taken during one frame is not available to the next.

```js
// build time, once
const len = Math.ceil(path.getTotalLength());
path.style.setProperty("--len", len);
// timeline
tl.fromTo(path, { strokeDashoffset: len },
  { strokeDashoffset: 0, duration: len / SPEED, ease: "none", immediateRender: false }, at);
```

`ease: "none"` matters. A hand moves at roughly constant speed; an eased stroke reads as a machine.

## The hand — this is the type, not a decoration

**A whiteboard video is a hand drawing on a board while a voice explains.** An earlier version of
this file called the hand "optional, and usually better without" — and the demo built from that
advice was rejected as "just animation with text", because without the hand it is not a whiteboard
video at all. It is the defining element; see `video-types.md`.

The hand is an image element whose position follows the path — `MotionPath` in GSAP, or a
pre-sampled point list written at build time. Keep the pen tip at the stroke's leading edge, which
means the hand's anchor offset is part of the asset, not a tweak.

**And the narration drives it.** The drawing is paced to the voice: each stroke lands on the word
that names it. Without a voice, the pacing has nothing to follow and the drawing reads as a
screensaver.

Two failure modes: a hand that lags the ink (looks like tracing someone else's drawing), and a hand
that never lifts between strokes (reads as one impossible continuous line). Hide it during gaps.

## Traps in the drawing itself

None of these fails a gate. The drawing is just wrong.

- **A closed circle from one arc.** An `A` command whose end sits just *beside* its start solves to
  a different circle: one whose top or bottom is the start point, a radius away from where it was
  meant. End it along the tangent instead: from the rightmost point, 0.1px *above* it. Every circle
  in the first draft of the demo was off by its own radius.
- **A path with several subpaths.** The pen jumps between them in a single frame. Use one stroke per
  path; the pen lifts and travels between strokes.
- **A tick is not a cross.** A V with one diagonal through it reads as a ticked box, which means
  "done", the opposite of "crossed out". Cross out with an X.
- **Written words.** Reveal each word with a clip on the text's own box, not on its container.
  Run the clip past that box on every side, or a glyph's overhang stays cut after it is written.
- **The hand is motion.** After a word the voice does *not* say, it holds still through the
  reading hold below, or it is the competing motion that #29 fails. A word the voice says as it is
  written is heard, not read, and the hand moves straight on (#49).
- **The hand itself.** Sausage fingers laid over a palm read as a toy. Draw one silhouette seen
  from the back: the index finger along the barrel, its nail, the thumb under it, the knuckles, and
  a cuff where the sleeve begins. Draw it flat, pointing left, then turn it so the tip leads.

## It has to look like a board, not an animation

A version with perfect geometric lines on a white page was reviewed as "an animation". A
whiteboard video is recognisable by three things:

- **A real surface.** Show a frame at the edges, a faint sheen, the ghosts of writing that was
  wiped off, and a tray with markers and an eraser. The viewer should know what is being drawn on.
- **Real ink.** Every stroke wanders slightly, as a hand does. A quick line runs past its end. A
  circle goes on past where it started instead of closing exactly. The ink goes on unevenly. In
  the demo, each path is sampled at build time and redrawn with a slow seeded wander, then painted
  with a small ink texture tile.
  - **Never use an SVG filter for the texture.** `feTurbulence` recomputes its noise every frame on
    the CPU, and the page never finished loading.
- **A camera that works across the board.** Make the board larger than the frame. Start close on
  one part, and move across it in reading order: for Arabic that is right, left, then the row below.
  - The drawing that links two parts is a **bridge**: an arrow at the end of one part that the
    camera follows into the next, so the next line starts there on its first word.
  - End by pulling back until the whole board is in frame, full, every drawing side by side.

Two traps from building it:

- **An open stroke must not wrap.** Reading a point at the path's own length through a modulo
  returned its *start*, and the overshoot drew a bar across the ٧'s open top.
- **Never return the timeline from a probe.** `evaluate(() => tl.seek(t))` hands Playwright the
  whole GSAP timeline to serialise, and it hangs as if the page were stuck. Return `true`.

## Nothing is ever just sitting there

A pause in the voice with the hand at rest is dead air (#49), and a whiteboard makes it easy: the
drawing finishes, and the hand waits for the next line. So **each line draws until the next line
begins.**

- **Main strokes** land on the words that name them.
- **Finishing details** join group by group, while they fit: a bulb's filament and shine, collars
  on the people, a clock's ticks, arrows for who hands the work to whom, a play button in each
  frame. A group is all or nothing, so no clock ends up with half its ticks.
- **One hand speed** is then solved for the line, between 1000 and 3200 px/s, so its drawing ends
  as the next line starts.

A pause in the voice is where the hand is busiest. The "no dead air" gate in `verify.mjs` checks the
result.

Order the details so the hand has little ground to cover. Arrows drawn from the end nearest the last
word fitted in a breath; the same arrows started from the far side did not.

A working example is `demos/_src/whiteboard/` in this skill's repository. It has three parts: the
drawing table with its details, a layout driven by the voice's measured lines, and the pen tip read
from each path's `getPointAtLength` at the ink's leading edge.

## Timing that reads as handwriting

| Element | Rate |
|---|---|
| A short word | ~0.25–0.4s |
| A simple icon | ~0.8–1.2s |
| A full illustration | 2–4s |

Draw speed should be roughly constant across the video — measure in **pixels of path per second**,
not seconds per element, or a long word will crawl while a short one snaps.

Then **hold**. The drawing rule and the reading rule are the same rule: a finished drawing needs the
same ≥1.5s of stillness any other text needs. Whiteboard videos fail the reading-dwell check more
than any other style because the drawing time feels like reading time. It is not — the viewer reads
after the line finishes.

## Getting the paths

- Real handwriting: write it, photograph it, trace to SVG. Best result, most work.
- A single-stroke font converted to paths: fast and consistent, slightly mechanical.
- `/hyperframes-registry` first — search before hand-building. A sketch or draw-on primitive may
  already exist.

## Where it belongs

Whiteboard is a **technique**, not a route. It attaches inside any route whose subject is a process
or an explanation. If the video's message is "this is complicated but follow me", it earns its
place. If the message is "this is fast", it fights the message — the style's whole character is
taking its time.

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

## The hand

Optional, and usually better without. If you want one, it is an image element whose position follows
the path — `MotionPath` in GSAP, or a pre-sampled point list written at build time. Keep the pen tip
at the stroke's leading edge, which means the hand's anchor offset is part of the asset, not a
tweak.

Two failure modes: a hand that lags the ink (looks like tracing someone else's drawing), and a hand
that never lifts between strokes (reads as one impossible continuous line). Hide it during gaps.

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

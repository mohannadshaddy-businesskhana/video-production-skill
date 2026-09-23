# Toolchain traps — the failures that pass every check and ship a broken file

> Added after producing a full series in three aspect ratios (2026-09).
> `failure-log.md` covers mistakes of **judgement**: brand, message, narrative, layout.
> This file covers mistakes of **execution**: code that looks right, a preview that looks right, a
> silent lint — and a broken video.
>
> The distinction matters. Judgement errors are caught by looking. These are not.

---

## 1. The most dangerous class — silent render failure

The renderer builds each frame with an independent **seek**. Any code that assumes sequential
playback fails without an error message.

| # | Trap | Symptom | Fix |
|---|---|---|---|
| T1 | `<html dir="rtl">` | **a fully black video** · preview and snapshots both fine | no attribute on `<html>` at all; scope direction to the elements inside |
| T2 | `tl.set(x, 0)` | frame 0 shows every element that should be hidden | initial state with `gsap.set()` **outside** the timeline |
| T3 | `fromTo` | the "from" applies at authoring time, so it stays visible in every scene | `immediateRender: false` on every `fromTo` |
| T4 | `tl.call()` | callbacks are suppressed on seek → counters **never update in the render** while working in the preview | no `tl.call`; drive the DOM from `onUpdate` on a tween over an object |
| T5 | `tl.seek(t)` | the same problem in any tool that seeks for itself — `suppressEvents` defaults to `true` | `tl.seek(t, false)` |
| T6 | tweening `text` | a silent no-op without TextPlugin | `el.textContent = …` |
| T7 | duplicate ids | a builder called more than once → the selector only ever finds the first | a mandatory prefix per instance |

> **The general rule:** anything that "runs once" is a suspect. Ask: if this frame were built alone,
> with nothing before it, would it come out right?

---

## 2. Measuring tools lie — and the comfortable lie is the dangerous one

In one production, **three of the checkers I wrote returned wrong numbers, twice in the direction
that let a failure pass.**

| # | Cause | Symptom |
|---|---|---|
| T8 | transparent layout containers counted as "content" | different numbers come out exactly identical |
| T9 | measuring on a **transitional** frame | a real change moves no number |
| T10 | not clipping to `overflow:hidden` | a cropped image measures at its full off-frame size |
| T11 | ignoring the `data-start` / `data-duration` window | an element counts as visible in every scene |
| T12 | a transparent full-width box around small text | 49% coverage reported, 36% true |
| T13 | a threshold written in one format's pixels | **100% for every chapter** in another format |

**A checker must:** measure only what **paints** (background · border · own text · img · svg) · clip
to every `overflow:hidden` ancestor · respect the time window · take the frame size as an
**argument**, never a constant · and sample **still** frames.

> **Warning sign:** any comfortable pass — go and find out why it is comfortable. And any number
> that does not move after a real change — suspect the checker before you suspect the change.

### 2.1 Seeking alone does not change which scene is visible

The runtime decides which `clip` is on screen from `data-start`. Any checker or screenshot tool has
to apply that itself, or it photographs the wrong scene:

```js
document.querySelectorAll("section[data-start]").forEach((el) => {
  const st = parseFloat(el.dataset.start) * fps;
  const du = parseFloat(el.dataset.duration) * fps;
  el.style.visibility = f >= st && f < st + du ? "visible" : "hidden";
});
```

### 2.2 Playwright hangs with no message

`seek()` returns the timeline. An arrow function without braces returns it implicitly, so the
serializer tries to unpack a live GSAP object — **and the call hangs forever.**

```js
await p.evaluate((n) => tl.seek(n / 30, false), f);      // ✗ hangs
await p.evaluate((n) => { tl.seek(n / 30, false); }, f); // ✓
```

And Node variables do not exist inside `page.evaluate` — they must be passed as an argument.

---

## 3. Audio — normalising alone produces clipping

`loudnorm` reached −14.0 LUFS and a **true peak of +3.5 dBFS**. AAC encoding adds intersample peaks
above the PCM peak.

```bash
# pass 1: measure  →  pass 2: apply the measured values + a limiter with real headroom
... ,alimiter=limit=0.794:attack=5:release=50:level=disabled,aresample=48000
```

And tightening the limiter does not monotonically help: `0.84` produced a **worse** peak than
`0.891`. **Measure every candidate; do not reason about it.**

### 3.1 A script that resolves its dependencies next to itself breaks the moment it moves

`import { chromium } from "@playwright/test"` resolves **relative to the file**. So it works as long
as the script lives inside the project, and dies the moment it is installed in `~/.claude/skills/` —
there is no `node_modules` there. This happens to everyone who installs from a repo or a package.

```js
// resolve from the working directory, not from the script's directory
const req = createRequire(pathToFileURL(join(process.cwd(), "noop.js")).href);
const mod = await import(pathToFileURL(req.resolve(name)).href);
```

Two follow-ons, both of which bit afterwards:

- **A CommonJS package imported with `import()`** puts its exports on `.default`, and the lexer does
  not always surface the named bindings. Read `mod?.chromium || mod?.default?.chromium`, never just
  the first.
- **On Windows an absolute path is not a valid ESM specifier** — `C:` parses as a URL scheme, so
  `import("C:\\…\\lib\\cdp.mjs")` throws *"Only URLs with a scheme in: file, data, and node"*. Every
  dynamic import of a path must go through `pathToFileURL()`.

The real fix was to stop depending on the package at all: `lib/cdp.mjs` drives any Chromium over the
DevTools Protocol using Node's built-in WebSocket, so nothing has to resolve.

**And a trap inside the trap:** these packages are CommonJS. `import()` of a CJS file puts
`module.exports` on `default`, and named exports are detected by a lexer that sometimes misses. So:

```js
const pick = (mod) => mod?.chromium || mod?.default?.chromium;
```

Without that line the import succeeds, the value is `undefined`, the code moves to the next
candidate, and eventually throws "not installed" — about a package that is installed.

---

## 4. Environment

| Symptom | Cause | Fix |
|---|---|---|
| `audio_processing_failed: spawn EPERM` | a shim for ffmpeg that cannot be spawned | put the real binary's directory on PATH |
| **the same error in one project out of three** | the output file is named after the **directory**, and a directory named `9x16` fails | name directories with words: `main` · `vertical` · `square` |
| render fails needing disk space | `TEMP` on a small drive | point `TEMP` / `TMP` at a drive with ≥6 GB |
| `missing_timeline_registry` | the lint reads `index.html` **as text**, so a `<script src>` reads as having no timeline | inline the JS into the file; keep the source in `_src/` **inside** the project directory |
| `root_dimensions_mismatch` | the lint reads the **first** `html, body` rule | **replace** the rule; do not add another |

### 4.1 A browser that exists is not a browser that runs

`existsSync(chrome.exe)` is not a launch test. On this machine **both** full Chromium builds in the
Playwright cache fail with `spawn UNKNOWN` (errno −4094) — present, complete, and blocked by the
system; only the headless shell starts. Code that picks the first path that exists picks a browser
that cannot open.

Try every candidate and report all the failures together. `lib/cdp.mjs` does this; `doctor.mjs`
launches one for real rather than asking whether a file is there.

### 4.2 Measure with the browser that renders

Text advance widths differ between Chromium builds. Measuring a composition with a system Chrome
while a bundled Chromium renders it produced boxes up to **23px wider** than the video actually
contained — on text at 23px and below, where a font-fallback difference shows most.

No verdict changed in our comparison (`verify.py` passed on both manifests), which is exactly why
this is dangerous: the error is small enough to survive the gate and wrong enough to matter at a
zone boundary. `lib/page.mjs` prefers the renderer's own Playwright when it is installed, and
otherwise sorts the renderer's cached Chromium ahead of any system browser.

---

## 5. Layout that breaks when the aspect ratio changes

| # | Symptom | Cause |
|---|---|---|
| T14 | a line runs outside the frame | `width:max-content` does not wrap — needs `white-space:normal` + `max-width` |
| T15 | text touches its neighbour | the same cause: the element is wider than the box it is centred in and spills both ways |
| T16 | half the slogan is off screen | a ±56px offset designed for a 1920 frame |
| T17 | an element escapes its zone | fixed font size, narrower zone · for monospace, roughly `width ÷ 5` |
| T18 | a logo crushed to 32px tall | an SVG in a flex column without `flex-shrink: 0` |
| T19 | a black strip creeps in from the edge | a background exactly the frame's width + a drift tween — make it wider |

**The architecture that worked for three ratios:** the timeline is shared **verbatim** (it is what
cost all the verification) · geometry in one definition file per ratio · a generator that merges
them. And **inline styles beat generated CSS** — they need `!important`, or the new ratio silently
inherits the old ratio's numbers.

---

## 6. Logos and imitated interfaces

- **Another product's logo has to be that product.** A single-colour outline icon is not recognised.
  Official colours and the real silhouette. Drawing them as SVG is enough — no downloads needed.
- **Size is part of recognition:** 20px is "present", 26px is "clear".
- **An official brand colour can fail a contrast check.** `#4285F4` on white is 3.56:1. Darkening it
  one step is invisible and keeps the gate clean without an exemption.
- **If you imitate an app's interface, imitate it correctly.** An incoming WhatsApp message has
  **no ✓✓** — those belong to messages you sent. Every user of the app sees that instantly.

---

## 7. Additions to the stop list in `unattended.md`

| # | Situation | Why |
|---|---|---|
| T-S1 | the render is black, or its duration is zero | a structural trap (T1) — do not guess at a fix |
| T-S2 | a checker reports **100%** or any impossible number | the checker is broken, not the video — fix the checker first |
| T-S3 | `spawn EPERM` after the PATH is already fixed | path or environment, not content |

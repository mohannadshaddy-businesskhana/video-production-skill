# Delegation — what we call, and what we must never absorb

## Why this layer sits outside the framework

`/hyperframes` is installed and refreshed by its own CLI:

```bash
npx hyperframes skills update <name>
```

That command **overwrites the skill directory**. Any rule, trap, or script written inside
`hyperframes/` is gone at the next update, silently, and the loss only surfaces when a mistake it
prevented happens again.

So the direction is fixed: **this skill wraps the framework; the framework never wraps this skill.**

## The map

| Need | Goes to | Never rebuild it here |
|---|---|---|
| Intent interview, `BRIEF.md`, routing | `/hyperframes` → `references/intent-interview.md` | ✅ it is better than anything we would write |
| Script and storyboard formats | `/hyperframes` → `references/script-format.md`, `storyboard-format.md` | ✅ |
| Storyboard review on a live board, sketch pass | `/hyperframes` → `references/review-loop.md` | ✅ the sketch **is** a real composition — better than a drawn board |
| Composition contract, `data-*`, tracks, determinism | `/hyperframes-core` | ✅ |
| Motion rules, blueprints, transitions, runtime adapters | `/hyperframes-animation` | ✅ |
| Punch-ins, camera moves, seek-safe keyframes | `/hyperframes-keyframes` | ✅ |
| Palettes, typography, design spec, beat planning | `/hyperframes-creative` | ✅ |
| Music, SFX, images, icons, logos, voice, LUTs, **licence ledger** | `/media-use` | ✅ |
| Voiceover carve, effect chains, automation, submix | `/hyperframes-audio` | ✅ |
| init, lint, check, snapshot, preview, render, publish, batch | `/hyperframes-cli` | ✅ |
| Named looks and effects — glitch, grain, scanlines, confetti | `/hyperframes-registry` | ✅ search before hand-building |

## What genuinely has no home over there

These are ours because the framework is a **rendering framework**, not a production company.

| Ours | Why it is not theirs |
|---|---|
| Brand contract enforcement | The framework has no opinion about your brand |
| External verifier (`verify.py`) | `check` proves the composition is valid; it cannot prove the video is *right* — that the claim reads, the frame is filled, the text can be read, the story has its six beats |
| Multi-aspect **design** system | The framework renders whatever aspect you give it; deciding that 9:16 is re-laid-out and not cropped is a production decision |
| Loudness to a platform target | `hyperframes-audio` mixes; nobody normalises to −14 LUFS with a true-peak ceiling that survives AAC |
| Delivery QC against platform specs | No deliverables matrix exists upstream |
| Budget, shoot plan, call sheet, cue sheet | Out of scope for a renderer, entirely |
| Cutdowns and version sets | No cutdown tooling exists upstream |
| The unattended batch protocol | The framework's loops assume a person is watching |
| The failure log and the toolchain traps | Institutional memory, by definition local |

## How to call across

Workflow skills install lazily. Before reaching for one:

```bash
npx hyperframes skills update <workflow-name>   # bare name, no leading /
```

Then resolve the installed skill directory and invoke its scripts **by absolute path**, passing the
project root explicitly. Never assume a sibling-relative path like `../media-use` — the project may
live anywhere.

## The one thing we require back

A composition built through `/hyperframes` on our behalf must register its elements:

```js
window.__MF = [];
const mf = (id, o) => { window.__MF.push(Object.assign({ id }, o)); };
window.__MOTION = [];
const motion = (id, a, b) => { window.__MOTION.push({ id, frames: [a, b], magnitude: "large" }); };
```

That is the whole contract. Everything else in verification follows from it, and it costs one line
per element at build time. Without it there is nothing to verify against and this layer is decoration.

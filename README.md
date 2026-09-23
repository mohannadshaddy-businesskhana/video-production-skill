# video-production

An Agent Skill for producing video that is **verified, not hoped for**.

It sits on top of a rendering framework and owns the things a rendering framework has no opinion
about: the brand contract, an external verifier that fails the build, multi-aspect delivery, QC
against platform specs, and a protocol for running a batch overnight without a human watching.

## Why it exists

Two real productions, both with the same shape of problem.

In the first, four rules were written clearly in the spec and violated in the very next render.
Prose gets interpreted; code gets executed.

In the second — eighteen videos from one template, three aspect ratios, 54 files — a defect in the
template passed five videos and then failed ten in a row. The stop rule caught it at video six, not
video eighteen.

Both times the answer was the same: make the composition **declare** where everything landed, and
make a verifier **fail the build** when reality disagrees.

```
brief → plan → build → VERIFY → deliver
                         ↑
                nothing ships past here unproven
```

## What it checks

An external verifier reads the rendered file and a layout manifest, and fails on any of:

| | |
|---|---|
| file integrity · duration · loudness · beat continuity | the file itself |
| palette off-brand | colour discipline |
| safe zone · zone containment · no overlap | layout contracts |
| content coverage | a frame that is 30% content and 70% nothing |
| reading dwell · text reads in stillness · single large motion | can a human actually read it |
| chapter roles · skeleton · sweep behaviour · hero named early · CTA stillness | narrative structure |
| relation shapes drawn | a diagram captioned "everything is connected", drawn with zero lines |
| single language | a stray Latin string in an Arabic cut |

Plus `delivery_qc.py` against platform specs — resolution, frame rate, duration bounds, codec,
loudness, true peak, silence, bitrate, file size.

## Install

```bash
git clone https://github.com/<you>/video-production-skill
cp -r video-production-skill/skills/video-production ~/.claude/skills/
```

Then in a session: the skill announces itself for any video request.

Check the machine first — it says what is missing and what each thing costs you:

```bash
node skills/video-production/scripts/doctor.mjs
```

### Requirements

**There is nothing to install for the skill itself.** No `npm install`, no `pip install`. It needs
four things that a machine which can make video almost certainly already has:

| | | |
|---|---|---|
| **Node 18+** | the measurer and the batch scripts | 22+ uses the built-in WebSocket; below that, Playwright covers it |
| **FFmpeg** + `ffprobe` | render, normalise, probe, and every frame the verifier reads | [download](https://ffmpeg.org/download.html) |
| **Python 3.8+** | `verify.py` and `delivery_qc.py` | **standard library only** |
| **a Chromium** | measuring what actually rendered | Chrome, Edge, Chromium — or the one the renderer downloads itself |

Plus **[HyperFrames](https://hyperframes.heygen.com)** — the rendering framework this delegates to.
Apache-2.0, free, renders locally, no API key. `npx hyperframes` fetches it on first use, which is
the one step that needs the network.

Nothing is pinned to a particular browser: `VP_BROWSER` names an executable, `VP_DRIVER=cdp` or
`playwright` forces a driver. If Playwright happens to be in the project, the measurer uses it —
not for convenience, but because you should **measure with the browser that renders**.

## The one contract

A composition built under this skill registers its elements:

```js
window.__MF = [];
const mf = (id, o) => { window.__MF.push(Object.assign({ id }, o)); };
```

`scripts/manifest.mjs` then measures what actually rendered and writes `layout.json`. The
declaration and the measurement are compared; a disagreement is a bug, not a detail.

**Skip the manifest and you have a document, not a skill.**

## What is in here

```
skills/video-production/
├── SKILL.md                   the router and the spine
├── routes/                    launch-video · section-series · brand-film · versions
│                              localization · camera-project · audit
├── references/
│   ├── failure-log.md         mistakes of judgement — what the eye catches
│   ├── toolchain-traps.md     mistakes of execution — what it does not
│   ├── delegation.md          what we route to, and what we must never absorb
│   ├── formats.md             multi-aspect: one timeline, one geometry table per ratio
│   ├── verification.md        the manifest schema and every check
│   ├── unattended.md          the overnight batch protocol
│   └── …
├── scripts/
│   ├── doctor.mjs             what is installed, and what you lose without it
│   ├── manifest.mjs           measures what actually rendered
│   ├── verify.py              the gate — stdlib only
│   ├── lib/                   a zero-dependency CDP browser driver
│   └── …                      delivery_qc · normalize · cutdown · budget
│                              shoot_plan · cue_sheet · localize · timeline_export
└── assets/                    brand config · rate card · delivery specs · format table
```

## A sample of what is in the traps file

Every one of these produced a broken MP4 while the preview, the lint and the snapshots all looked
clean:

- `<html dir="rtl">` renders a **fully black video**
- `tl.set(…, 0)` does not apply at frame 0, so frame 0 shows every hidden element
- `fromTo` applies its "from" at authoring time — a highlight ring stayed visible in every scene
- `tl.call()` is skipped on seek, so every callback-driven counter dies **in the render only**
- `seek()` suppresses events by default — the same bug, in your own preview tooling
- a directory named `9x16` fails the render at the audio stage; `vertical` renders first time

And the ones where the measuring tool itself lied — twice in the direction that let a failure pass.

## Bilingual references

Everything is in **English**. Six references also ship as `<name>.ar.md` — the Arabic originals,
kept because that is the language the productions were actually run in and the wording the
corrections were given in. The English file is the one to read; the Arabic one is the primary
source.

## Licence

Apache-2.0. See [LICENSE](LICENSE).

The **rate card is not included** — `assets/rate-card.template.json` ships with every rate set to
zero. Studio rates are the one thing in this system that should not be shared.

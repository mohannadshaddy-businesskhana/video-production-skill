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

### Requirements

- **[HyperFrames](https://hyperframes.heygen.com)** — the rendering framework this delegates to.
  Apache-2.0, free, renders locally. `npx hyperframes` — no API key.
- **FFmpeg** with `ffprobe`
- **Python 3.10+** with `numpy` and `Pillow` (the verifier's palette check)
- **Node 18+** with `@playwright/test` (the manifest measurer)

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
├── scripts/                   manifest · verify · delivery_qc · normalize · cutdown
│                              budget · shoot_plan · cue_sheet · localize · timeline_export
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

## Language note

`SKILL.md`, all routes, and the newer references are in **English**. Four inherited references —
the failure log, production rules, narrative guidance, and the unattended protocol — are in
**Arabic**, because that is the language the productions they came from were run in. They are the
most battle-tested files in the repo. Translation is open as
[issue #1](../../issues/1) if this matters to you.

## Licence

Apache-2.0. See [LICENSE](LICENSE).

The **rate card is not included** — `assets/rate-card.template.json` ships with every rate set to
zero. Studio rates are the one thing in this system that should not be shared.

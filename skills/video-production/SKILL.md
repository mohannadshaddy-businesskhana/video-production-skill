---
name: video-production
description: >
  The production house layer for video work — brief, budget, shoot plan, brand contract, external
  verification, multi-aspect delivery, QC against platform specs, and unattended batch runs. Use it
  for ANY video request: a brand film, a product or section explainer, a launch video for a repo or
  site, a social cutdown, a localized version, a batch of videos from one template, or a review of a
  video that already exists. Also use when a render "looks fine" but something is wrong, when a
  series must stay consistent across many videos, when work must run overnight without supervision,
  or when a project needs a quote, a call sheet, a cue sheet, or a delivery matrix. It owns what the
  rendering framework does not, and delegates all authoring and rendering to /hyperframes.
license: Apache-2.0
---

# Video production

A house layer over a rendering framework. **The framework knows how to build a video. This skill
knows what makes it right, and how to prove it.**

## The division that makes this work

`/hyperframes` renders video from HTML and owns the whole craft: composition contract, animation,
keyframes, design, audio mixing, media sourcing, CLI, registry. It is excellent and it is
**maintained upstream** — `npx hyperframes skills update` overwrites it.

So nothing we learn can live inside it. This skill is the outside:

| This skill owns | `/hyperframes` owns |
|---|---|
| The brand contract, and that it is obeyed | Composition structure and timing |
| The failure log and the toolchain traps | Animation, keyframes, transitions |
| An **external verifier** that fails the build | `lint` / `check` (internal correctness) |
| Multi-aspect layout as a first-class system | Rendering one composition |
| Budget, shoot plan, cue sheet, delivery matrix | Media sourcing, mixing, captions |
| Unattended batch protocol and the run log | Interactive authoring loops |

**Never reimplement what `/hyperframes` does.** Route to it. See `references/delegation.md`.

## The one idea

**Rules written as prose get violated. Rules written as code do not.**

This skill was distilled from two real productions. In the first, four rules were written clearly in
the spec and violated in the very next render. In the second, a template defect multiplied across
eighteen videos before a stop rule caught it. Both times the fix was the same: make the composition
**emit a manifest** of where everything landed, and make a **verifier fail the build**.

If you skip the manifest, you have no skill — you have a document.

## Read before anything else

| File | When |
|---|---|
| `references/failure-log.md` | **Always, first.** Mistakes of judgement — what the eye catches. |
| `references/toolchain-traps.md` | **Before writing any composition code.** Mistakes of execution — what the eye does not catch, because the preview looks right and the file is wrong. |

A rule without its scar gets rationalized away.

### The rest of the shelf

| File | When |
|---|---|
| `references/delegation.md` | Before calling anything upstream — what we route to, and what we must never absorb |
| `references/formats.md` | Any deliverable in more than one aspect ratio |
| `references/verification.md` | Before Phase Verify; when a check fails |
| `references/production-rules.md` | Before writing the script; before building |
| `references/narrative.md` | While writing copy |
| `references/unattended.md` | **Before any batch the user will not watch** |
| `references/whiteboard.md` | Hand-drawn / draw-on technique, inside any route |

Every reference also exists as `<name>.ar.md` — the Arabic original the productions were run
in. The English file is the one to read; the Arabic is kept because it is the wording the
corrections were actually given in.

### Scripts

| Script | Does |
|---|---|
| `doctor.mjs` | what the machine has, what is missing, what each thing costs — run it first |
| `manifest.mjs` | measures a composition → `layout.json` |
| `verify.mjs` | the external verifier — fails the build |
| `delivery_qc.mjs` | the file against a platform spec (`--list` for the catalog) |
| `normalize.sh` | loudness + a true-peak ceiling that survives the encode |
| `cutdown.mjs` | cutdowns from marked segments |
| `shot.mjs` | still frames from a composition, without a full render |
| `budget.mjs` · `shoot_plan.mjs` | quote · shot list, schedule, call sheet |
| `cue_sheet.mjs` | cue sheet + licence audit from a media ledger |
| `localize.mjs` | translatable strings, and what translation did to their length |
| `timeline_export.mjs` | EDL / OTIO for a human post house |
| `batch_report.mjs` | one table from a directory of verifier reports |

## Routing

Read the matching route, then follow it. Each route says which `/hyperframes` workflow it delegates
to and what this layer adds on top.

| Request | Route |
|---|---|
| A repo, site or product → short shareable launch video | `routes/launch-video.md` |
| One product area explained, as one of a consistent series | `routes/section-series.md` |
| A brand film, manifesto, or anthem piece | `routes/brand-film.md` |
| Cutdowns, aspect variants, or platform versions of something that exists | `routes/versions.md` |
| A localized or dubbed version | `routes/localization.md` |
| A project that needs a camera, a crew, or a quote | `routes/camera-project.md` |
| A video already rendered, to be reviewed or diagnosed | `routes/audit.md` |
| Anything else | Delegate straight to `/hyperframes`, then apply § Verify below |

## The spine every route shares

```
brief → plan → build → VERIFY → deliver
                         ↑
              this skill's whole reason to exist
```

### 1. Brief

`/hyperframes` already runs a full intent interview and writes `BRIEF.md`. **Use it, don't rebuild
it.** This layer adds only what a production house needs beyond a creative brief:

- `scripts/budget.mjs` — a quote from a rate card (`assets/rate-card.template.json`)
- `scripts/shoot_plan.mjs` — shot list, schedule, call sheet, when a camera is involved

### 2. Brand contract

Copy `assets/brand-config-template.md`, fill it **from the brand's official guide**, and save it as
`brand-config.md` plus a machine-readable `brand.json`.

**The guide always wins. Never sample colors from a reference video or an image** — compression
shifts every value. In the source production all five extracted colors were wrong.

No brand guide → say so plainly and ask for one before proposing colors or type.

### 3. Formats, before layout

A video that will ship in more than one aspect ratio is **designed per ratio, never cropped**.
Decide the ratios at brief time and build on the format contract in `references/formats.md` —
one timeline, one geometry table per ratio, one generator. Retro-fitting a second ratio costs more
than building both.

### 4. Build

Delegate to `/hyperframes`. The one thing this layer requires of the composition:

> **Every element registers itself in `window.__MF`** — id, type, zone, chapter, frame range,
> `still_from`, and its flags. That declaration is half of the verification contract.
> `scripts/manifest.mjs` measures what actually rendered and writes `layout.json`.
> A disagreement between the two is a bug, not a detail.

`references/verification.md` has the manifest schema.

### 5. Verify — nothing is shown before this passes

```bash
node   <SKILL_DIR>/scripts/manifest.mjs <projectDir> <w> <h> layout.json
node <SKILL_DIR>/scripts/verify.mjs --video out.mp4 --manifest layout.json \
       --config brand.json --structure structure.json --json report.json
```

Then, for anything that ships to a platform:

```bash
node <SKILL_DIR>/scripts/delivery_qc.mjs --video out.mp4 --spec youtube-16x9 --json qc.json
```

Fix and re-run until both pass. **Only then** show the user.

### 6. Deliver

- `scripts/normalize.sh` — loudness to the platform target, with a true-peak ceiling that survives
  the encode. `loudnorm` alone measured −14.0 LUFS and **+3.5 dBFS true peak** — normalized and
  clipping.
- `scripts/cutdown.mjs` — 6/15/30s cutdowns and aspect variants from a marked master
- `scripts/cue_sheet.mjs` — every music and SFX asset with its licence, as a deliverable
- `scripts/timeline_export.mjs` — EDL / OTIO when a human post house takes over

### 7. Review and iterate

Present the render **with the verifier output**, and ask only about what the verifier cannot judge:
whether the story lands, whether the claim is right for the market, whether the language sounds
native.

**Every correction the user gives goes into `references/failure-log.md` with its cost.**
The log is the asset; the videos are the output.

## Unattended runs

If the user is not present — overnight batch, "just run it", "I'll check in the morning" — read
`references/unattended.md` and follow it exactly. The short version:

- Build **one pilot** and make it pass everything before any other video starts. Budget: **8 fix
  cycles.** Exceeding it means the template is wrong, not the video.
- After the pilot, one failing video does not stop the batch. **Three consecutive failures on the
  same check do** — that is a template defect, and it is the single most valuable signal in the
  protocol. It caught one in a real run at video six of eighteen.
- Never guess at a fix that changes **meaning** rather than **execution**. Ordering an element is
  execution. Rewording a line is meaning. Stop and ask.
- Write `run-log.md` as you go, and present nothing — the user decides what ships.

## What this cannot do

Be honest about it.

- **Roughly 40% of video types need a camera and a crew.** This layer plans and budgets them and
  edits the result; it does not shoot them. Promising "fully automated video production" for those
  types is misleading.
- **Five kinds of correction were never encodable** — they are market and positioning judgements:
  choosing the claim, choosing language a customer would actually type, knowing which friction
  matters in a market, knowing which feature is not a differentiator, choosing category vocabulary.
  This skill's job is to make those the **only** thing the user has to review, instead of burying
  them under craft errors.
- **A video that passes every check can still be a weak video.** Verification prevents failure. It
  does not create success.

## Hard stops

Stop and ask rather than guessing:

- No brand guide available
- The brief carries more than one claim and you cannot tell which to cut
- A required number conflicts between two sources
- Demo or seed data contains names that reference third-party intellectual property
- **A fix would require writing to production data** — clean the video at capture time instead
- The verifier fails on a check you do not understand

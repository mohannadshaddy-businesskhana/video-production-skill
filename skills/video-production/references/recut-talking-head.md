# Re-editing raw talking-head takes — the playbook

> Distilled from one production (Oct 2026): ~30 phone + wireless-mic takes, 11 edited into
> social videos (0:53–2:18), two review rounds with the presenter. Every rule below cost a render,
> a review note, or both. The failure-log entries cited carry the full story.
>
> Scripts: `scripts/holes.mjs`, `scripts/repair_holes.mjs`, and `scripts/recut/*` (one folder, run
> from the project root, `KEYS=<.env with GROQ_API_KEY and GEMINI_API_KEY>`).

**What this route is:** the raw take is one continuous recording with false starts, restarts,
stumbles, pauses, glances away and — with a wireless mic — lost audio. The deliverable is a short
vertical video: cut clean, captioned, with picture-graphics, ending on a look into the lens.

---

## 0. Before anything: triage the audio (#56)

A Lark/Hollyland-class receiver drops packets: the phone timestamps them and records nothing —
~270 ms holes, inside words. That is lost audio, not noise; no denoiser brings it back.

```bash
node scripts/holes.mjs --dir raw/            # one table: clean · light · medium · heavy
```

- **heavy (≥12% of speech lost): reshoot.** Say so before promising anything.
- **light / medium:** `repair_holes.mjs` cuts each hole from picture *and* sound on the same frames
  (30 fps CFR) — a jump cut instead of a stutter. The presenter accepted that "to rescue a video".
- A shoot that will use the mic again: run a mic test first (`routes/camera-project.md`).

## 1. Prep — words and a clock

```bash
bash scripts/recut/prep.sh raw/<take>.mp4 <name>
```

- **Words from Gemini, time from Groq Whisper.** Whisper writes Egyptian Arabic as MSA and invents
  ("اشترك في القناة", subtitle credits) (#57); Gemini hears the dialect but its timestamps drift and
  even run backwards on long requests. So: Gemini text in **25 s pieces cut at the quietest point**,
  Groq word times in **15 s self-checking pieces** (re-split when sparse or when an invented outro
  appears), then `align_words.mjs`.
- **Whisper can return your prompt as the transcript** — a run of words ≤50 ms long. Ask again
  without the prompt (#63; `groq_words.mjs` does).
- Gemini free tier ≈ 20 requests/model/day, ~5 models, **resets 07:00 UTC**. A 7-minute take is ~17
  requests. Budget it; re-mapping (below) costs nothing.

## 2. The edit decision — `edit.json`

Read the transcript and decide, per take, by meaning:

| Keep | Cut |
|---|---|
| the **last complete** version of a restated sentence (#66.5) | false starts, abandoned takes, the first of two versions |
| the clean closing line | stalls, "يعني إيه؟" fillers that holes made garbled |
| one topic per video | the part of a long take that starts another video (#77) |

- **Place every edge by loudness, not by transcript time.** Print 25–50 ms RMS around the edge and cut
  in the dip. `plan_cuts.mjs` snaps edges to the quietest 10 ms within ±0.15 s; when the quiet nearby
  is *inside* a word, place it by ear and mark `"exact": true` (#66.6).
- Pauses are measured from the audio (`max_pause` 0.45 s, `keep_pause` 0.15 s). A creak or a breath is
  louder than the pause threshold and survives — look at those stretches (§5).
- The head is moved to the first sound minus 60 ms: **no silence at the start** (#66.2).
- A reviewer's timestamp is on the cut; `to_raw.mjs <work> <seconds>` maps it back to the raw take.

## 3. Cut, then check every joint

```bash
bash scripts/recut/cut.sh <name>
node scripts/recut/joint_check.mjs work/<name>/aroll16k.mp3 work/<name>/joints.json
node scripts/recut/clipcheck.mjs work/<name>/aroll16k.mp3 <a>:<b> --key-file $KEYS   # each flagged joint
```

- `joint_check` flags a joint whose 40 ms either side is speech-loud. It flags tight-but-fine joints
  too — **listen** to each flagged one (Gemini marks partial syllables with "-"; Groq is the fallback
  when Gemini's quota is out). Fragments like "...وقع" from "الموقع" were audible at four joints of one
  video before this check existed.
- Cutting can lose words from the captions: `remap_transcript.mjs` drops words whose raw times fall in
  or outside a removed range, even when the audio kept them ("إزاي", "لأن دراسة", "هتحققه"). After any
  re-cut that removed or added words, **re-transcribe the cut audio** (`retranscribe.sh`) instead of
  re-mapping, then:
  - `fill_collapsed.mjs` — words the aligner stacked on one instant;
  - `groq_retime.mjs` — sentences that overlap each other: every word takes Whisper's time where it
    heard it, the rest are spread;
  - `caption_check.mjs` — each sentence against what Groq heard (a 0% match on a clean stretch is
    Groq paraphrasing; on a damaged stretch it is a misplaced sentence).
  - **Gemini can invent a whole sentence at a joint** ("Customer Lifetime Value") — any sentence you
    don't remember the presenter saying gets checked against Groq and the loudness.

## 4. When the audio cannot be saved — the rescue ladder

Lost syllables are gone. In order of preference (#75):

1. **Cut the damaged phrase** if the sentence still means the same without it.
2. **Cut the whole sentence** if the talk holds without it — a half-understood sentence is worse
   than a missing one (#66.3).
3. **Drop a whole list item** when its answer is the damaged part (a KPI talk went from six cases to
   five) — and renumber.
4. **Name it on screen** when the spoken name of a step is lost ("التخطيط المهني" as a label).
5. **Cold open:** a damaged hook with no clean retake → open with the take's clean closing line
   (`prepend.mjs`).
6. **Borrow from another take of the same talk** — a missing close came from an earlier take
   recorded minutes before on the same set (`append.mjs`).
7. Only then: keep it, and list it for the presenter as an open decision.

A wrong word that the presenter said (a product name) is corrected **by cutting the word** when the
sentence stays true without it — not by writing over the mouth (#76).

## 5. The eyes — start, between points, end

- **End on a look into the lens**, chosen frame by frame **on the cut** (#61, #65): tile the last
  1.5–2.5 s at 10–15 fps on the eyes, and end two frames before the gaze or head moves. The cut can
  carry frames past the last word (an empty chair) — the raw take says nothing about that.
- **No look away anywhere** (#66.1): `pause_sheet.mjs` tiles every speech-free stretch the cut kept;
  a glance to the side with a noise between two points must go. Blinks and thinking glances inside
  speech are natural — the target is a stretch ≥0.7 s with the eyes off the lens.

## 6. The composition

- **Pictures, not sentences** (#60): each scene is drawn objects that land on the word they show,
  ≤3 words of text on screen per scene. Labels of a set carry labels on every member (#66.9).
- **Layout for a seated talking head** (#58, #66.11): face is a keep-out; pictures directly under the
  face; captions in the band below them; nothing in a fixed panel; no name badge, no end card (#59).
- **Name what is enumerated** (#66.8): the name of each item stays on screen for its whole stretch.
- **Captions:** ≤8 words a line, merge ≤10 words **and ≤60 letters** (Arabic words are long; 62 letters
  wrapped to a third line onto the face, #64); the last line is measured against the film's end, not
  its last word.
- **Grade** is a per-shoot setting, measured on a frame (blue light saturation, face highlights), and
  baked into the staged A-roll — not a per-video tweak (#66.10).
- After every re-cut, scene references move: `retime_spec.mjs` (by word matching) or `snap_refs.mjs`
  (by nearest time), then `spec_refs.mjs` must report every reference resolving. Scenes whose words
  were cut are rewritten by hand.

## 7. Before and after the render

```bash
bash scripts/recut/precheck.sh <name>     # build + manifest + reading time + caption height
bash tools/render.sh <name>               # render → encode → normalise → verify → QC → preview
```

**Never render without the pre-check** — six of eight renders failed on reading time when it was
skipped (20 minutes each). Then read verify + QC; Reels caps at 90 s, so longer cuts are checked
against Shorts.

## 8. Delivery and review

- Deliver **all at once**, numbered, in one folder, with a notes file in the presenter's language:
  what changed per video, and only the decisions a person must make (#79).
- Each review note becomes a rule — in this log, and as code where it can be measured.
- Approved videos go to the client's Drive (a mounted Drive folder is the reliable path — a connector
  cannot carry a 150 MB file); confirm each upload's byte size, then move the local copy to the
  Recycle Bin and tell the person to empty it (the space is not free until then).

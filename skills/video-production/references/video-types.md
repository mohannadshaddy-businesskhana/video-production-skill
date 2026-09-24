# Video types — what makes each one that type

> Written after thirteen demos were rejected as "all the same style". They were:
> one format — a heading, abstract shapes fading in, a closing line — reskinned
> thirteen times with a different ground colour and a different decoration.
> A video type is not a colour. It is a **production grammar**: what carries the
> information, what the camera does, whether a voice leads, and how the edit
> breathes. Change the skin and keep the grammar, and you have made one video
> thirteen times.

## The four axes that actually separate types

| Axis | The question |
|---|---|
| **Carrier** | What is the main thing on screen? A hand, a face, an interface, footage, an illustration, pure type? |
| **Camera** | Static · follows an action · cuts · one continuous flowing move? |
| **Voice** | Does narration lead and the picture follow, or music, or neither? |
| **Edit rhythm** | Continuous reveal · hard cuts on a beat · slow holds · fast cuts? |

Two videos that answer all four the same way are the same type, whatever colour
they are.

## The grammar of each type

| Type | Carrier | Camera | Voice | Rhythm | The defining element — without it, it is not this type |
|---|---|---|---|---|---|
| **Whiteboard** | **a hand holding a marker** | static board, occasional push-in | **narration drives the drawing** | continuous reveal, stroke by stroke | the hand, and the voice it draws to |
| **Product tour** | **a real interface**, driven by a cursor | **follows the cursor** — scroll, push in, pull out | often narration; music + captions works | continuous journey, holds to read | a cursor moving through the product for the **whole** running time |
| **Talking head** | **a person** on camera | static, punch-ins | the person speaks | cut on sentences | a face. Cards over it are the packaging, not the video |
| **Captions-led** | a speaker or VO | follows the speaker | **speech** | captions lighting word by word | speech to caption. Captions of nothing are a lie |
| **Music video** | full-bleed imagery | **hard cuts** | music only | **a cut on every beat** | the edit is the rhythm. Pulsing shapes over a still frame is not this |
| **Motion graphics** | shape and type | **one continuous move** — morphs, match cuts | optional | no fades, no cuts: everything becomes the next thing | continuity. A sequence of faded-in cards is a slideshow |
| **Launch** | the product, fast | fast cuts, whips, speed ramps | often none | fast, hits on SFX | energy from the edit, not from a big number |
| **Brand film** | imagery, one line at a time | slow, cinematic | often narration | long holds | atmosphere. One claim, said slowly |
| **Explainer** | illustrated scenes | scene changes | narration | scene per idea | illustration + a voice explaining it |

## Operations are not types

Four things in any list of "video types" are **operations on a video that
already exists**, and they must be demonstrated on one:

| Operation | The honest demonstration |
|---|---|
| Aspect versions | the **same** video in 9:16, 1:1 and 16:9, side by side — designed per ratio |
| Cutdowns | the **same** video at 30, 15 and 6 seconds, each with its own hook and close |
| Localization | the **same** video in two languages, with the re-layout the translation forced |
| Series | three **episodes** of one template, back to back |

Inventing a visual style for an operation is how a set of demos starts to look
fake: the viewer has nothing real to compare.

## What needs something this skill cannot draw

Be honest about these before promising them:

| Needs | For | Where it comes from |
|---|---|---|
| **A voice** | whiteboard, explainer, captions-led, talking head, most brand films | the client's own recording (`voice_timings.mjs`), or a TTS engine that speaks the language — Gemini TTS speaks Egyptian Arabic on the API's free tier (`tts_gemini.mjs`); HeyGen's API has been paid-only since Feb 2026. The local engine has **no Arabic** |
| **A person** | talking head | client footage, or an avatar service |
| **Footage or photography** | brand film, launch, music video at their best | the client's library, or licensed stock |

A composition can fake an interface convincingly — it is HTML. It cannot fake a
face or a voice without it being obvious, and a demo that does is worse than one
that says what it needs.

**Whichever voice, measure it line by line.** Neither a TTS model nor a phone
gives word timings, and a whiteboard hand or a caption has to know when each
thing is said. There are two ways to get each line's exact start and end:

- **A take per line.**
- **One take with a clear pause between lines.** `voice_timings.mjs` aligns it
  to the script. It already knows the text, so it picks the pauses that cut the
  take into pieces the lines' lengths predict.

Gemini's free tier allows about ten TTS requests a day per project, so
`tts_gemini.mjs --whole` asks for every line in one request.

Both tools write the same `timings.json`, and the composition's beats come from
it. The voice sets the timing, never an estimate.

# Failure log

> Every mistake here actually happened in a real production, and every one cost a full render round.
> **Read this file in full before any work.** A rule without its reason gets rationalised away and
> violated again.
>
> **When the user corrects something new — add it here with its cost.** The log is the asset; the
> videos are the output.

## Index

| # | The mistake | Category |
|---|---|---|
| 01 | Sampling colours from video pixels | Brand |
| 02 | Adding visual elements that are not in the guide | Brand |
| 03 | Diagnosing a "fault" that was not one, and prescribing a violation | Brand |
| 04 | Guessing at fonts | Brand |
| 05 | Using an old number from the guide's cover | Data |
| 06 | A claim about a number the viewer does not believe | Message |
| 07 | Seven claims in one video | Narrative |
| 08 | Never naming the category or the audience | Narrative |
| 09 | Captions instead of a story | Language |
| 10 | Signage language — clipped noun phrases | Language |
| 11 | An efficiency claim instead of an elimination claim | Message |
| 12 | A defensive feature answering an objection nobody raised | Message |
| 13 | An imitated interface instead of the product's real one | Interface |
| 14 | An onboarding bar visible in a product shot | Interface |
| 15 | Screen-recording artefacts in a capture | Interface |
| 16 | A black redaction rectangle in promotional material | Interface |
| 17 | Demo data containing third-party intellectual property | Legal |
| 18 | Text below the frame line — the mobile interface zone | Layout |
| 19 | A composition stuck to one side | Layout |
| 20 | Text overlapping information | Layout |
| 21 | More empty space than content | Layout |
| 22 | Almost no contrast on the dark ground | Layout |
| 23 | No logo in the promise scenes | Brand |
| 24 | A shape contradicting the caption above it | Design |
| 25 | Audio 11 dB quieter than the standard | Audio |
| 26 | Cutting the music to zero | Audio |
| 27 | Stopping the track and returning off the rhythmic grid | Audio |
| 28 | Two large motions at once — a "glitch" | Motion |
| 29 | A small moving element pulling the eye off large still text | Motion |
| 30 | Fast replacement — half of two items in every frame | Motion |
| 31 | Text visible for under a second | Motion |
| 32 | An exponential counter curve that jumps | Motion |
| 33 | A decorative transition that reads as digital corruption | Motion |
| 34 | A one-second CTA with the lowest contrast in frame | Conversion |
| 35 | A truncated render file handed over for review | Production |
| 36 | Six outputs before one was approved | Production |
| 37 | Proposing an alternative stack when the team had a working one | Process |
| 38 | A correction that was specified and implemented backwards | Design |
| 39 | Text in another language inside a monolingual video | Language |
| 40 | Re-layout at the block level instead of the design level | Layout |
| 41 | The limits of automated audio checking | Process |

---

## Brand

### 01 · Sampling colours from video pixels

**What happened:** I extracted the palette from frames of a reference video.
**Result:** **all five values were wrong.** JPEG compression shifts every one.
**Cost:** a full round, plus every asset produced with the wrong values.
**Rule:** colours come from the brand guide only. **Never sample a colour from an image or a
video** — not even as a temporary estimate.

### 02 · Adding visual elements that are not in the guide

**What happened:** I invented a "ghost number" (a huge numeral at 6% opacity behind the content) to
give "depth and rhythm". Removed. Replaced it with a mosaic strip. Removed. Then a progress bar.
Removed.
**Result:** three rounds on three elements, all decoration.
**Rule:** **no visual element that is not in the brand guide.** If the frame feels empty, the problem
is distribution, not a shortage of elements.

### 03 · Diagnosing a "fault" that was not one

**What happened:** I saw a black logo on a black background and assumed it was a problem. I wrote a
rule: "the logo always sits on a light plate."
**Result:** the logo **has a white frame as part of it**, and the placement was correct. The rule I
wrote was an **explicit violation** of the guide ("do not place the coloured logo on a coloured
ground").
**Rule:** before diagnosing a fault in an existing asset — **read the guide first**. What looks wrong
may be the specification.

### 04 · Guessing at fonts

**What happened:** I wrote "read the config, and fall back to a reasonable font."
**Result:** the guide named three fonts explicitly and said "do not substitute and do not add a
fourth."
**Rule:** fonts come from the guide by name. No fallback, no judgement call.

### 23 · No logo in the promise scenes

**What happened:** the feature scenes were headlines on a black ground with no mark at all.
**Result:** the viewer sees promises without knowing who is promising. And nobody watches a video
from the beginning every time.
**Rule:** after the turn, **the logo is fixed in frame** in every summary or promise scene.

---

## Data and message

### 05 · Using an old number from the guide's cover

**What happened:** the brand guide's cover said "10 sections". The product's code had 21.
**Result:** the interface built for the video shipped with 10 sidebar items.
**Rule:** **the guide governs design · the product's code governs numbers.** State the source for
each kind of data explicitly.

### 06 · A claim about a number the viewer does not believe

**What happened:** "replaces 22 tools" — and the product genuinely replaces 22.
**Result:** no customer uses 22 tools. The viewer says *I don't*, and loses belief in everything
else.
**Rule:** distinguish **the viewer's reality** from **the product's capacity**. The claim is always
about the product, never about the viewer.

> ✅ "22 sections, each replacing a tool" · ❌ "You use 22 tools"

### 11 · An efficiency claim instead of an elimination claim

**What happened:** the video said "the reply arrives in 9 seconds instead of two hours."
**Result:** that is an efficiency gain — **and every competitor promises it**. The real claim was
"the client no longer needs to ask at all."
**Rule:** ask: **does this claim eliminate the situation, or speed it up?** Elimination is stronger
and harder to imitate.
**Note:** this came from the user, not from analysis. **That is the kind of judgement that needs a
human.**

### 12 · A defensive feature answering an objection nobody raised

**What happened:** a whole scene about "this product is original, not a translation."
**Result:** it plants a doubt that was not there. Removed entirely.
**Rule:** every feature must answer a **real** objection. If nobody is asking, cut it.

### 17 · Demo data containing third-party intellectual property

**What happened:** the demo account was named after a film, and its seed data carried character
names from the same film.
**Result:** a genuine legal risk to the company if the video shipped. And the video read the names
straight from the database, so it could not be fixed in the video.
**Rule:** **check demo data before any render.** Every person's name and every client name must be
original. If you find a reference to someone else's IP — **stop and ask.**

> **Update from a later production:** the fix cannot always be "correct the database". In that case
> the demo organisation was live on production and was what prospects saw. The answer that worked:
> **swap the names at capture time on the DOM**, leave the database untouched, and make the capture
> **fail loudly** if any risky token survives. Never write to production data to improve a shot.

---

## Narrative and language

### 07 · Seven claims in one video

**What happened:** the video said: your data is scattered · 22 tools · the sections are connected ·
a client portal · numbers · it is original · subscribe.
**Result:** no causal link between any two of them. The user's words: "the story isn't clear and
doesn't hold together."
**Rule:** **one claim per video.** If the outline has more than one, cut until one remains.

### 08 · Never naming the category or the audience

**What happened:** the category word ("marketing agency") appeared **nowhere in the entire video**.
**Result:** at second 3 the viewer does not know who this is for or what it sells.
**Rule:** **the category and the protagonist are named before second six.** The category word is
said explicitly.

### 09 · Captions instead of a story

**What happened:** every line described what was on screen: "content links to the client
automatically."
**Result:** in a video with no voiceover, the text **is** the story — and captions do not tell one.
**Rule:** the text says something **that is not on the screen**. If the text describes the picture,
one of them is redundant.

### 10 · Signage language — clipped noun phrases

**What happened:** "One click — a customer with full data. 18 tabs."
**Result:** the user's words: "the phrasing isn't Arabic, it reads like translated English."
**Cause:** noun phrases strung together with full stops — that is English syntax.
**Rule:** **connected sentences with connecting words.** And a two-level system:

> **Dialogue inside the interface** (messages, comments) = the way people actually write, in the
> dialect
> **Narration** = spoken register, sentences joined with *and / so / but / because*

**Exception:** the slogan and headline blocks — one phrase split across two blocks, not two
sentences.

---

## Interface

### 13 · An imitated interface instead of the product's real one

**What happened:** the video showed a "client page" built by approximation: a 10-item sidebar, four
cards, and 60% of the frame empty.
**Result:** the narration said "18 tabs" and there was **not a single tab on screen**. The claim
refuted itself visually.
**Rule:** **the interface comes from the product's actual components.** And a checkable acceptance
condition: **count the sidebar items in the render — they must match the config file in the code.**

### 14 · An onboarding bar visible in a product shot

**What happened:** the dashboard capture had a "welcome" bar with a progress indicator.
**Result:** the product's first appearance in the video says "an empty new account."
**Rule:** no onboarding, no empty state, no loading spinner in any capture. Prepare an account with
real data before capturing.

### 15 · Screen-recording artefacts in a capture

**What happened:** a recording-timer widget was visible in the sidebar for 6 seconds.
**Rule:** check every interface capture for elements that are not part of the product.

### 16 · A black redaction rectangle in promotional material

**What happened:** a client name covered with a black rectangle.
**Result:** it reads as a leaked screenshot.
**Rule:** demo data with full, visible names. **Redaction is not a solution in promotional
material.**

---

## Layout

### 18 · Text below the frame line

**What happened:** the narrative text sat 29 pixels from the bottom edge of the frame.
**Result:** on mobile it tangles with the caption, the account name, and the like and share buttons.
**Rule:** **every piece of text and every essential element between 12% and 72% of frame height.**
The bottom 28% belongs to the platform's interface.

### 19 · A composition stuck to one side

**What happened:** all content lived between `x=752` and `x=1776` of 1920.
**Result:** a centre crop to 9:16 would have erased every English string. The video was unusable on
any vertical platform.
**Rule:** **never crop to produce another ratio — re-lay it out.** The same components in a
different arrangement.

### 20 · Text overlapping information

**Happened twice.** The first time the block covered the message's timestamp. The second time the
sentence overlapped three layers (counter + receipt + interface) and **not one word was legible**.
**Why it recurred:** the rule was written as "no overlapping" — prose.
**Rule:** **zones defined by coordinates per chapter, and a zone guard component that refuses to
draw outside its zone.** The prose rule was violated twice; the code rule cannot be.

### 21 · More empty space than content

**What happened:** a feature frame whose content was **under 10%** of the frame.
**Why:** the two elements (headline + shape) were piled in the centre.
**Rule:** **the content bbox is ≥ 45% of the frame**, sampled in **every chapter**, not once.
**The answer is distribution, not enlargement.**

### 22 · Almost no contrast

**What happened:** 22 dark grey squares on a black ground.
**Rule:** any geometric element on a dark ground: **fill ≥ 20% · border ≥ 70%**. And grey is made
with the opacity of a palette colour, not with a new colour.

### 24 · A shape contradicting the caption above it

**What happened:** the caption said "everything is connected" and the drawing was a **vertical
chain**: `A → B → C → D`.
**Result:** a chain says "sequential steps" — the opposite of the meaning.
**Rule:** **before drawing any shape ask: what does this shape say on its own, without the
caption?** If the answer is not the caption, the shape is wrong.

| Meaning | The shape | Not the shape |
|---|---|---|
| Connected | a mesh — every node to every node | a linear chain |
| Sequential | an ordered chain | a mesh |
| Consolidated | elements converging into one | a tidy row |
| Distributed | one element splitting | a stack |

---

## Audio

### 25 · Audio 11 dB quieter than the standard

**What happened:** the render came out at −24.8 LUFS. Platforms normalise at −14.
**Result:** on a phone at normal volume the video is almost muted in the feed.
**Rule:** `ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=11` on every output. **Verify with `ebur128`.**

### 26 · Cutting the music to zero

**What happened:** a spec said "8 frames of silence" at the turn.
**Result:** a complete 0.4-second cut-out. In a video **with no voiceover**, total silence reads as
**a technical fault**, not as intentional silence.
**Rule:** never absolute zero. Duck to −30 dB at most.

### 27 · Stopping the track and returning off the rhythmic grid

**What happened:** after fixing 26, `silencedetect` came back empty — **and it still read as a
fault.**
**The cause, measured:** the track itself was stopping and leaving a reverb tail. The tempo was
110 BPM (a 0.546s pulse) and the gap was 0.32s = **0.59 of a pulse**. The music came back **half a
beat late** — the worst possible offset.
**Rule:** **the music track does not stop from the first frame to the last. Gain automation only,
over a continuous track.** Then the rhythmic grid never breaks, however long the duck.
**Note:** `silencedetect` **passes straight over this mistake.** The correct check is pulse
regularity in the spectrum.
**Also:** the audio hit was full-spectrum up to 46 kHz — that is a click, not a hit. **Low-pass at
12 kHz.**

---

## Motion

### 28 · Two large motions at once

**What happened:** tiles sucking toward the centre at the same moment headlines were entering.
**Result:** the user's words: "it looks like the video is glitching."
**Rule:** **one large motion at a time.** The first finishes before the second.

### 29 · A small moving element pulling the eye off large still text

**What happened:** a typing cursor (the smallest element in frame, bottom right) plus still
narrative text (large, top left).
**Result:** the text **was not read at all**.
**Rule:** **motion beats position, size and colour.** If something in frame is moving, no new text
appears. If new text appears, the frame is still for ≥1.5s.
**The answer is not bigger text — it is temporal separation.**

### 30 · Fast replacement — half of two items in every frame

**What happened:** 20 screens passing in a continuous slide, 0.4 seconds each.
**Result:** most frames show **half of two screens at the seam**. Nothing is ever complete in front
of the viewer.
**Rule:** in enumerating scenes, **items accumulate and stay** rather than replacing each other. And
accumulation adds momentum — the list grows in front of the viewer.
If replacement is unavoidable: **a hard cut, not a continuous slide.**

### 31 · Text visible for under a second

**What happened:** the last two rows of a list appeared for under 0.5 seconds.
**Rule:** **≥ 1.5 seconds of complete stillness after the element's motion ends** — not counting the
motion.
**One exception:** visual texture not meant to be read (small low-opacity tags). If used, it is
**written in explicitly as an exception with its reason.**

### 32 · An exponential counter curve that jumps

**What happened:** a counter with steep exponential acceleration accumulated **more than half its
value in the last two seconds**.
**Rule:** `value = total × t^1.4`. The exponent 1.4 gives perceptible acceleration without a jump.
**Define 5 checkpoints by frame in the spec.**

### 33 · A decorative transition that reads as digital corruption

**What happened:** a "mosaic wipe" — 40px squares wiping the frame. At 1920 that is ~1300 squares
flickering across 8 frames, and it ran after a cut to black.
**Result:** black → flickering coloured chequerboard → black. It reads as video corruption.
**Rule:** permitted transitions: **cut · block slide · shape transformation.** Any transition where
dozens of elements change in under 10 frames will read as a glitch.

---

## Conversion and production

### 34 · A one-second CTA with the lowest contrast in frame

**What happened:** the video ended with a logo and a pale grey domain for about 1 second.
**Result:** 20 seconds of work wasted. The domain is the only element that converts, and it had the
least contrast in frame.
**Rule:** **CTA ≥ 3.5 seconds of complete stillness.** The link is the highest contrast after the
action button. The music does not start its fade until the card has settled.

### 35 · A truncated render file handed over for review

**What happened:** the last 5 seconds would not decode.
**Rule:** `ffmpeg -v error -i out.mp4 -f null -` **must produce empty output** before the file is
shown to anyone.

### 36 · Six outputs before one was approved

**Rule:** **one ratio, silent, and stop.** Produce the rest after approval.

### 37 · Proposing an alternative stack when the team had a working one

**What happened:** I proposed a particular rendering framework when the team already had a tested,
working stack.
**Result:** time lost evaluating an alternative nobody asked for, and a licence warning that was
irrelevant.
**Rule:** **ask what stack exists before proposing one.** And state the **requirements** it has to
meet rather than naming a tool.

---

## From a later review

### 38 · A correction that was specified and implemented backwards

**What happened:** the spec said "4 nodes all connected to each other with 6 lines", correcting a
wrong vertical chain.
**Result:** the render produced **4 squares in a 2×2 grid with no lines at all**. Worse than the
original — at least the chain said "sequence"; now the picture says "four separate things" under a
caption reading "everything is connected".
**Rule:** a visual correction must be checked **visually** after the render. A textual description of
a shape is not enough — pull the frame and look.
**A practical check:** for any shape claiming a relation — **count the lines.** 4 connected nodes = 6
lines. Zero lines means the shape refutes its own caption.

### 39 · Text in another language inside a monolingual video

**What happened:** "11 external integrations" and "18 Sep" in an entirely Arabic video.
**Result:** it breaks the consistency and makes the piece look like a half-translated template.
**Rule:** **all interface text in the video's language.** The only exception is brand names (Slack ·
Notion). Dates, described numbers and labels **are translated.**

### 40 · Re-layout at the block level instead of the design level

**What happened:** the 9:16 version was made by rearranging the blocks (not cropping — that part was
right), **but** the content stayed in a horizontal band in the middle of the frame with 40–50% of
the height empty above and below.
**Result:** the vertical format was wasted. On a phone the video looks like a small strip in the
middle.
**Rule:** re-layout is not moving elements — it is **redesigning the composition**. In 9:16 the
content extends **vertically** (blocks stacked, larger text, an interface that fills the width). The
coverage check must run **on each ratio separately.**

### 41 · The limits of automated audio checking

**What happened:** the verifier measured pulse phase drift globally and failed on it.
**Result:** a false positive — the music track changes section (a build or a breakdown) and the
phase shifts with no fault at all.
**Rule:** **phase analysis alone cannot distinguish a musical section change from a stopped track.**
The measurable signal is a **level dropout**. Phase became a warning with its timestamp for human
review, and the failure fires on the dropout only.
**The broader lesson:** when the verifier produces a false positive, **fix the verifier
immediately.** A checker that cries wolf gets ignored, and then it is worth nothing at all.

---

## Recurring patterns — read these if you have no time for the whole log

1. **What is written as prose gets violated.** Four rules were written clearly and violated in the
   very next render. If a rule is measurable, **write it as code.**
2. **Every element I added on my own initiative was removed.** The ghost number, the mosaic, the
   progress bar. All three were solutions to "the frame feels empty" — and the real problem was
   distribution.
3. **Motion beats everything.** The largest text in frame is not read if a small indicator is
   blinking in a corner.
4. **Measurement beats impression.** "Something's wrong with the audio" became fixable once the
   offset was measured at 0.59 of a beat at 110 BPM.
5. **Strategic mistakes cost more than technical ones.** The claim error (#11) cost a full chapter
   rewrite; every brand error combined cost one round.

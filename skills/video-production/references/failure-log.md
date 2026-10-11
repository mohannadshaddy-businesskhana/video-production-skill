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
| 42 | Selling what the tool does instead of what the viewer gets | Message |
| 43 | A script written for someone who watched it being built | Narrative |
| 44 | Thirteen skins on one format | Form |
| 45 | Words with two readings, and borrowed English | Language |
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
| 46 | A check that graded its own resampling | Process |
| 56 | "A sound problem" that was missing sound | Audio |
| 57 | Whisper on Egyptian Arabic: invented words, rewritten dialect | Language |
| 58 | A fixed graphics panel over a presenter's chin | Layout |
| 59 | A follow CTA on a video that posts to two accounts | Conversion |
| 60 | Written summaries over a captioned talk, and a badge that never leaves | Form |
| 61 | The last frame caught the presenter looking away | Edit |
| 62 | The transcript had a sentence the audio did not | Language |
| 63 | Whisper returned its own prompt as the transcript | Language |
| 64 | A third caption line came down onto the face | Layout |
| 65 | The cut ended on an empty chair | Edit |
| 66 | Review 1 of a ten-video batch — the rules it produced | Process |
| 67 | A hook that was a sentence on an empty page | Hook |
| 68 | An Arabic voice that "doesn't know Arabic": undiacritized text | Voice |
| 69 | A free voice endpoint that closed overnight | Voice |
| 70 | Gemini TTS on the free tier: five facts that cost a day | Voice |
| 71 | A batch split across models, and one voice per video | Voice |
| 72 | One broken voice line blanked a whole film | Voice |
| 73 | Breath and hiss between the sentences | Voice |
| 74 | Real book covers instead of drawn placeholders | Brand |

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

### 42 · Selling what the tool does instead of what the viewer gets

**What happened:** a brand film for this very skill was built on the line "it knows how to refuse
the video." Four cards, all about the tool's internal behaviour: it measures, it compares, it
refuses, it does not deliver.
**Result:** the user's words — "weak as marketing." Nobody buys a tool because it refuses things.
Refusing is the mechanism; it is not the reason anyone would want it. The film had no person in it,
no moment, and nothing at stake.
**Rule:** **the claim is what the viewer stops losing, not what the software starts doing.**
Write the mechanism down, then ask "so what?" until the answer is something that happens to a human
being. "It fails the build on a coverage violation" → so what → "it catches the thin frame" → so
what → **"you don't hear about the mistake from your client."** That last one is the film.

A useful test: if the sentence's subject is the product, it is a feature. If the subject is the
viewer, it is a benefit.

### 43 · A script written for someone who watched it being built

**What happened:** a demo explaining a code change opened on `feat(deps): drop Python`, then showed
`18 renders · same`, `requirements: 4 → 3`.
**Result:** the user could not follow it **at all** — and he had commissioned the work the video was
about. Compared against what? The same as what? Which requirements? Every line was true and every
line assumed the viewer had been in the room. It was a changelog for a project nobody watching had
been following.
**Rule:** **walk the chapter boundaries and write down what the viewer knows at each one.** If any
chapter needs a fact the earlier chapters did not supply, the script fails — no matter how correct
it is. A term, a number and a name each arrive *after* the thing that makes them mean something.

**The trap underneath it:** the author has just finished the work, so every reference feels obvious.
Recency is indistinguishable from clarity from the inside. This is why the check has to be
mechanical — a list of what has been established, in order — and not a feeling that it reads fine.

### 44 · Thirteen skins on one format

**What happened:** thirteen demos, each meant to show a different video type. Each got its own
ground colour and its own decoration — a burst, a grid, a table, a bar field — and every one of them
was the same thing underneath: a heading top right, abstract shapes fading in, a closing line.
**Result:** "they are all the same style — animation with text, or text with animation." The
whiteboard had no hand. The product tour had two seconds of movement. The captions video had no
speech to caption. The music video's picture never cut.
**Rule:** **a type is its production grammar — carrier, camera, voice, edit rhythm — not its
palette.** Before building a type, name its defining element from `video-types.md` and put that on
screen first. If the element needs something the skill cannot make (a voice, a face, footage), say
so and stop — do not substitute a shape for it.

### 45 · Words with two readings, and borrowed English

**What happened:** on-screen lines used «بيتسكّب» (skip, in Arabic letters), «بيتعلّم» for "is
marked" (it reads first as "learns"), «قصّة» for an edit cut (it reads first as "story"), «بتضغط»
for compresses (it reads as "presses"), and «التركيب» for a composition — a word a marketer has no
picture for.
**Result:** the reviewer stopped on the words instead of the message.
**Rule:** **the everyday reading of a word wins, every time.** If a word has a more common meaning
than the one you intend, the viewer takes the common one. Use the plain verb (بيتحدد، بيتقلّب عليه،
انتقال، بيبوّظ الجودة). No English in Arabic letters unless the audience genuinely says it that way.
`script_check.mjs` carries a lexicon of the ones already caught.

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
**It came back through the check itself.** "CHECKS PASSED", "OF 3", "CHECKED" and "SCRIPT PASSED"
shipped in four Arabic demos with the language check green. Two holes: each label was declared to
the manifest with empty text, so the check never saw it; and two demos had ordinary English words
("OF", "SOMEONE", "ELSE", "FOUND", "IT"…) listed as *brand names*, so it let them through. The
check now reads the text nodes the page actually contains (`text_nodes` in the manifest) as well as
what was declared, and a brand list holds brands. A Latin label in the video's own chrome is
translated, and set in the video's typeface: a monospace Latin font has no Arabic, and letter-spacing
breaks the joins of the letters that fall back to another face.

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

### 46 · A check that graded its own resampling

**What happened:** a music video that cuts the whole frame on every beat failed the palette at
2.5% (limit 2%). The mask put every off-palette pixel on a **vertical edge** — sprocket holes,
waveform bars, the amber strokes of the lettering — and the worst frame was one caught two frames
into a zoom hit, when every edge sits at a sub-pixel offset.
**Result:** that same frame measured **0.58% at full resolution**, and across 120 frames, every zoom
hit included, the worst was 0.74%. The check had been reading a **240-wide copy**: scaling a 4:2:0
frame rings at hard edges and slides luma against chroma, so the copy contained colours the video
does not — up to 3.5% on one frame. Redesigning the film around that would have been designing
for the instrument.
**Rule:** **measure the delivered pixels, never a resampled copy.** `verify.mjs` now reads each
sample at the video's own size. Same 12 samples, same 2% limit, same tolerance, same run time.
**What made the fix trustworthy:** a control run through the old code and the new — synthetic clips
with an off-palette patch of known size. 2.99% of the frame fails at 3.0%, 1.43% passes at 1.5%, a
clean frame reads 0.0%, and a missing file still fails loudly, under both. A fix that turns a fail
into a pass has to show it still fails what it should — otherwise it is a threshold raised by
another name.

### 47 · A check that heard every pause as a stopped track

**What happened:** the first narrated demo was a whiteboard over a soft music bed. It failed beat
continuity with a "level dropout 0.37s". There was no dropout: the bed ran from the first frame to
the last.
**The cause, measured:** a dropout meant falling under a quarter of the mix's median level. Under a
narration, the median is the voice (−21 dBFS here). Between two spoken lines the bed plays alone,
about 15 dB lower, so every pause fell under the floor. In a music-only mix the median is the music,
which is why the check had never met this case.
**Rule:** **the floor is a quarter of the track's quiet level, its 25th percentile, not a quarter of
its median.** In every music-only render the two are about 2 dB apart, and a stopped track falls far
below either.
**What made the fix trustworthy:** controls under the old code and the new.
- The clean narrated film fails under the old code and passes under the new.
- The same film with its bed cut, or ducked 20 dB, for 0.35s inside a pause fails under both.
- Two music films with the track stopped or ducked for 0.32s fail under both.
- All 21 existing renders still pass.

The other fix was raising the bed about 6 dB to clear the old floor. That would have put the music
about 9 dB under the voice instead of 15, which is mixing for the instrument again (#46).

### 48 · A free voice, and four ways it went wrong

Getting an Egyptian Arabic narration from Gemini TTS's free tier went wrong four times:

1. **The quota.** The free tier allows about ten TTS requests a day per project, so one request
   per line spent a day's quota on one eight-line narration. The fix is `tts_gemini.mjs --whole`,
   which sends every line in one request, joined by the model's own `<long pause>` tag.
2. **The response.** The docs put the audio at `output_audio`, but the live API returned it as a
   content part (`steps[].content[]` holding `{type: "audio", data}`). The tool now looks for
   either, and on a miss prints the response's shape without its payload.
3. **Cutting at the longest pauses.** A synthetic voice pauses as long at commas and dashes as it
   does between lines. A seven-word line came out a second long, and a six-word one five seconds.
   The fix is alignment rather than detection: the text is known, so `voice_timings.mjs` chooses the
   N−1 pauses that cut the take into pieces matching what the lines' letter counts predict.
4. **Levels.** Phone voice notes peak near 0 dBFS. Pushing each line to one fixed loudness
   *lowered* the quiet lines it was meant to lift, and the takes spread 6.6 dB. The fix is to match
   the lines, not maximise them: every line goes to the one level all of them can reach with peaks
   under −1.5 dBFS, and the final loudness pass lifts the whole track.

**Rule:** measure a voice, then place it. Assume nothing about it from the documentation, the
punctuation or a target number.

### 49 · Dead air: the voice paused, and so did the hand

**What happened:** the whiteboard's hand finished each drawing, then waited for the next line.
Every pause in the voice was a pause in the picture too: nothing said, nothing drawn. The four
names were also frozen for 1.6s each, to be "read in stillness", while the voice went quiet.
**Result:** the reviewer's words: there are moments with no drawing and no speech. **There must
always be something happening, and that is a general rule.**
**Rule:** **at every moment the viewer hears a word, watches something move, or is still reading
text that has not had its reading time.** A moment with none of the three is dead air.
- In a whiteboard, **a pause in the voice is where the hand is busiest.** Each line draws until
  the next begins. Its main strokes land on their words, then finishing details (a filament,
  collars, a clock's ticks) are added group by group while they fit. One hand speed is then solved
  so the drawing ends as the next line starts.
- **A word the voice says as it is written is heard, not read.** It needs its time on screen (#31),
  not a frozen frame. Only a word the voice does not say gets the still hold (#29), and that hold
  goes where the voice is still talking.
- **A spoken line takes the time the voice takes.** The script gate held beats to 0.35s a word,
  an estimate for text to read, and failed a line the voice says in 2.4s. A beat now carries
  `spoken_s`, its line's measured duration, and is held to that.
**The gate:** `verify.mjs` "no dead air", on every film. It fails a still stretch when nothing is
heard, nothing on screen changes, and no text is within its reading time.
- **The picture is measured from the render, frame against frame, not taken from declared motion.**
  A music video's cuts on the beat were never declared, and a declared move that renders as
  nothing must not count.
- **A frame counts as changed on either of two measures.** Something small moving changes a few
  pixels a lot: 20 or more pixels by more than 32 levels. Something large changing slowly changes
  many pixels a little: a mean difference of 0.01 or more.
- **The first measure was wrong.** It was the one largest pixel difference, and a dark frozen frame's
  compression noise reached 26 levels with it. A freeze read as motion, and only the control
  showed it.
- **The limit follows what leads.** Under a narration, a still frame over 0.3s fails: a pause in
  the voice read as a stall at 0.35s. Under music, it fails over 0.6s. A film that cuts on every
  beat holds each shot for one beat, about 0.55s at the beds' tempos, and that is rhythm.
- **A film shown inside another (a comparison board)** counts as activity while it is on screen.
  Its own stills are checked in its own report.
- The voice comes from clips marked `data-role="voice"`.

**Controls.**
- A 1.4s freeze put into the brand film fails (8.6–9.8s), and so does a freeze put into the
  whiteboard's breath (12.0–12.6s).
- A slow pulse passes.
- An unreadable file fails.
- A spoken word marked unspoken fails the stillness check.

**What it found.** Three films froze for about 0.7s after their last line had been read. Each got
movement that says something, never a decorative wobble:
- **The brand film:** its three frames lay their own content out.
- **The tutorial:** a check line runs down the script.
- **The motion-graphics film:** the steps chapter starts one beat earlier, and the steps pulse
  one, two, three.

All 21 renders pass.

### 50 · A number before «ناس»

**What happened:** a narration line said «الفيديو العادي بيعدّي على أربع ناس».
**Result:** the reviewer's words: it isn't correct Arabic, and it shows a misunderstanding of the
language and its grammar.
**Rule:** **«ناس» is a collective noun and takes no number.** Count with a countable noun:
«أربعة أفراد»، «أربعة أشخاص»، «أربعة موظفين». From three to ten the number takes the opposite
gender to its noun's singular (فرد → أربعة).
- Once the four are persons, «الأداة بتعمل الأربعة» says the tool does *the persons*. The line
  became «بتعمل شغل الأربعة».

`script_check.mjs`'s lexicon now fails any number before «ناس» and still passes «الناس كلها».
**Caution:** a TTS voice may still say «أربع» where the script says «أربعة». One voice did, twice.
Listen to that line.

### 51 · A split that looked sure and was wrong

**What happened:** a whole-narration TTS take was split into lines at its pauses, and
`voice_timings.mjs` reported a clear margin. Listening said otherwise: «كاتب», the first of four
names, had been cut into the end of the line before it. Doubling the model's pause tag, meant to
make the line breaks unmistakable, made its pauses erratic instead: one 5.6s silence, and a line
break shorter than a comma.
**Rule:** **only hearing a piece proves where a line starts.**
- `tts_gemini.mjs --check <dir>` has Gemini transcribe every piece. A word that moved between
  neighbouring lines fails (✗); a word that merely sounds different is flagged for a listen (✎).
- `--only l3,l4` regenerates just the lines that moved, one request each.
- The split now also reads each line's punctuation: a list of four names holds three pauses, a
  plain sentence none.
- The margin report says "margin", never "correct".
- A person's recording is never sent to a transcriber without asking them.

### 52 · The room rode along at the end of every line

**What happened:** a phone recording's lines were trimmed at a fixed −45 dB. Whatever was not
silent was kept, and in that room that meant a television or voices behind the speaker: 0.6s at
−51 dB at the end of a line, lifted 10 dB by the final loudness pass. The speaker heard it at once.
**Rule:** **cut a line down to its words, measured against its own level, not a fixed number.**
- Words are runs of at least 60ms within 24 dB of the line's loud level. The room's bursts reached
  21 dB below the voice, but never for three windows running.
- `--clean` adds a rumble cut, a mild hiss reduction and an expander that pushes the room between
  words 24 dB down.
- Measured on four lines: 3.4s of room-level audio became 2.0s, and the pauses became silence.
- What sits *under* a word stays. Separating a voice from a television behind it takes a
  source-separation model, and a quieter room is the free one.


### 53 · A whiteboard that looked like an animation

**What happened:** the whiteboard had a hand, a voice and drawings landing on their words. Its lines
were perfect geometry on a plain white page, seen from one fixed camera.
**Result:** the reviewer's words: it comes out as an animation. In a real whiteboard video the
drawing looks like marker, chalk or pencil, what it is drawn on looks like a board, and the video
often starts on one part of the board and draws until the whole board is full, ending on every
drawing side by side.
**Rule:** **a type has a medium as well as a grammar.** The grammar (#44) says what carries the
film. The medium says what it is made of, and the viewer judges the type by the medium first. For
a whiteboard that is a board with a frame and old ghosts, marker ink that wanders and goes on
unevenly, and a camera working across a board larger than the frame.
**Also:** the ink texture was first an SVG filter, and a `feTurbulence` recomputed every frame
never let the page load. It is now a small seeded tile painted once. The details are in
`whiteboard.md`.

### 54 · Film grain that made every frame a new picture

**What happened:** the brand film's cinema medium had film grain: six noise tiles, a different one
every frame, over the whole 1080×1920 frame. Every check passed.
**Result:** the file was 310 MB for 21 seconds, at 118 Mbps. The other demos are 0.5–2.2 Mbps. An
encoder can predict a frame from the one before it, but not noise, so every frame was paid for in
full at CRF 16. A platform's re-encode then smears the grain away anyway, so the cost bought
nothing the viewer would see.
**Rule:** a texture over the whole frame must not change every frame. Keep what encodes: glows,
a vignette, a few specks of dust. `verify.mjs` now fails any render above 16 Mbps.
**Also:** a texture that moves every frame hides dead air from the gate, since the measured
picture never stops changing. The film passed "no dead air" with the grain on, which proved
nothing. Prove the choreography with a control render that has the texture switched off. This
one passed with grain and dust both off.
**Also:** the vignette's darkest stop was .78, and `hyperframes check` reported two lines as
hidden under it. The audit scores a gradient by its darkest colour, not by the colour where the
text sits, so a vignette over the words keeps its darkest stop under .6.

### 55 · Word timings: four wrong turns before they held

**What happened:** captions that light as each word is said need each word's start, and no free
voice gives one. `voice_timings.mjs --words` aligns the known text to the loudness: cuts at dips,
pieces matched to letter counts. Each of these gave a plausible table of times, and each was wrong:
- **A pause counted into the word before it.** A word before a comma looked long, so two cuts
  went into the pause and the next word came out 0 ms long. Pieces are now measured in voiced time.
- **A comma with no pause.** A stop consonant's dip inside the next word pulled «ده،» past its
  own pause. After a comma or a dash, a cut now has to land in a pause.
- **A pause that was a consonant.** The silence of a doubled stop running into another («بتحطّ
  كل», 120 ms) passed as a comma's pause. A pause is now 160 ms or more; the commas' were 270–490.
- **A fix that was right about the language and wrong about the result.** A shadda doubles a
  consonant, so it was counted as a letter, and three words of one line moved a whole word late.
  It was taken out again.
**How they were caught:** by looking. `--plot` draws each line's spectrogram with the cuts on it:
a pause is a dark band, and a comma's cut belongs in one. Asking a listening model instead failed
twice. Given a line's clips all at once, it wrote the whole line for nearly every clip. One clip
per request is two requests a word, which the free tier refused before a single answer came back.
**What is left:** pauses and commas land right. Inside fast speech, a short word can still light
about 0.2 s early («كل» in «وحطّت كل»).
**Rule:** a measurement with no automatic check gets a picture you can check by eye, and every
change to it is compared on the lines already read. The shadda looked right and was not.

### 56 · "A sound problem" that was missing sound

**What happened:** a talking-head shoot on a phone with a Hollyland Lark A1, 28 takes. The user
heard "تقطيع" in many of them and asked for the audio to be fixed in the edit instead of a reshoot.
My first diagnosis, from the finished edit, was a Bluetooth band-limit at 4.4 kHz. **Wrong** — the
raw audio had its full band.
**The cause, measured:** the audio streams were 10–25% shorter in samples than in timestamps. Every
missing stretch was a zero-byte AAC packet of 240–310 ms: the phone kept the clock running and the
receiver delivered nothing. On the container's clock each one is a quarter second of silence inside
a word; on a plain decode the holes vanish and the voice drifts ahead of the lips — up to 10 s by
the end of a 52 s take.
**Result:** 14 of 23 "problem" takes had lost 12–57% of their speech. **No filter brings back a
syllable that was never recorded.** Four were light (≤3%) and were saved by cutting each hole from
picture and sound together; the rest are reshoots. Even the "good" folder had holes — its edit
worked because the editor had trimmed round them without knowing why.
**Two traps in the repair:**
- `afftdn` delays its output by **25 ms**. Lip sync was off by exactly that until cross-correlation
  against the raw showed it; it is now taken back in the chain. Measure every filter's latency.
- Cutting picture and sound separately drifts by a frame per hole. Both are cut on the same whole
  frames.
**Rule:** **before promising to fix sound, find out whether the sound exists.** Compare the decoded
sample count to the stream duration; `holes.mjs` does it and gives a verdict per file. And test the
wireless mic with it before a shoot (`routes/camera-project.md`) — five minutes against a lost day.
**What made it trustworthy:** the user listened to a 20 s repaired clip without hearing the original
first, as a stranger would, and judged it acceptable to rescue the video. The tools were checked
against each other: the skill's versions reproduce the project's hole lists and cut lists exactly.

### 57 · Whisper on Egyptian Arabic: invented words, rewritten dialect

**What happened:** captions for an 80 s Egyptian talking head. Groq's `whisper-large-v3` turned
24–52 s into invented text («lol», «شكرا لغبي», a Chinese character) and rewrote the rest as MSA.
A dialect prompt and the turbo model were no better.
**Result:** Gemini (`gemini-flash-latest`, free tier) transcribed it verbatim, in dialect, and
caught a retake and a stumble the edit then removed. **But its sentence times were up to 1 s out**,
and an aligner that snapped to the nearest pause picked the wrong one. Whisper's text was wrong
and its **clock** was right.
**Rule:** **text from one model, timing from another, and a check by ear.** Gemini for the words,
Whisper's word times wherever its word spells the same (167 of 189 here), loudness for the rest.
Then cut a short clip at each edit point and have it transcribed: the first stumble cut kept «ده
أو», and only hearing the clip showed it. Also: Gemini's free tier refuses image and music
generation (quota 0), so illustrations were drawn as SVG in the brand palette.

### 58 · A fixed graphics panel over a presenter's chin

**What happened:** the first talking-head template put every card in one navy box, 960×440, over
the chest from 38.5% of the frame height. All 17 checks passed.
**Result:** the user's words: the rectangle covers part of my face; put it below and the subtitles
in its place; and rather than a fixed rectangle, the graphics should happen around the video, not
in one place and **certainly not inside a fixed rectangular window**. A full render round.
**Why the checks passed:** nothing in the manifest knew where the face was. The safe zone guards the
platform's interface, not the person.
**Rule:** **in a talking head the face is a keep-out area, measured on the footage at the widest
punch-in** (here the head travelled 24–78% across and 9–38% down), declared in `__FMT.keepout`, and
`verify.mjs` fails any element inside it ("keep-out areas"). Captions sit directly under the chin;
graphics float loose over the desk and in the strips beside the head — text with a shadow, small
amber tags, illustrations entering from their side — never a panel. A strip beside the head is
narrow (190–210 px): a 200 px illustration there read as a sticker on the hand, so pictures go in
the low band and the strips carry numbers.

### 59 · A follow CTA on a video that posts to two accounts

**What happened:** the end card said «تابعني…» with the presenter's name.
**Result:** removed — the same video goes on the company's page and the presenter's own, and a
follow card is wrong on one of them. The video now ends on the presenter's own closing line.
**Rule:** ask **where the video is posted** before writing the CTA. A CTA that names one account
belongs in that account's caption, not in the picture. `short-form.md`'s "the CTA is mandatory"
stands for a single-account video; a cross-posted one may end on its last spoken line.

### 60 · Written summaries over a captioned talk, and a badge that never leaves

**What happened:** the second pilot's graphics floated freely and cleared the face, and still all
of them were text: a kicker, a title, a sub-line, a checklist — the talk summarised in phrases,
under captions that already carried every word. A name badge stayed on screen for 66 seconds.
**Result:** the user's words: the elements are mostly writing, not a visual counterpart of what I'm
saying; a word or two is fine, but the rule is visual elements that express what is being said,
not a summary written on screen. And the badge has no reason to stay the whole video. A third round.
**Rule:** **in a captioned talking head the graphics are pictures.** Each beat of the talk gets a
small scene of what it says — a dial that falls, orders that arrive or fail, a van that goes and
comes back — synced to the word, at a size that reads as a picture (an icon ≥ ~180 px tall), with
two words of label at most. `verify.mjs` "pictures, not sentences" fails any graphic with more than
`__FMT.overlayMaxWords` words. A name shows once, early, or not at all.
**The trap underneath:** #09 said captions are not a story; the fix that followed was a story in
phrases — still text. Text over speech is redundant twice: the ear has it and the captions have it.

### 61 · The last frame caught the presenter looking away

**What happened:** the edit ended 0.44 s after the last word. In that tail the presenter's eyes left
the lens (at +0.34 s); the user noticed it at once.
**Rule:** **a talking head ends on a look into the lens.** Pull the last second frame by frame on the
eyes, find the first frame the gaze or the head moves, and end two frames before it (`spec.end`).
The audio tail is not the guide — the eyes are.

### 62 · The transcript had a sentence the audio did not

**What happened:** a caption read "وكمان يبقى سهل في الاستخدام، فـ Claude Design بيساعدني..." over
seconds where the presenter was saying something else. The raw transcript carried a 3.7 s sentence
that the cut audio never contained; the aligner squeezed it in and pushed everything after it off.
**Rule:** when a caption and Whisper disagree, **listen to the loudness, not either transcript.** A
sentence with no room for it between two pauses is not there — drop it (`edit.json drop_text`).

### 63 · Whisper returned its own prompt as the transcript

**What happened:** the opening sentence, sent as a prompt to stop Whisper inventing a channel outro,
came back as the transcript of the first piece — twelve words packed at 0.02 s each over the wrong
seconds. Every word time after it was anchored to that clock, ~3 s early for 15 s.
**Rule:** a run of five or more words shorter than 50 ms is an echo, not speech: ask again without
the prompt (`groq_words.mjs` does). The prompt fixes one hallucination and can cause another.

### 64 · A third caption line came down onto the face

**What happened:** a closing line short on reading time merged with the line before it — ten words,
62 letters — and wrapped to three lines, its last line inside the face keep-out.
**Rule:** a caption is capped by letters as well as words (`CAP_MAX_CHARS`). Arabic words run long;
ten of them do not fit two lines.

### 65 · The cut ended on an empty chair

**What happened:** on a long take holding several videos, the cut ran ~3 s past the last word, and
those seconds were the presenter getting up — the chair empty from 0.05 s after "للجميع".
**Rule:** the end is checked **on the cut**, frame by frame, not on the raw. A gaze checked on the
raw take says nothing about what the cut put after the last word.

### 66 · Review 1 of a ten-video batch — the rules it produced

Ten re-edited talking heads went to the presenter at once. Every note was a rule nobody had
written down; each is listed with how it is now enforced.

1. **Never a look away from the lens** — at the start, at the end, *and between points*. A 1.9 s
   glance to the side with a chair creak sat between point one and point two; the pause rule kept
   it because the creak was louder than the silence threshold. → cut any non-speech stretch where
   the eyes leave the lens, whatever its loudness; check the frames of every pause the pause rule
   kept.
2. **No silence at the head.** Several videos opened on a second of nothing. → `plan_cuts.mjs`
   moves the start to the first sound minus 60 ms; `joint_check.mjs` fails a silent opening over
   0.15 s.
3. **A half-understood sentence is worse than a missing one.** Receiver holes left three sentences
   that read as noise. → remove the damaged phrase (or sentence) when the meaning survives without
   it; ask when it does not. Never leave a garbled sentence because it is "mostly there".
4. **The hook must be fully intelligible.** When the take's own hook is damaged and has no clean
   retake, open with the take's clean closing line as a cold open (`prepend.mjs`) — the presenter
   chose this over keeping the damaged hook with big text.
5. **When a sentence is said twice, keep the right/complete one** — and never leave half of the
   slip ("ده... ده معناه"). The first version of a restated line is the one to cut.
6. **Every joint lands on silence.** Fragments of cut words ("...الموقع") were audible at four joints
   of one video. → `plan_cuts.mjs` snaps every hand-placed edge to the quietest 10 ms within
   0.15 s; `joint_check.mjs` flags any joint whose 40 ms either side is speech-loud.
7. **The end must sound like an end.** A video that stops on a question that opens a new point
   reads as cut off. → end on a closing sentence; if the take has none, look for another take of
   the same talk (a close was taken from the earlier take 131305 with `append.mjs`).
8. **Name what is being enumerated.** In a talk listing six KPIs, each KPI's name stays on screen
   for the whole stretch it is discussed (a ≤3-word label).
9. **A labelled icon's siblings carry labels too** — a price tag reading «ملابس» beside a blank one
   read as a mistake.
10. **The look of the shoot is a setting, not a per-video fix**: blue wall light +30% saturation,
    warm face glare −10% (`GRADE` in the template, measured on the frame).
11. **Layout: pictures directly under the face, captions below them.**

**Cost:** one full re-cut and re-render of ten videos.
---

### 67 · A hook that was a sentence on an empty page

**What happened:** 49 short book videos opened on a question in large type on a cream page —
«تقرأ الآية… ثم تمضي؟», «فاتك معرض الرياض؟». Every one passed every check (hook readable before
2.0s, still, high contrast).
**Result:** the client's words: «الدخلات ضعيفة إجمالاً… محتاجة تكون جذابة أكتر ومتعلقة بالموضوع أو
الكتاب». A full re-voice and re-render of 46 videos.
**Why the checks passed:** they measure whether a hook *can be read*, not whether it is *about
anything*. A generic question could open any video, and the first frames showed no subject at all.
**Rule:** the hook has two halves, and both must name the subject.
- **Visual:** the subject is on screen from frame 0 — the book's cover, or the one number the
  line is about («63», «1727», «25%»). Then the line lands as a short punch (scale 1.12 → 1,
  0.35s, no bounce) *after* the visual has settled — one motion at a time (#28, #29).
- **Copy:** a detail only this subject has, in the first line. «آيةٌ تقرؤها كل يوم… هل توقفت
  عندها مرة؟» beats «تقرأ الآية… ثم تمضي؟» because it puts the reader's daily habit against the
  book's promise. Levers that worked: the story's inciting moment («رجلٌ ابتُلي ببلية… فكان الجواب
  كتاباً كاملاً»), a myth flipped («الفلسفة ليست صعبة… الكتاب الأول هو الصعب»), a number with its
  payoff («30 يوماً… 4 كتب… وخطة جاهزة»), a quiz («ليس أبا حامد… إنه محمد الغزالي»).
- **Truth gate:** a new hook may only use facts already verified in the brief's fact sheet. One
  draft called a 2018 novel a «classic»; another said «قانون» where the source says «تأمل».
  Check every hook against the fact sheet before voicing it.
- Keep the old hook beside the new one (`was:`) so a single hook can be reverted.

### 68 · An Arabic voice that "doesn't know Arabic": undiacritized text

**What happened:** narration was sent to a neural Arabic voice as ordinary undiacritized text.
**Result:** the client's words: «الصوت بيحصل فيه أخطاء أحيانا وكأن اللي بيقرأ مبيعرفش عربي أصل».
**Cause:** written Arabic omits short vowels; the engine *guesses* them. «كتب» was read as
*kataba* where the text meant *kutiba*; case endings were spoken before pauses (*kāmilan.*), which
is exactly how a non-native reader sounds; numbers and «ﷺ» were read literally or skipped.
**Rule:** the voice never reads the caption. Every line has a **spoken form** kept apart from the
written one:
- **full tashkeel inside the phrase**;
- **pause form (waqf) at every comma and full stop** — no case ending before a pause («كامِلا»
  not «كامِلاً», «يَوْم،» not «يَوْمٍ،»), because that is how a native reader stops; poetry keeps
  its final vowels (the rhyme needs them);
- **numbers in words** in the right case («عامَ أَلْفٍ وَتِسْعِمِئَةٍ وَسِتَّةٍ وَسِتّين»);
- «ﷺ» → «صَلّى اللهُ عَلَيْهِ وَسَلَّم»; proper names vowelled (السَّنْعوسيّ، جوخَة الحارِثيّ).
The caption keeps the written line; only the voice gets the diacritized one. A table keyed by
the written line (`tashkeel.mjs`) makes a missing spoken form a build error, not a guess.
**What the automatic check cannot do:** a listening model transcribes *words*, not vowels —
«كَتَبَ» and «كُتِبَ» transcribe the same. The tashkeel layer prevents the error; only a human
ear confirms it.

### 69 · A free voice endpoint that closed overnight

**What happened:** the first batch used Microsoft Edge's read-aloud endpoint through `edge-tts`
(free, no key, word boundaries included). The next day every request returned **403**; updating
the package and checking the clock changed nothing.
**Result:** no voice at all until a new provider was chosen and wired in.
**Rule:** **never ship on an unofficial endpoint.** It can close at any time, and it was never
licensed for commercial use anyway. Use a provider with published terms and a key, and keep a
**fallback chain** of tested providers or models so one closing never stops production
(`references/arabic-voice.md`).

### 70 · Gemini TTS on the free tier: five facts that cost a day

Measured on one account on 11 Oct 2026, against the docs and a developer report that said
otherwise:
1. **~10 requests per day per model** on the free tier — measured on `gemini-2.5-flash-preview-tts`
   and `gemini-3.8-flash-tts`; the "100/day" report did not hold. Each model has its **own**
   quota, and so does each **listening** model used to check the lines.
2. **`gemini-3.8-flash-tts` reads instructions aloud.** A style line placed in the text — «اقرأ
   بالعربية الفصحى… لا تقرأ هذه التعليمات» — was spoken, including the last sentence. Send the
   narration only (or the style through the API's style field). 2.5-flash did not read it.
3. **Two-speaker mode did not switch voices**: both "speakers" came out as the first voice, so a
   male/female sample comparison had no female in it. Compare voices with one request each.
4. **New API keys start `AQ.` (53 chars), not `AIza`** — `tts_gemini.mjs` refused a working key
   on its shape check. Fixed: both shapes are accepted.
5. **One take for several lines splits wrongly at a comma** (#51 again): «من الفاتحة إلى الناس» was
   cut into the next line. The listening check caught it; the line was regenerated alone.
**Rule:** measure the quota on day one (it is the limit that shapes the whole plan), and budget
requests: lines of **several videos in one request**, the listening check on every line, a
failed line regenerated **alone** (one request per line, no split — nothing can move).

### 71 · A batch split across models, and one voice per video

**What happened:** with ~10 requests a day per model, 46 videos could not be voiced on one model
in one day. Grouping five videos per request and moving to the next model on a 429 finished the
batch — but a video whose redo hit the quota on model A could not be patched from model B.
**Rule:** **a video is voiced by one model, start to finish.** When a redo on model A answers
429, the whole video moves to model B; the rest of its group stays on A. The cache key includes
the model, and the build takes each line from whichever model voiced its video. Different models
with the same voice name still sound slightly different — tell the client which videos are on
which model, and offer to unify them when the quotas allow.
---

### 72 · One broken voice line blanked a whole film

**What happened:** a take of five videos was split into lines, and one line came out **0.74s** long
where its text needs about six; its word timings were garbage (a word "said" at −87.6s). The build
used one of those words as a cue, a caption got an end time of −75.8s, and the render came out with
**every animated element missing for the whole film** — only the captions, the watermark and the end
card (timed by attributes, not by the timeline) appeared. The render, the loudness pass and the
manifest all "succeeded".
**Cause:** one non-finite or negative position inserted into a GSAP timeline breaks the timeline,
not just the tween. Nothing downstream re-checks a time.
**Rule:** **a time is checked where it is made.**
- `tts_batch.mjs` rejects a split line whose words are not inside its own duration, or whose
  duration is implausibly short for its letters, and regenerates it alone;
- the build **refuses to render** when any scene start, cue, caption or voice clip is non-finite,
  negative, or ends before it starts, and names the line to regenerate;
- after a batch, pull one frame per video at ~1.5s into one contact sheet — a blank film shows at
  a glance, and it is the cheapest check there is.
---

### 73 · Breath and hiss between the sentences

**What happened:** the client heard a hiss («وش») between sentences in many videos — the TTS breath and
room tone in the pauses, made louder by the loudness pass. `agate` took only 3–4 dB off; `silencedetect`
did not see the breaths at all, because it reads peaks.
**Rule:** measure the **RMS every 10 ms**; every stretch below −34 dB lasting ≥150 ms is turned down
−18 dB in its core, keeping 30 ms at each edge so word tails are untouched — `scripts/quiet_pauses.mjs`
on every voice line **before** assembly and loudness. Measured: breaths −38…−44 dB → −56…−60 dB, speech
level unchanged.
---

### 74 · Real book covers instead of drawn placeholders

**What happened:** a video about one book showed a drawn placeholder cover; the client asked for the real
cover, same frame and size.
**Rule:** research each cover (Goodreads image CDN, Neel wa Furat, Jarir), then `scripts/covers.mjs`:
downloads, refuses < 250 px or non-portrait, **trims the white square** store photos put around a cover
(cropdetect on the negated image needs a looped still — it skips the first frames), normalises to 2:3,
and writes a contact sheet + provenance. **LOOK at the sheet** and match every title before trusting it;
note editions (an English edition, a volume 2) for the client. curl.exe on Windows cannot write to a
non-ASCII path — download to a temp folder.
**Then the palette check failed 14 of 49 videos** (up to 12% off-palette): a cover is a photograph in the
publisher's colours. Declare every real cover as `type: "image"` in the manifest (verify masks images) — and
where a cover MOVES (lands big in the centre, then settles into a grid cell), one image entry **per resting
position**, each measured after it settles; one entry measured mid-flight masked the wrong box. A drawn
placeholder stays measured: it is our own chrome.

### 75 · Lost audio has a rescue ladder — and "keep it" is the last rung

**What happened:** receiver holes destroyed words inside sentences of six videos. The first delivery
kept every damaged sentence "because most of it is there"; the presenter flagged every one of them
as unintelligible — including a hook.
**Rule:** for each damaged stretch, take the first rung that works: cut the damaged phrase → cut the
sentence → drop the whole list item (a six-KPI video became five; renumber) → show a lost spoken name
as an on-screen label → open with the take's clean closing line (`prepend.mjs`) → borrow the missing
part from another take of the same talk (`append.mjs`) → only then keep it, and list it as a decision.
Rungs 3–6 change content: propose them with the reason, the presenter decides.
**Cost:** a full re-cut of six videos.

### 76 · A misspoken name is fixed by cutting the word, not by covering the mouth

**What happened:** the presenter said "جوة Claude Code عندنا حاجة اسمها Projects" — Projects live in
the Claude app. He proposed captioning "Claude Chat" and writing "Chat" over his mouth.
**Rule:** first check whether removing the wrong word leaves a true sentence: cutting "Code" (0.34 s,
edge placed by ear, `exact`) gave "جوة Claude عندنا حاجة اسمها Projects" — true, and the captions
match the voice. Text over the mouth fails three ways: the ear still hears the wrong word, it covers
the face (#58), and the caption contradicts the voice.

### 77 · One long take is several videos

**What happened:** a 7-minute take held a fragment on seasonal buying, three attempts at a KPI video,
the KPI video, and a website-tools video with a 10 s stall and a full first attempt.
**Rule:** read the whole transcript before deciding anything; split by topic into separate work dirs
(hard links to the same source save disk); in each, keep the last complete attempt and drop the
rest; an unfinished fragment is listed, not edited. Two takes of the same talk recorded minutes apart
are the same video twice — offer one, and keep the other as a source of spare parts (#75).

### 78 · The deliverable folder and the notes file are part of the edit

**What happened:** ten videos went to review as previews in chat; the presenter asked for one folder
with everything to review at once.
**Rule:** deliver numbered finals (`01 - <id> - <topic>.mp4`) in one folder with a notes file in the
presenter's language: per video what changed, and **only** the decisions a person must make. Review
notes come back as "video number + second + note". Approved videos go to the client's Drive through
the mounted Drive folder (a connector cannot carry a 150 MB file); verify each upload's byte size
before moving the local copy to the Recycle Bin — and say the space is free only after he empties it.

### 79 · An unattended batch still needs ears

**What happened:** three checks passed — joint loudness, caption-vs-Whisper match, verify — on joints
that still left a split word ("المـ-" of "المرتبات"), a dropped "ده... ده معناه", and a sentence
Gemini invented at a cut.
**Rule:** every flagged joint is listened to (`clipcheck.mjs`), every damaged stretch the presenter
named is listened to after the fix, and any sentence the transcript has that nobody remembers being
said is checked against Whisper and the loudness. Machines narrow where to listen; they do not
replace listening.
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
6. **The verifier cannot read.** It measures whether text *can* be read — dwell, contrast, stillness,
   coverage — and has nothing to say about whether it *means* anything to a stranger. Two demos
   (#42, #43) passed all fifteen checks and failed with their first human viewer. Every gate in this
   skill sits downstream of a script nobody validated.
7. **Machines narrow where to look; people decide.** On re-edited footage every automatic check
   passed on joints that still split words (#79), and every damaged sentence kept "because most of it
   is there" came back from review (#75). Measure to find the spot — then listen, and look at the eyes.

# Arabic narration — the spoken form, the provider chain, the listening check

> Written after a 49-video Arabic batch (Oct 2026) whose voice was rejected with «وكأن اللي بيقرأ
> مبيعرفش عربي أصل», then rebuilt. Failure-log #68–#71 hold the evidence; this file holds the method.
> Read it **before generating any Arabic narration**.

## 1. The voice never reads the caption

Every narration line exists twice:

| | Written (caption) | Spoken (voice) |
|---|---|---|
| Purpose | what the viewer reads | what the engine pronounces |
| Diacritics | normal Arabic, none | **full tashkeel** |
| Numbers | «1966» | «أَلْفٍ وَتِسْعِمِئَةٍ وَسِتَّةٍ وَسِتّين» |
| «ﷺ» | ﷺ | «صَلّى اللهُ عَلَيْهِ وَسَلَّم» |

Keep the spoken forms in one table keyed by the written line, and make a written line without a
spoken form **fail the build**. A missing entry must never fall back to the undiacritized text —
that fallback is exactly the voice the client rejected.

### The tashkeel rules that mattered

1. **Full diacritics inside the phrase.** The engine guesses every short vowel it is not given.
   The guess that sounded foreign: «كتب» read *kataba* where the meaning was *kutiba*.
2. **Pause form (waqf) before every comma and full stop.** No case ending, no tanween before a
   pause: «كِتاباً كامِلا.» not «كامِلاً.», «كُلَّ يَوْم،» not «يَوْمٍ،». Spoken case endings at a
   pause are the clearest marker of a non-native reader.
3. **Poetry and Quranic text keep their final vowels** — the rhyme and the recitation need them;
   Quranic text comes verbatim from the Tanzil file, never retyped.
4. **Numbers in words, in the case the sentence gives them** («عامَ أَلْفَيْنِ وَثَلاثَةَ عَشَر»).
5. **Proper names vowelled once and reused** (السَّنْعوسيّ، جوخَة الحارِثيّ، ابْنُ القَيِّم).
6. If a word in the spoken form differs from the caption (a date read in full, «من الخامس عشر»),
   **change the caption to match** — captions follow the voice to ±0.2s and word for word.

## 2. The provider chain

**Never depend on one provider, and never on an unofficial endpoint** (#69). Keep a tested chain
and move down it on a quota error (429). Each video is voiced by **one** model, start to finish
(#71).

Measured Oct 2026 (one account, free tier — **re-measure on day one**, it shapes the whole plan):

| Order | Provider · model | Free quota | Notes |
|---|---|---|---|
| 1 | Gemini `gemini-3.8-flash-tts` | ~10 requests/day | best Arabic of the free options heard; **reads any instruction placed in the text aloud** — send narration only |
| 2 | Gemini `gemini-3.1-flash-tts-preview` | ~10/day (own quota) | sample heard word-perfect |
| 3 | Gemini `gemini-3.8-flash-lite-tts` | ~10/day (own quota) | sample heard word-perfect; lighter |
| 4 | Gemini `gemini-2.5-flash-preview-tts` | 10/day (own quota) | does not read the style line; two-speaker mode did **not** switch voices |
| — | Gemini `gemini-2.5-pro-preview-tts` | 0 (429 at once) | needs billing |
| — | Google Cloud TTS, Chirp 3 HD `ar-XA` | 1M chars/month | needs a billing account; strongest long-term option |
| — | Azure AI Speech F0 | 500k chars/month | returns word boundaries in the same call |
| — | Groq Orpheus Arabic | ~100/day | **Saudi dialect, not MSA** |
| ✗ | Microsoft Edge read-aloud (`edge-tts`) | — | unofficial; returned 403 overnight (#69) |
| ✗ | ElevenLabs free | 10k chars | no commercial use on the free plan |

Gemini keys now come in two shapes: `AIza…` (39) and `AQ.…` (53). Accept both.

## 3. Budgeting requests

With ~10 requests a day per model, **requests** are the scarce resource, not seconds of audio:

- Put the lines of **several videos in one request** (five worked: ~35 lines, ~3–4 minutes of
  audio), then split the take back into lines with `voice_timings.mjs` (alignment to the known
  text, plus word timings for the captions).
- When only one or two lines need a voice, send **one request per line** — no split, so nothing
  can move between lines.
- Cache each line by `sha1(voice + model + spoken text)`; a fixed line never costs a request again.

## 4. The listening check — on every line

A listening model transcribes each line and compares it **word for word** with the text:

- a missing, extra or moved word fails the line (#51: a comma's pause put «من الفاتحة إلى الناس»
  into the next line);
- a failed line is regenerated **alone**, on the same model as its video, at most twice; still
  failing → written to a flags file for a human listen;
- **the listening models have their own quotas too** — keep a chain of them (`3.8-flash`,
  `3.7-flash`, `3.6-flash`, `3.5-flash`, `flash-latest`, the `-lite` models). A line nobody could
  check is reported as **unchecked**, never as passed;
- the check reads **words, not vowels** — «كَتَبَ» and «كُتِبَ» transcribe alike. The tashkeel
  layer prevents vowel errors; a human ear confirms them.

`scripts/tts_batch.mjs` implements §2–§4.

## 5. Choosing the voice

Let the client choose **by ear**, one request per candidate voice, the same two sentences each —
one with a name and one with a number. Do not use two-speaker mode to save a request: it returned
one voice for both speakers (#70).

# Route — localized and dubbed versions

**Delegates to:** `/media-use` for voice, transcription and captions.
**This layer adds:** the text-expansion problem, and what a language change forces you to re-verify.

## The thing that actually breaks

Translation changes **string length**, and every layout number was tuned to the original. German
runs ~30% longer than English. Arabic is often shorter in characters but taller per line when it
wraps, and it flips the reading direction. A localized build is a **re-layout on the same timeline**,
exactly like a new aspect ratio.

So a localized version **re-runs the full verifier**. Safe zone, coverage and reading dwell are all
length-dependent, and `single language` inverts — the allow-list is the only Latin permitted in an
Arabic cut, and the reverse in an English one.

```bash
node <SKILL_DIR>/scripts/localize.mjs --manifest layout.json --out strings.json
node <SKILL_DIR>/scripts/localize.mjs --strings strings.ar.json --check --base strings.json
```

The first call extracts every `text` field from the manifest into a translatable table. The second
reports the **length delta per string**, so the re-layout is a measurement before it is a surprise.

**Translation changes reading time, not only length.** On the same timeline a longer line gets no
more time on screen. Give the translated script its own `script.json` with `"language": "en"` and
run the gate on it: the reading-load check is what catches a line that no longer fits its beat —
an English line of 13 words needed 4.5s where the beat has 4.4s. The fix is shorter copy, never a
longer beat, because the beat is shared with every other language.

**A left-to-right language mirrors the frame, not only the text.** Whatever reads in order — steps,
a sequence of cards, an arrow's direction — flips with the words, corners included; a shape
table mirrored once (`x → width − x − w`) does it for every box.

In the shipped demos (`demos/12-localized`) the English strings measured +15% to +38% against the
Arabic; they were set at 56px instead of 76px, the longest given a third line, and the full verifier
re-ran with the language check reversed — in a Latin-script cut it is Arabic that may not appear.

## Subtitles vs re-cut vs dubbing

| | When it is right | Cost |
|---|---|---|
| Subtitles | Language is secondary to the visuals | Low — `/media-use` captions |
| Re-cut on-screen text | The text **is** the content | Medium — re-layout + full re-verify |
| Dubbing | Narrated pieces | High — new voice, new word timings, duration sync re-runs |

For narrated work the **duration sync stage re-runs**: real voice length wins over estimates, so
scene durations shift and the assembly changes. Plan it as a build, not an export.

## Two hard stops

1. **Do not machine-translate a claim.** Labels, yes. A positioning line translated badly becomes
   nonsense in the new market, and nobody in the room will notice until a customer does.
2. **Check the voice licence before shipping.** Several open TTS voices are non-commercial, and some
   carry a per-voice licence separate from the engine's. `/media-use` records this; read the ledger.

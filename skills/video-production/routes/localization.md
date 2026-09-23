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

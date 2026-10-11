# Changelog

## v1.2.3 — 2026-10-11
- quiet_pauses.mjs (breath/hiss in pauses, #73) + covers.mjs (real book covers, #74)

## v1.2.2 — 2026-10-11
- failure-log #72: one broken voice line blanked a whole film — tts_batch rejects implausible splits and regenerates the line alone

## v1.2.1 — 2026-10-11
- tts_batch.mjs: index per video — a line shared by two videos no longer mixes two models' voices (failure-log #71)

## v1.2.0 — 2026-10-11
- Arabic narration: `references/arabic-voice.md` — the spoken form (full tashkeel, pause form before every comma and full stop, numbers in words), the tested Gemini TTS chain with measured free quotas, and the listening check (failure-log #68–#71).
- `scripts/tts_batch.mjs` — a batch's narration on a free tier: several videos per request, a fallback chain of TTS models on 429, one model per video, every line heard back and a misheard line regenerated alone.
- Hooks name the subject: the cover or the number on screen from frame 0, a line only this subject has, facts from the fact sheet only (`short-form.md`, failure-log #67).
- `tts_gemini.mjs` accepts Google's new `AQ.` API keys (it refused a working key).
- Toolchain traps T25–T30: Windows heredoc patches, npx lock errors, render temp leaks, the renderer's disk guard, Node's exit assertion, editing a script a batch is running.
- `scripts/publish.sh` + "Maintaining this skill" in SKILL.md: every change is copied to this repository, versioned, tagged and pushed.
- failure-log index completed for #62–#66.

## v1.1.0 — 2026-10-11
- Synced from the installed copy, where they had been committed locally and never pushed: failure-log #56–#66 (wireless-mic holes, Whisper on Egyptian Arabic, keep-out areas, pictures not sentences, the look into the lens, review-1 rules), `holes.mjs`, `repair_holes.mjs`, `scripts/recut/`, keep-out / pictures / palette checks.

## v1.0.0 — 2026-10-10
- The repository as it stood before versioning (failure-log #01–#55, demos).

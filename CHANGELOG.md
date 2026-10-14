# Changelog

## v1.4.0 — 2026-10-14
- verify: 'text not cut off' (#84), CTA holds without freezing (#82), actionable missing-roles message; failure-log #82–#84 (CTA vs dead air, DOM name-swap gaps, clipped text); scrub machine paths and names

## v1.3.6 — 2026-10-13
- quiet_pauses.mjs: floor −46 dB (−34 caught quiet words and long sibilants) — #82 follow-up

## v1.3.5 — 2026-10-13
- quiet_pauses.mjs: leave 200 ms of word decay and ramp the gain — the step clipped Arabic soft endings (#82)

## v1.3.4 — 2026-10-12
- strip_burst.mjs: cut the noise burst Gemini TTS leaves at the end of each take; tts_batch calls it (#81)

## v1.3.3 — 2026-10-12
- renumber listening-check entry to #80 (75–79 were taken by a parallel session)

## v1.3.2 — 2026-10-12
- failure-log #75: listening check shifted by one and redid good lines — stop on mass failure, one transcript per video

## v1.3.1 — 2026-10-11
- failure-log #74: real covers must be registered as image elements, one entry per resting position

## v1.3.0 — 2026-10-11
- recut-talking-head playbook (raw talking-head takes → finished videos), failure-log #75–#79 (rescue ladder for lost audio, fix a misspoken word by cutting it, one long take = several videos, delivery folder + notes, ears on unattended batches), toolchain traps T31–T44, recurring pattern 7

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

#!/usr/bin/env node
/* script_check.mjs — the gate on the SCRIPT, before any composition exists.
 *
 *   node script_check.mjs script.json [--ledger]
 *
 * Why this exists: every other stage of this skill has both an author and a
 * judge. The composition is authored by /hyperframes and judged by `check`;
 * the render is judged by verify.mjs. The script had a judge only — a page of
 * prose rules in references/narrative.md — and prose rules get violated. Two
 * demos passed all fifteen render checks and were incomprehensible to their
 * first viewer, and both broke rules that were already written down.
 *
 * So the script becomes an artifact with declared fields, and the rules become
 * code. verify.mjs asks "can this be read?". This asks "does a stranger end up
 * knowing what you wanted them to know?"
 *
 * Requires: nothing. Node only.
 */
import { readFileSync } from "node:fs";

// ── reading load ────────────────────────────────────────────────────────────
// A short label needs ~0.9s settled; running text ~0.35s per word. These are
// the same numbers behind the render-side `reading dwell` check, applied here
// to the WHOLE beat — a beat can hold three lines that each pass individually
// and still be unreadable in the time it is on screen.
const WORD_S = 0.35;
const MIN_LINE_S = 0.9;
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const lineSeconds = (s) => Math.max(MIN_LINE_S, words(s) * WORD_S);

class Report {
  constructor() { this.rows = []; }
  add(name, ok, detail, ref = "", warn = false) {
    this.rows.push({ name, ok, detail, ref, warn });
  }
  render() {
    const w = Math.max(...this.rows.map((r) => r.name.length)) + 2;
    const bar = "=".repeat(78);
    const pad = (s) => s + " ".repeat(Math.max(0, w - s.length));
    console.log("\n" + bar);
    console.log(pad("SCRIPT") + "RESULT   DETAIL");
    console.log(bar);
    for (const r of this.rows) {
      const tag = r.ok ? "  ok  " : (r.warn ? " warn " : " FAIL ");
      console.log(pad(r.name) + tag + "  " + r.detail + (r.ref ? `   [${r.ref}]` : ""));
    }
    console.log(bar);
    const n = this.rows.filter((r) => !r.ok && !r.warn).length;
    console.log(`${n === 0 ? "SCRIPT PASSED — safe to build" : `${n} CHECK(S) FAILED`}\n`);
    return n === 0 ? 0 : 1;
  }
}

const argv = process.argv.slice(2);
const path = argv.find((a) => !a.startsWith("--"));
if (!path) {
  console.error("usage: script_check.mjs script.json [--ledger]");
  process.exit(2);
}
const S = JSON.parse(readFileSync(path, "utf8"));
const fps = S.fps || 30;
const beats = S.beats || [];
const rep = new Report();

const sec = (f) => f / fps;
const total = beats.length ? Math.max(...beats.map((b) => b.frames[1])) : 0;
const saysOf = (b) => (Array.isArray(b.says) ? b.says : b.says ? [b.says] : []);

// ── 1 · the mechanism is not the claim  #40 ─────────────────────────────────
// Writing both down forces the "so what?" step to actually happen. A script
// that fills these two fields with the same sentence never took the step.
if (!S.mechanism || !S.claim) {
  rep.add("claim stated", false,
    "both `mechanism` (what the tool does) and `claim` (what the viewer gets) are required", "#40");
} else {
  const same = S.mechanism.trim() === S.claim.trim();
  rep.add("claim stated", !same,
    same ? "`claim` repeats `mechanism` — ask \"so what?\" until the answer happens to a person"
         : `claim: ${S.claim}`, "#40");
}

// ── 2 · one claim  #07 ──────────────────────────────────────────────────────
const claimBeats = beats.filter((b) => b.is_claim);
rep.add("one claim", claimBeats.length === 1,
  claimBeats.length === 1 ? `delivered by ${claimBeats[0].id}`
    : claimBeats.length === 0 ? "no beat is marked `is_claim` — which beat lands it?"
    : `${claimBeats.length} beats marked is_claim: ${claimBeats.map((b) => b.id).join(", ")}`,
  "#07");

// ── 3 · the category and the audience are NAMED, early  #08 ─────────────────
// Not a logo, not implied by the visuals: the words, on screen, said plainly.
const LIMIT_S = 6;
const namer = beats.find((b) => b.names_category);
const okName = namer && sec(namer.frames[0]) < LIMIT_S;
rep.add("category named early", !!okName,
  !S.category_noun ? "`category_noun` is missing — what kind of thing is this, in the viewer's words?"
    : !namer ? "no beat sets `names_category` — the viewer never learns what this is"
    : okName ? `"${S.category_noun}" in ${namer.id} at ${sec(namer.frames[0]).toFixed(1)}s`
    : `"${S.category_noun}" first named at ${sec(namer.frames[0]).toFixed(1)}s (limit ${LIMIT_S}s)`,
  "#08");

rep.add("audience stated", !!S.audience,
  S.audience ? S.audience : "`audience` is missing — a script for everyone reaches no one", "#08");

// ── 4 · the stakes, in the first third ──────────────────────────────────────
// What the viewer LOSES today. A video with no cost in it has no reason to be
// watched to the end.
const staker = beats.find((b) => b.states_stakes);
const third = total / 3;
const okStakes = staker && staker.frames[0] <= third;
rep.add("stakes named early", !!okStakes,
  !staker ? "no beat sets `states_stakes` — nothing is at risk, so nothing is at stake"
    : okStakes ? `${staker.id} at ${sec(staker.frames[0]).toFixed(1)}s`
    : `first stated in ${staker.id} at ${sec(staker.frames[0]).toFixed(1)}s, past the first third `
      + `(${sec(third).toFixed(1)}s)`);

// ── 5 · show the thing ──────────────────────────────────────────────────────
// A film about video that never shows a video is a film about an idea.
const shower = beats.filter((b) => b.shows_subject);
rep.add("shows the subject", shower.length > 0,
  shower.length ? `${shower.map((b) => b.id).join(", ")}`
    : "no beat sets `shows_subject` — the whole script describes rather than shows");

// ── 6 · the cold-read ledger, mechanically  #41 ─────────────────────────────
// Every fact a beat NEEDS must have been ESTABLISHED by an earlier beat.
// This is the one check that catches "written for someone who was in the room".
const gaps = [];
const known = new Set(S.assumed_known || []);
for (const b of beats) {
  for (const need of b.needs || [])
    if (!known.has(need)) gaps.push(`${b.id} needs "${need}"`);
  for (const est of b.establishes || []) known.add(est);
}
rep.add("cold-read ledger", gaps.length === 0,
  gaps.length === 0 ? `${known.size} fact(s), each established before it is needed`
    : gaps.slice(0, 4).join(" · ") + (gaps.length > 4 ? ` · +${gaps.length - 4} more` : ""),
  "#41");

// ── 7 · the jargon ledger ───────────────────────────────────────────────────
// Every term that is not everyday language, and the beat that makes it mean
// something. A term used before it is explained is a term the viewer skips.
const jargonProblems = [];
const beatIndex = new Map(beats.map((b, i) => [b.id, i]));
for (const j of S.jargon || []) {
  if (!j.plain) { jargonProblems.push(`"${j.term}" has no plain-language gloss`); continue; }
  if (!j.explained_in) { jargonProblems.push(`"${j.term}" is never explained`); continue; }
  const at = beatIndex.get(j.explained_in);
  if (at === undefined) { jargonProblems.push(`"${j.term}" points at unknown beat ${j.explained_in}`); continue; }
  const firstUse = beats.findIndex((b) =>
    saysOf(b).some((l) => l.includes(j.term)) || String(b.shows || "").includes(j.term));
  if (firstUse !== -1 && firstUse < at)
    jargonProblems.push(`"${j.term}" appears in ${beats[firstUse].id} but is explained in ${j.explained_in}`);
}
// a script with technical words on screen and an empty ledger has not looked
const anyLatin = beats.some((b) => saysOf(b).some((l) => /[A-Za-z]{3,}/.test(l)));
if (!(S.jargon || []).length && anyLatin)
  jargonProblems.push("Latin technical words appear on screen and `jargon` is empty — list them or cut them");
rep.add("jargon ledger", jargonProblems.length === 0,
  jargonProblems.length === 0
    ? `${(S.jargon || []).length} term(s), each explained at or before first use`
    : jargonProblems.slice(0, 3).join(" · "));

// ── 7b · HOOK · BODY · CTA — the shape every short video has ───────────────
// references/short-form.md. Four demo scripts were rejected in a row and not
// one of them had any of these three. They were setup and a closing line.

const HOOK_TYPES = ["comparison", "tutorial", "transformation", "educational",
                    "mistake", "myth", "ranking", "cost", "challenge", "story"];
const HOOK_WINDOW_S = 3;
const CTA_WINDOW_S = 5;
const VALUE_FLOOR = 0.55;          // the body carries ~70%; below 55% it is a hook with a tail
const MAX_WORDS_PER_LINE = 15;

const h = S.hook || {};
if (!h.type || !h.line) {
  rep.add("hook", false,
    "`hook` needs a `type` (" + HOOK_TYPES.slice(0, 5).join(" / ") + " / …) and a `line`");
} else if (!HOOK_TYPES.includes(h.type)) {
  rep.add("hook", false, `unknown hook type "${h.type}" — see references/short-form.md §2`);
} else {
  const hookBeat = beats.find((b) => b.is_hook);
  const landsAt = hookBeat ? sec(hookBeat.frames[1]) : Infinity;
  const ok = hookBeat && sec(hookBeat.frames[0]) === 0 && landsAt <= HOOK_WINDOW_S + 0.01;
  rep.add("hook", !!ok,
    !hookBeat ? "no beat is marked `is_hook`"
      : ok ? `${h.type} — lands by ${landsAt.toFixed(1)}s`
      : `the hook beat runs to ${landsAt.toFixed(1)}s (limit ${HOOK_WINDOW_S}s)`);
}

// stacking: a silent video still has the visual and the written hook, and must
// use both; with voice, all three are available
const stacked = ["verbal", "visual", "written"].filter((k) => h[k]);
rep.add("hook stacking", stacked.length >= 2,
  stacked.length >= 2 ? stacked.join(" + ")
    : `only ${stacked.length || 0} hook channel(s) — set at least two of verbal / visual / written`);

// the body has a FORM, not a mood
const VALUE_FORMS = ["steps", "framework", "comparison", "tips", "numbers", "story_detail"];
const valueBeats = beats.filter((b) => b.value_form);
const badForm = valueBeats.filter((b) => !VALUE_FORMS.includes(b.value_form));
const valueFrames = valueBeats.reduce((t, b) => t + (b.frames[1] - b.frames[0]), 0);
const share = total ? valueFrames / total : 0;
rep.add("body carries value", valueBeats.length > 0 && !badForm.length && share >= VALUE_FLOOR,
  !valueBeats.length
    ? "no beat declares a `value_form` — steps / framework / comparison / tips / numbers"
    : badForm.length ? `unknown value_form: ${badForm.map((b) => b.value_form).join(", ")}`
    : share < VALUE_FLOOR
      ? `value is ${(share * 100).toFixed(0)}% of the running time (floor ${VALUE_FLOOR * 100}%) — `
        + `that is a hook with a tail, not a body`
    : `${valueBeats.map((b) => b.value_form).join(" + ")} · ${(share * 100).toFixed(0)}% of the video`);

// the CTA — literal, late, and matching what the video was for
const CTA_KINDS = { follow: "YOU|ME", engagement: "ME", lead: "YOU", sales: "YOU" };
const c = S.cta || {};
const ctaBeat = beats.find((b) => b.is_cta);
const ctaProblems = [];
if (!c.kind || !c.words) ctaProblems.push("`cta` needs a `kind` (follow / engagement / lead / sales) and the exact `words`");
else {
  if (!(c.kind in CTA_KINDS)) ctaProblems.push(`unknown cta kind "${c.kind}"`);
  if (!ctaBeat) ctaProblems.push("no beat is marked `is_cta`");
  else if (sec(total - ctaBeat.frames[0]) > CTA_WINDOW_S + 0.01)
    ctaProblems.push(`the CTA starts ${sec(total - ctaBeat.frames[0]).toFixed(1)}s before the end (limit ${CTA_WINDOW_S}s)`);
  // YOU content sells and captures; ME content asks for follows and replies
  const allowed = (CTA_KINDS[c.kind] || "").split("|");
  if (S.content_type && !allowed.includes(S.content_type))
    ctaProblems.push(`a "${c.kind}" CTA does not belong on ${S.content_type} content — see short-form.md §5`);
}
rep.add("cta", ctaProblems.length === 0,
  ctaProblems.length === 0 ? `${c.kind} — "${c.words}"` : ctaProblems.slice(0, 2).join(" · "));

rep.add("content type", ["YOU", "ME"].includes(S.content_type),
  ["YOU", "ME"].includes(S.content_type)
    ? (S.content_type === "YOU" ? "YOU — educational, builds authority and leads"
                                : "ME — personal, builds connection")
    : "`content_type` must be \"YOU\" (educational) or \"ME\" (personal)");

// 10–15 words a sentence. Longer lines are not read, they are skimmed.
const longLines = [];
for (const b of beats)
  for (const l of saysOf(b))
    if (words(l) > MAX_WORDS_PER_LINE) longLines.push(`${b.id}: ${words(l)} words`);
rep.add("line length", longLines.length === 0,
  longLines.length === 0 ? `every line ≤ ${MAX_WORDS_PER_LINE} words`
    : longLines.slice(0, 3).join(" · "));

// ── 8 · the repeat test ─────────────────────────────────────────────────────
// The one sentence a viewer says to a colleague afterwards. If you cannot write
// it, they cannot say it.
rep.add("repeat sentence", !!S.repeat_sentence,
  S.repeat_sentence ? `"${S.repeat_sentence}"`
    : "`repeat_sentence` is missing — what does a viewer tell a colleague afterwards?");

// ── 9 · reading load per beat ───────────────────────────────────────────────
// The render-side dwell check measures elements one at a time. A beat can hold
// three lines that each pass and still be unreadable in the time it is up.
const over = [];
for (const b of beats) {
  const need = saysOf(b).reduce((s, l) => s + lineSeconds(l), 0);
  const have = sec(b.frames[1] - b.frames[0]);
  if (need > have) over.push(`${b.id} needs ${need.toFixed(1)}s, has ${have.toFixed(1)}s`);
}
rep.add("reading load", over.length === 0,
  over.length === 0 ? "every beat holds long enough for what it says"
    : over.slice(0, 3).join(" · "), "#31");

// ── 10 · the spine is contiguous ────────────────────────────────────────────
const structural = [];
let cursor = 0;
for (const b of beats) {
  if (!b.id) structural.push("a beat has no id");
  if (!b.frames || b.frames.length !== 2) { structural.push(`${b.id}: frames must be [start, end]`); continue; }
  if (b.frames[0] !== cursor) structural.push(`gap or overlap before ${b.id}`);
  if (!saysOf(b).length && !b.shows) structural.push(`${b.id} neither says nor shows anything`);
  if (!b.job) structural.push(`${b.id} has no \`job\` — what is it for?`);
  cursor = b.frames[1];
}
rep.add("beat structure", structural.length === 0,
  structural.length === 0 ? `${beats.length} beats · ${sec(total).toFixed(1)}s, contiguous`
    : structural.slice(0, 3).join(" · "));

// ── the ledger, for the human ───────────────────────────────────────────────
if (argv.includes("--ledger")) {
  console.log(`\n${S.title || path}`);
  console.log(`audience   ${S.audience || "—"}`);
  console.log(`category   ${S.category_noun || "—"}`);
  console.log(`mechanism  ${S.mechanism || "—"}`);
  console.log(`claim      ${S.claim || "—"}`);
  console.log(`they say   ${S.repeat_sentence || "—"}`);
  console.log(`hook       ${(S.hook || {}).type || "—"} · ${(S.hook || {}).line || "—"}`);
  console.log(`cta        ${(S.cta || {}).kind || "—"} · ${(S.cta || {}).words || "—"}`);
  for (const b of beats) {
    const d = `${sec(b.frames[0]).toFixed(1)}–${sec(b.frames[1]).toFixed(1)}s`;
    console.log(`\n── ${b.id}  ${d}  ${b.job || ""}`);
    for (const l of saysOf(b)) console.log(`   say   ${l}`);
    if (b.shows) console.log(`   show  ${b.shows}`);
    if ((b.needs || []).length) console.log(`   needs ${b.needs.join(" · ")}`);
    if ((b.establishes || []).length) console.log(`   gives ${b.establishes.join(" · ")}`);
  }
  console.log();
}

process.exit(rep.render());

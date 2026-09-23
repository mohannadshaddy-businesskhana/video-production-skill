# Narrative and language

> The rules no tool can measure. These need judgement — and some of them need **the user**, not the
> model.

---

## 1. The spine

**One protagonist · one situation · one claim.**

```
1. The situation     5–8s     a specific person · a problem that actually happens
2. The old way      10–14s    the same person · scattered tools · a cost counter (time or money)
3. The turn          4–6s     the old thing closes · the product opens · definition + slogan
4. The new way       6–8s     the same situation · the solution · the counter stops
5. The widening      8–14s    the consequence of the story — not a new claim
6. CTA               3.5s+
```

**The story must close before the halfway point.** Everything after it widens a promise that has
already been **proven**, rather than adding claims.

### Forbidden `#07 #08`

- More than one primary claim
- Generic chaos ("running a company is hard") — chaos is always a specific situation
- A feature list with no person in it
- An opening that does not name the category and the protagonist **before second six**

### The outline test

Write each chapter's claim on one line. If more than one survives **with no causal link between
them**, it is a brochure, not a story. Cut.

---

## 2. Choosing the claim — the most important decision in the video `#11`

> **Ask: does this claim eliminate the situation, or speed it up?**

| Level | Example | Strength |
|---|---|---|
| Efficiency gain | "Answer in 9 seconds instead of two hours" | Weak — every competitor promises it |
| **Eliminating the situation** | **"The client no longer needs to ask"** | Strong — hard to imitate |

**This distinction cost a full chapter rewrite in the source production.**

### The mechanism is not the claim `#40`

A tool's behaviour and a viewer's benefit are different sentences, and only one of them sells.

| Sentence | Subject | What it is |
|---|---|---|
| "It fails the build when a check does not pass" | the product | mechanism |
| "You don't hear about the mistake from your client" | the viewer | **the claim** |

Write the mechanism, then ask **"so what?"** until the answer is something that happens to a person.
Stop there. That is the film.

**Test:** if the grammatical subject of the claim is the product, it is still a feature.

### Every feature must answer a real objection `#12`

If nobody is asking about it, cut it. A defensive claim plants a doubt that was not there.

### Two numbers that are not the same number `#06`

| The number | What it is | How to phrase it |
|---|---|---|
| The viewer's reality | What they actually do | "You are running seven tools" |
| The product's capacity | What the product can replace | "22 sections, each replacing a tool" |

**The claim is always about the product, never about the viewer.** "You use 22 tools" makes the
viewer say *I don't*, and you lose their belief in everything else.

---

## 2b. The script gate — `scripts/script_check.mjs` `#40` `#41`

> Everything in this section is enforced by code. Fill `assets/script.template.json` and run it.
> A rule that lives only in this file is a rule that will be violated — that is the whole thesis of
> the skill, and the script stage was the last place it was not applied.

The cold-read ledger below is **one** of its checks, and on its own it is not enough: a rejected
demo passed the ledger and still failed on category, stakes, jargon and showing its subject.

### The cold-read ledger `#41`

The verifier measures whether text **can** be read: dwell, contrast, stillness, coverage. It has
nothing whatever to say about whether a stranger **understands** it. That gap is where the two worst
demos this skill has produced went out — fifteen checks green, incomprehensible to the first human
who watched.

So the script passes a mechanical gate of its own, before a line of composition code exists.

**Write a ledger. One row per chapter, in order:**

| Chapter | What this chapter needs the viewer to already know | Where that was established |
|---|---|---|

Fill the third column with a **specific earlier chapter**. If any cell reads "obvious", "from the
title", "they'd figure it out", or is empty — **the script fails.** Move the missing fact earlier or
cut the chapter that depends on it.

Every term, number, name and abbreviation is a row. `18 renders · same` needs: what was rendered,
what it was compared with, and why sameness is the good outcome. Three facts, none of them
established, in one card that was on screen for four seconds.

**Why it has to be mechanical.** The author has just finished the work, so every reference feels
self-evident — from the inside, recency is indistinguishable from clarity. A feeling that "it reads
fine" is exactly the signal that cannot be trusted here, because it is the same feeling whether the
script is clear or whether you simply already know the answer.

> **The hardest version of this test:** the one person who could not follow the second demo was the
> person who commissioned the work it described.

---

## 3. Language — a two-level system `#10`

### Level one — dialogue inside the interface

Messages, comments, names, notifications → **the way people actually write.**
In a dialect market: **the dialect.** In English: the way it is really typed.

```
✅ "did the post go out yet?"
❌ "Has the aforementioned post been published?"
```

This is what makes an interface feel real.

### Level two — narration and voiceover

**Connected sentences, with connecting words.**

> ⛔ **The decisive rule: no clipped fragments strung together with full stops.** Join them —
> and, so, but, because.

| ❌ Clipped | ✅ Connected |
|---|---|
| The same question. One link. | The same question, and the answer in front of him before he finishes reading it |
| One click — a customer with full data. 18 tabs. | One click makes them a customer with their full data across eighteen tabs |

**Stacked noun phrases separated by dots are English syntax.** The user in the source production
described it exactly: *"the phrasing isn't Arabic, it reads like translated English."* The same
failure exists in reverse — English narration written as a list of nouns reads like a slide, not a
sentence.

**One exception:** the slogan and headline blocks — a single phrase split across two blocks, not two
separate sentences.

### The words say something the screen does not `#09`

If the narration describes the picture, one of them is redundant.

```
❌ (screen shows a card moving) "Content links to the client automatically"
✅ (same screen)                "Salma did not open anything"
```

### Category vocabulary

**Ask the user for the right word and use it everywhere.** In the source production the difference
between two apparently interchangeable words was a positioning decision.

---

## 4. Brand voice

From the brand guide, if it has a voice section. If it does not, ask the user for:

- Three "do" sentences and three "don't"
- Banned words
- Level of formality

**The default, absent direction:** short sentences · plain words · confidence without inflation ·
no stacked adjectives, no multiple exclamations, no enormous promises.

A feature is written from the angle of the **benefit**, not the property. And a specific number
beats any adjective.

---

## 5. Designing a series

When there is more than one video:

- **The same spine in every video** — one protagonist, one situation
- **Different protagonists from the same team** — this is what gives a series the feel of episodes
- **The umbrella video defines the world**; section videos go deeper into part of it
- **Never repeat the umbrella claim** in a section video — each one has its own
- **One consistent set of demo data across the whole series.** A different number for the same thing
  in two videos is a credibility fault, and viewers notice it faster than any craft error

### The section brief

Before writing any script in the series, build this table:

| Section | Protagonist | The specific situation | The claim | The tool it replaces |
|---|---|---|---|---|

**Fill it and show it to the user before writing a single script.** The *situation* and *claim*
columns **need the user** — that is market knowledge, not inference.

---

## 6. What needs the user, not the model

In the source production, **five decisions** nobody but the user could make:

1. **The right claim** — eliminating the problem instead of speeding up the solution
2. **The word the customer actually types** — the domain term, not the generic synonym
3. **The friction that matters in this market** — real friction in one market can be meaningless in
   another
4. **The feature that is not a differentiator** — something that looks decisive and is not
5. **The category vocabulary** — between two synonyms, one positions correctly and the other does not

**Ask about all five explicitly at the outline stage.** Do not guess.

Present the outline with this question:

> "Is this the right claim for this market? And are these the words your customer uses?"

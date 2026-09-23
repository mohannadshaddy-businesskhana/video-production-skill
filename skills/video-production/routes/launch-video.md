# Route — launch video

> Folds in the former `brag` skill. A repo, product, or site becomes a short, shareable launch
> video. Narrow and opinionated on purpose.

**Delegates to:** `/hyperframes` → `/product-launch-video` (a URL or site) or `/general-video`
(project code only, no live site).

**This layer adds:** the tone system, the creative laws, the brand contract, and verification.

## Invocation

```
make a launch video
launch video --tone chaotic
launch video --tone polished --format vertical
"brag about this. Make it feel like a ridiculous startup launch."
```

| Option | Values | Default |
|---|---|---|
| `--tone` | preset or freeform direction | inferred |
| `--format` | `landscape` · `vertical` · `square` | landscape |
| `--duration` | seconds | auto, 15–25 |
| `--no-music` / `--no-sfx` | flag | on |
| `--voice` | flag | **off** — narration is opt-in |

Freeform tone ("fake Series A launch from 2016", "museum exhibit") maps to the nearest preset for
pacing and structure, but the user's direction stays verbatim in the plan.

## Tones

| Tone | Energy | Scenes | Transitions |
|---|---|---|---|
| `default` | Playful, clean, postable | 4–5 × 3–5s | crossfade or clean slide |
| `polished` | Serious, elegant, restrained | 3–4 × 4–6s | slow crossfade 0.6–0.8s |
| `yc-parody` | Deadpan startup energy | 4–5 | hard cut |
| `chaotic` | Fast, loud, over-the-top | 6–8 short | whip / glitch |
| `deadpan` | Calm, dry, understated | 3–4 | straight cut |
| `cinematic` | Dramatic, trailer-scale | 4–6 | slow push + fade |
| `app-store` | Smooth, feature-card clean | 4–5 | slide |

Presets are defaults, not limits. A freeform direction always refines or overrides.

## Creative laws — every launch video, every tone

1. **Short.** 15–25 seconds. Not one second more without a reason.
2. **Readable.** Pace comes from motion and cuts, never from flashing text. A short label holds
   ~0.8s settled; a sentence ~0.3s per word. Fast-in then **hold** — never fast-in then gone.
3. **Specific.** It must feel made for this exact project, not any project.
4. **Show the thing.** At least one scene displays real UI, copy, or a key visual. No abstract filler.
5. **No generic SaaS language.** "Streamline your workflow" is banned. Use the project's own words.
6. **The hook is everything.** The first 2 seconds decide whether anyone keeps watching. Plan the
   hook before anything else.
7. **Funny earns its place.** Humor comes from the project's absurdity, not from trying to be funny.

```
Hook (2-3s) → Reveal (2-4s) → 2-3 sharp highlights (5-12s) → Punchline / outro (2-4s)
```

A starting shape, not a template. Not every project needs exactly three highlights.

## Steps

1. **Inspect the project.** Read the code directly — README, package manifest, routes, key
   components, copy. No live URL needed. You must be able to say what it does, who for, and what is
   surprising about it.
2. **Plan.** Write `brag-plan.md`: the angle, then a beat-by-beat storyboard — scenes, text, timing,
   transitions, SFX cues. Scene durations must sum to 15–25s.
3. **Build.** Hand the plan to the `/hyperframes` workflow. This layer owns the angle, tone, source
   material, and delivery expectations; the framework owns composition structure, timing, animation
   mechanics, and the render.
4. **Verify.** `manifest.mjs` → `verify.py` → `delivery_qc.py`. Nothing is shown before they pass.
5. **Deliver.** `normalize.sh` for loudness, pick a real poster frame (not an arbitrary one) and
   bake it as frame 0, write share copy.

## Output

```
launch-output/            (or launch-output-YYYY-MM-DD-HHmmss/ when one exists)
├── brag-plan.md
├── composition/
├── launch.mp4
├── launch.jpg            poster, baked as frame 0
├── layout.json  report.json  qc.json
└── share-copy.txt
```

## Music

The former `brag` skill bundles five tracks with pre-analysed beat cues at
`~/.claude/skills/_archive/brag/assets/music/`. They carry their own licence — check
`assets/music/README.md` before using one in client work, and prefer `/media-use` → `resolve --type
bgm` for anything that ships commercially, because that path writes a licence ledger entry.

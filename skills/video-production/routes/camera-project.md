# Route — projects that need a camera

**Delegates to:** nothing upstream — `/hyperframes` renders, it does not shoot.
**This layer owns:** the planning and the money, and the edit once footage exists.

About 40% of video types need a crew. This route is how the house sells and plans them honestly.

## Say the boundary out loud

Tell the user plainly which parts are automated and which need people. Promising "fully automated
production" for a type that needs a camera is misleading, and it is the fastest way to lose a client.

## What this route produces

```bash
node <SKILL_DIR>/scripts/budget.mjs     --brief BRIEF.md --rates rate-card.yaml --out quote.md
node <SKILL_DIR>/scripts/shoot_plan.mjs --script script.json --out plan/
```

- `quote.md` — line items, revision rounds, and the change-order terms in writing
- `plan/shot-list.md` · `plan/schedule.md` · `plan/call-sheet.md`

**Revision rounds and change orders belong in the quote, not in a conversation later.** Scope
escapes at four predictable places: script changes after lock, reshoots, re-ordering after picture
lock, and version sets nobody agreed to. Name the approval gates — script, rough cut, final — and
treat a return to an approved stage as a paid change order.

## The roles no software covers

Thirteen roles are physical or human by definition: DoP, camera operator, 1st AC, gaffer, grip,
sound recordist, production designer, set, wardrobe, hair and makeup, script supervisor, talent, and
location manager on the day. Plan around them; do not pretend to replace them.

## After the shoot

Footage editing, grading, mixing and captions all delegate to `/hyperframes` + `/media-use`. This
layer resumes at Verify and Deliver.

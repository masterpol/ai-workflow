---
name: shape
description: Frame a problem before engineering. Set appetite, surface knowledge, breadboard the solution, name rabbit holes, write no-gos. Auto-fires /critique for big-batch + AI-prompt scopes before bet.
---

# Shape

> **Recommended capability profile:** `deep` — problem framing, breadboarding, decomposition. Select an available model using `ai-framework/integrations/harnesses.md`.

Phase 0 of the new pipeline. See `ai-framework/workflow/phases/0-shape.md` for full activities.
> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase shape --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this phase's other instructions; pass the same resolved mode to any subagent this phase dispatches. If not installed, proceed normally — this is optional, never required.


## When to use

- User describes a need or feature
- Bug-fix and hotfix workflows skip this; they enter at /build

## Activities (in order)

1. **Knowledge gate (mandatory, FIRST)** — look up `.project/knowledge/graph.json` (tag index + `related`/edges — rebuild first with `node ai-framework/scripts/graphify.js` if it's missing or stale) for entries matching this pitch's topic/tags, then read the matched files under `.project/knowledge/{issues,patterns,decisions}/` **and `ai-framework/rules/`** (where promoted lessons land) **and `.project/rules/*.md`** (this project's stack-specific companions — surface the existing convention now, not for the first time at `/build`). Surface 3-5 hits inline before any writing.
2. **Set boundaries** — pick appetite (`small-batch` ≤5 files / `big-batch` ≤15 files / epic must decompose); write user-centric problem statement.
3. **Breadboard** — places + affordances + connections. Fat-marker only. No wireframes.
4. **Address rabbit holes** — name 2-5 unknowns; each gets resolved-here / pushed-to-plan / pushed-to-no-go.
5. **Write no-gos** — explicit exclusions.
6. **Run /critique** automatically if appetite is `big-batch` or scope touches `lib/ai/prompts/` (uses `/critique` skill).
7. **Bet decision** — Bet (→ /plan) / Re-shape / Pass (→ `_parked/`).

## Output

`.project/pitches/{slug}/pitch.md` using template at `.project/pitches/_templates/pitch.md`.

## AI-prompt scopes (extra discipline)

Pitches touching `lib/ai/prompts/` or LLM call sites must include ≥1 golden eval case at `.project/evals/datasets/` before bet. Hard gate.

## Confirmation gate

Three outcomes — **Bet → `/plan`** / **Re-shape** → loop within `/shape` / **Pass** → `.project/pitches/_parked/{slug}/`. If user acknowledges critique findings without addressing, log reason in pitch's Bet decision section.

## Transition

- Bet → `/plan`
- Re-shape → `/shape` re-entry
- Pass → `.project/pitches/_parked/{slug}/`, no next phase

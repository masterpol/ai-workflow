---
name: plan
description: Turn a bet pitch into an executable spec. Decompose into independent scopes with machine-checkable exit criteria, identify parallel-dispatch opportunities, initialize hill chart.
---

# Plan

> **Recommended capability profile:** `deep` for big-batch, `standard` for small-batch. Select an available model using `ai-framework/integrations/harnesses.md`.

Phase 1 of the new pipeline. See `ai-framework/workflow/phases/1-plan.md` for full activities.

## When to use

- After `/shape` reaches Bet decision
- Skipped for bug-fix and hotfix (they enter /build directly)

## Activities

1. **Decompose into scopes** — independent, completable slices. Each: ID, files, LOC est, dependencies, parallelizable-with, subagent-dispatchable?, dispatch model.
2. **Define exit criteria per scope (strict rule)** — every scope ≥1 machine-checkable command. UI scopes mandatorily include `<build-command>` exit 0 (the real command from `.project/context/stack.md`). AI scopes mandatorily include the golden eval case from pitch.
3. **Identify parallelism** — for each `Subagent? = yes`, justify (disjoint files / self-contained / clear exit / harness supports nested dispatch) and pick that scope's dispatch model by its own complexity, not `/plan`'s `deep` profile — see "Sub-agent Dispatch" in `ai-framework/integrations/harnesses.md`.
4. **Inherit risks from pitch** — items the pitch pushed to "/plan as risk" become a risks table with spike-needed flag. Scan `ai-framework/rules/` for promoted rules **and** `.project/rules/*.md` for this project's stack-specific companions touching the changed files, and fold applicable constraints into scope exit criteria — a scope touching `src/actions/` inherits whatever `.project/rules/backend.md` says about the server/client boundary, not just the generic principle.
5. **Wireframes (UI scopes only, light)** — ASCII layout + Mermaid state diagram. No component-flow Mermaid; no pixel-perfect. For UI-heavy scopes, run `/ui-design` to produce the component hierarchy and skeletons and attach them to the scope.
6. **Blast radius (big-batch, or any plan touching 5+ existing files or shared code)** — run `/impact` on the draft scopes before fixing exit criteria; fold its downstream consumers and required test updates into the affected scopes.
7. **Initialize hill chart** — all scopes at `uphill 0%`.

## Output

- `.project/pitches/{slug}/plan.md` using template at `.project/pitches/_templates/plan.md`
- `.project/pitches/{slug}/hill.md` initialized

## Adaptive plan size

| Appetite | Plan template |
|---|---|
| small-batch | 1-screen mini-plan |
| big-batch | full template |

## Verification at /plan exit

Plan is build-ready when:
- Every scope has ≥1 machine-checkable exit criterion
- Every UI scope includes `<build-command>` exit 0, using the real command from `.project/context/stack.md`
- Every AI scope includes golden eval case
- Subagent-dispatch decisions made (yes/no per scope, with reasoning + dispatch model if yes)
- Hill chart populated, all `uphill 0%`

## Confirmation gate

**Approve → `/build`** / Revise (loop in `/plan`) / Back to `/shape` / Stop.

## Transition

→ `/build`

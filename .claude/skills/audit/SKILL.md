---
name: audit
description: Parallel fan-out audit phase. Dispatches code-reviewer + security-reviewer + test-coverage + ux-reviewer + i18n-checker + eval-runner + cross-pitch-conflict-checker as parallel subagents, synthesizes findings, applies must-fix patches, loops ≤3 cycles. Replaces /review + /security + /test + /ui-review + /scalable-review + /strict-review.
---

# Audit

> **Recommended capability profile:** `standard` — synthesis of subagent findings. Select an available model using `ai-framework/integrations/harnesses.md`.

Phase 3 of the new pipeline. See `ai-framework/workflow/phases/3-audit.md` for full activities.

## When to use

- After `/build` with all scopes at `done`

## Subagent dispatch (parallel)

| Subagent | Triggers | Profile |
|---|---|---|
| `code-reviewer` | always | fast |
| `security-reviewer` | always | standard |
| `test-coverage-checker` | always | fast |
| `ux-reviewer` | UI scopes | standard |
| `i18n-checker` | i18n strings touched | fast |
| `eval-runner` | AI-prompt scopes | fast |
| `cross-pitch-conflict-checker` | ≥2 active pitches | fast |

Each subagent gets a constrained context: only the slice of diff it needs, only the rules it applies (both the stack-agnostic `ai-framework/rules/` principle and the matching `.project/rules/*.md` companion — a security-reviewer pass on an auth change needs `boundaries.md` *and* `.project/rules/backend.md`'s actual auth-guard pattern, not just one), only matched knowledge entries.

## Synthesis

Main thread combines findings. Triage tiers:
- **must-fix** — security high/critical, build-gate failures, eval regression > 0.3, missing exit criterion, cross-pitch pure overlap. Blocks /ship.
- **should-fix** — fix this pass OR defer with reason logged to `deviations.md`.
- **acknowledged** — noted, not actioned. Goes to `log.md` for /cooldown.

## Loop discipline

- Cycle 1: full fan-out
- Apply must-fix patches in main thread
- Cycle 2: re-dispatch only changed-finding subagents
- Cycle 3: same, narrower
- After cycle 3 with must-fixes still open → recommend `/shape` re-entry

## Evidence rule

Every "fixed" claim re-runs the failing check, paste new output. No assertions without evidence.

## Adaptive gate

| Appetite | Cycles cap | Gate at end |
|---|---|---|
| small-batch | 2 | auto if zero must-fix |
| big-batch | 3 | gated |
| bug-fix | 2 | auto if clean |
| hotfix | 1 | gated (residual risk) |

## Confirmation gate

Big-batch and hotfix: gated. Small-batch and bug-fix: auto if zero must-fix. Options:
**Approve → `/ship`** / Revise (next cycle) / Back to `/build` / Stop.

## Transition

- Zero must-fix, or resolved within the cycle cap → `/ship`
- Must-fix still open after the cycle cap → recommend `/shape` re-entry (see Loop discipline)

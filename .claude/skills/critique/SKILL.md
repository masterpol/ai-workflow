---
name: critique
description: Pre-bet red-team via parallel perspective subagents. Auto-fires for big-batch and AI-prompt pitches before bet decision. Surfaces missed knowledge, additional rabbit holes, appetite mismatches, cross-pitch conflicts, and eval blind spots. Findings advisory, not gating.
---

# Critique

Pre-bet step inside `/shape`. See `ai-framework/workflow/phases/0-shape.md` activity #6.
> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase critique [--arg $ARGUMENT]`. If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this phase's other instructions; pass the same resolved mode to any subagent this phase dispatches. If not installed, proceed normally — this is optional, never required.


## When to use

- Auto-fires inside `/shape` when appetite is `big-batch` OR pitch touches `lib/ai/prompts/`
- Skipped for small-batch, bug-fix, hotfix

## Perspective subagents (parallel fan-out)

| Perspective | Triggers | Profile |
|---|---|---|
| `knowledge-historian` | always | fast |
| `skeptic` | always | standard |
| `appetite-auditor` | always | fast |
| `cross-pitch-projector` | ≥2 active pitches | fast |
| `eval-regression-projector` | AI-prompt scopes | standard |

Each receives the current `pitch.md` as input. Each returns structured findings.

## Output

A "Critique findings" section appended to `pitch.md`:

```markdown
## Critique findings

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| C1 | knowledge-historian | medium | missed-knowledge | Reference `issues/wizard-lossy-round-trip` for echo-back rule |
| C2 | skeptic | high | rabbit-hole | Mobile sheet auto-open is a render-cycle trap — see `useState-during-render` |
| C3 | appetite-auditor | high | scope-overrun | Projected 22 files for big-batch (cap 15); decompose recommended |
```

## Disposition (advisory, not gating)

User reviews findings before bet. Three actions:
- **Address** — revise pitch (loop in /shape)
- **Acknowledge** — accept finding, bet anyway, reason logged in pitch's Bet decision
- **Override** — explicitly reject finding, reason logged

Findings do **not** block bet. The user decides.

## Transition

All three dispositions return control to `/shape`'s Bet decision — critique is a sub-step, not
a phase of its own, and never advances the pipeline by itself.

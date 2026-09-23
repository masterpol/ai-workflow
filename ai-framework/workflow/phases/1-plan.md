# Phase 1: Plan

## Purpose

Turn the bet pitch into an executable spec: independent **scopes** with **machine-checkable exit criteria** and an explicit **parallel-dispatch plan**. Initialize the **hill chart** for live progress tracking.

## Trigger

- Completion of `/shape` with a Bet decision
- `/plan` command

## Activities (in order)

### 1. Decompose into scopes

A scope is an **independent, completable slice** — not a task list item. Each scope can ship on its own.

| Property | Required |
|---|---|
| ID (S1, S2, …) | yes |
| Files touched | yes (specific paths) |
| LOC estimate | yes |
| Dependencies (other scopes) | yes (or "—") |
| Parallelizable with | yes (or "—") |
| Subagent dispatchable? | yes/no with reasoning |
| Dispatch model (if yes) | `fast` / `standard` / `deep` — this scope's own complexity, not `/plan`'s |

If a candidate "scope" can't ship without another's commits, it's not a scope — fold them. If a scope can be split, split it.

### 2. Define machine-checkable exit criteria per scope

**Strict rule**: every scope requires ≥1 *machine-checkable* command (`<build-command>` exit 0, `grep -c …`, `test -f …`, etc.). Manual checks are smoke tests on top, not substitutes.

Mandatory inclusions:
- **Every UI scope**: `<build-command>` exit 0 (catches framework-specific build issues that a type-check pass alone misses)
- **Every backend scope**: relevant test suite passes; no untyped/`any`-equivalent validators introduced
- **Every AI-prompt scope**: golden eval case from pitch passes ≥ defined threshold; no regression > 0.3 on any criterion vs baseline

### 3. Identify parallelism

For each scope flagged `Subagent dispatchable? = yes`, justify:
- File set is disjoint from other parallel scopes (check)
- Domain is self-contained (no cross-scope mid-build decisions)
- Exit criteria are clear (subagent has a target)
- **Dispatch model matches the scope, not the phase** — a mechanical, well-specified scope
  dispatches at `fast`; only escalate to `standard`/`deep` if the scope itself carries ambiguous
  trade-offs. `/plan` running at `deep` doesn't mean every scope it dispatches should.
- Only where the active harness supports nested dispatch from within `/build` (see "Sub-agent
  Dispatch" in `ai-framework/integrations/harnesses.md`) — mark dispatch `no` with reasoning
  "harness lacks nested dispatch" if it's unclear whether it does, and `/build` falls back to a
  sequential pass instead.

Document the **parallel dispatch plan** as an ordered list: which scopes go sequential, which fan out after which dependency lands, and each dispatched scope's model.

### 4. Inherit risks from pitch

Pitch's rabbit-hole list (specifically items pushed to "/plan as risk") becomes the plan's risks table. Each risk gets:
- Scope it affects
- Spike needed? (yes/no)
- Mitigation strategy

Also scan `ai-framework/rules/` for promoted rules and `.project/rules/*.md` for this project's
stack-specific companions touching the changed files, and fold applicable constraints into the
affected scopes' exit criteria — the generic rule states the principle, the companion states
this project's concrete convention for it.

### 5. Wireframes (UI scopes only, light)

ASCII layout + state diagram (Mermaid). Component-flow Mermaid is **not** required — the scope table covers component hierarchy. Pixel-perfect wireframes are explicitly out of scope here.

### 6. Initialize hill chart

Create `hill.md` with all scopes at `uphill 0%`. Hill positions: `uphill 0%/25%/75%` → `over-the-hill` → `downhill 25%/75%` → `done`.

## Output

- `.project/pitches/{slug}/plan.md`
- `.project/pitches/{slug}/hill.md` (initialized)

## Verification at /plan exit

Before betting to `/build`:
- Every scope has ≥1 machine-checkable exit criterion
- Every UI scope's exit criteria includes `<build-command>` exit 0
- Every AI-prompt scope's exit criteria includes the golden eval case
- Subagent-dispatch decisions are made (yes/no per scope, with reasoning + dispatch model if yes)
- Hill chart populated, all scopes at `uphill 0%`

## Adaptive plan size

| Appetite | Plan template |
|---|---|
| **small-batch** | 1-screen mini-plan: 1-2 scopes, exit criteria, no wireframe if no UI |
| **big-batch** | Full plan template (scopes table + exit criteria + risks + parallel dispatch + wireframes) |

## Confirmation gate

Plan is build-ready when verification passes and user approves. Options: Approve / Revise / Back to /shape.

## Transition

→ Phase 2: `/build`

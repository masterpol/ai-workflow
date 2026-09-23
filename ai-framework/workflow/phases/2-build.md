# Phase 2: Build

## Purpose

Execute scopes with **evidence before assertion**, parallel subagent dispatch where flagged, and live hill-chart tracking. Most legacy "did anyone actually run the build?" failures are caught here, at scope-completion time.

## Trigger

- Completion of `/plan` with user approval
- `/build` command (or first scope auto-starts after plan approval for small-batch)
- Bug-fix workflow enters here directly

## Per-scope inner loop

```
1. Load scope context: pitch + plan + scope's exit criteria + filtered rules (`ai-framework/rules/` for the stack-agnostic principle, plus the matching `.project/rules/*.md` companion for this project's concrete convention — both, not either) + matched knowledge
2. /hill {scope} uphill-25       — exploring code, reading constraints
3. /hill {scope} uphill-75       — approach decided, key unknowns resolved
4. /hill {scope} over-the-hill   — about to execute
5. Implement
6. (UI scopes) inline UX 5-question check (see below)
7. Run each exit-criterion command, paste output verbatim
8. /hill {scope} downhill-75 → done — only after all commands evidenced
9. Append deviations.md and log.md if any
```

## Verification-before-completion (hard rule)

A scope **cannot** be marked `done` without evidence. Before `/hill {scope} done` flips:

- Every exit-criterion command from `plan.md` is run **in the current session**
- Exit code and last 5–20 lines of output are pasted into the scope-completion summary
- If any command fails, the scope stays `downhill-X%` — failure logged to `log.md`
- The framework refuses the `/hill done` transition without evidence

This is what makes "it compiled on my machine" and the lint-debt class of failures unrebreakable. Every UI scope's exit criteria includes `<build-command>` exit 0 (resolved from `.project/context/stack.md`) — and the framework refuses scope-completion until that command actually ran.

## Three-strike rule (in-session thrash guard)

The stuck-uphill detector below catches stalls *across* sessions; this catches them *within* one. If the same exit criterion fails **3 attempts in a row** on the same scope:

1. Stop editing. Do not try a fourth variation of the same fix.
2. Write a 3-line `log.md` entry: what was tried, the exact failing output, the current hypothesis.
3. Escalate by cause — a build or type error goes to `build-error-resolver` (constrained to the failing output + touched files); anything else (unclear requirement, wrong plan assumption, missing dependency decision) goes to the human with the log entry and a proposed next step.

Repeated near-identical attempts burn context and tend to widen the diff; a fresh, constrained pass or a human decision is cheaper.

## Inline UX 5-question check (UI scopes only)

Before flipping to `done`, answer:

1. Max 3 sections per screen?
2. Max 2-3 decisions per screen (forms ≤4 fields per step)?
3. Mobile 360px: main task readable, no horizontal scroll?
4. Progressive disclosure: complex options hidden by default?
5. Dark mode + brand-token classes (no raw hex)?

Any "no" → fix inline OR log to `deviations.md` with reason. Full Nielsen 10-heuristic evaluation runs in `/audit` (the `ux-reviewer` subagent).

## Parallel subagents

When `/plan` flagged 2+ scopes as parallelizable and their dependencies are met:

- Dispatch parallel subagents when the active harness supports it; otherwise run the same constrained role passes sequentially.
- Dispatch each at the **model `/plan` recorded in that scope's "Dispatch model" column** — a mechanical, well-specified scope runs at `fast` even though `/build` itself runs at `standard`; only a scope with real ambiguity should run at `standard`/`deep`. Don't default every dispatched scope to `/build`'s own profile.
- Each subagent gets a **constrained context**: pitch + plan + its scope's exit criteria + filtered rules (same both-not-either rule as above) + matched knowledge — **not** the full pitch history
- Each returns: completion summary + evidenced exit criteria + deviations + log entries
- Main thread validates evidence, applies fixes if needed, updates `hill.md`
- Subagent failure → main thread either retries with more context or downgrades scope to "needs main-thread attention"
- Parallel writers require isolated worktrees. In a shared worktree, only dispatch read-only work in parallel.

## Adaptive gate

| Appetite | Gate after each scope? | Gate at /build end? |
|---|---|---|
| **small-batch** | no — auto-advance | no — flow into /audit |
| **big-batch** | yes — present evidence + ask | yes |
| **bug-fix** | n/a (single scope) | gate before /audit |
| **hotfix** | n/a | gate; rollback plan required |

## Stuck-uphill detector (built-in warning)

If a scope's hill position hasn't moved in 3+ session updates while still uphill:

> *"S{X} has been at uphill-{N} across 3 sessions. This often signals a hidden rabbit hole. Want to re-shape, or push to no-go?"*

Direct application of ShapeUp's hill-chart insight: a stuck dot signals hidden problems.

## log.md and deviations.md discipline

- **`log.md`** — 3-line incident capture per bug hit during build: symptom, root cause, fix. Auto-promoted to `knowledge/issues/` at `/ship` if novel.
- **`deviations.md`** — every plan deviation: what was planned, what shipped, why. Becomes part of pitch reconciliation at `/ship`.

## Bug-fix variant

Single implicit scope. Exit criteria:
- Failing test now passes
- Regression test added
- Full test suite still green
- `<build-command>` exit 0
- `log.md` entry mandatory (the bug *is* the knowledge)

Flows directly into `/audit` (skipped only for trivial typo / copy fix).

## Output

- All scopes at `done` on hill chart
- Working code matching plan (deviations logged)
- `log.md` and `deviations.md` populated as needed
- Evidence (command outputs) inline in scope-completion summaries

## Confirmation gate (big-batch only)

Present hill-chart roll-up + evidence + open deviations + open log entries. Options: Approve → /audit / Revise specific scope / Back to /plan / Stop.

## Transition

→ Phase 3: `/audit`

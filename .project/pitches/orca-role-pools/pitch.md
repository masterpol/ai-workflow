# Pitch: orca-role-pools

**Date**: 2026-10-16  •  **Appetite**: big-batch
**Stack**: workflow-tooling (orca-policy, orca-dispatch, launch gate, /build skill)
**Epic**: `workflow-v3` — pitch 4 of 5. Depends on `unified-toon-config`.

## Problem

A coordinator can hand each role to exactly one worker, with at most 2 workers and 3 concurrent tasks. The
owner wants several agents to split a pitch's scopes (e.g. implementation by `opencode` and `claude`, review
by `codex` and `opencode`) and room to grow toward a swarm. LAH tried this with a 3-worker file the current
policy rejects.

## Knowledge consulted

- [issues/status-dispatch-ready-false-is-not-launch-authority] — constrains: pool selection never grants
  launch authority; the launch gate still decides.
- [patterns/verify-run-binding-before-orca-dispatch] — applies to every pool member, not just the first.
- [issues/orca-workers-differ-from-the-coordinator-environment] — applies: each pool worker is preflighted
  on its own.
- [patterns/retry-only-on-positive-proof-of-a-clean-failure] — applies: retries move a task to another pool
  member only on a proven clean failure.
- [decisions/orca-auto-start-design] — constrains: blocked means stop and ask.

## Owner decisions (2026-10-16)

- Review pools use **split** semantics: each scope gets one reviewer from the pool (same as implementation).
- `maxConcurrentWorkers` bounded 1..16 (was 1..3).

## Solution sketch (breadboard)

**Places**: `orchestration` section of `ai-workflow.toon`; `orca-policy.mts`; `orca-dispatch.mts`;
`orca-launch-gate.mts`; `orca-ledger.mts`; `.claude/skills/build/SKILL.md` (+ vendor mirrors);
`orca-vendors.md`.

**Affordances**:
- `roles.<role>`: string (legacy) or array of 1..N distinct worker names. `workers` derived from the union of
  role pools (explicit `workers` list optional, must be a superset).
- Remove the `workers.length > 2` limit; a coordinator may appear in its own pool (LAH's intent).
- Assignment: deterministic split — round-robin over the pool in plan order, skipping members whose
  preflight failed; ledger records which member took which scope.
- Reviewer ≠ implementer for the same scope when the pool allows it; if impossible, record it and ask.
- Concurrency: at most `maxConcurrentWorkers` live tasks across all pools.
- Retry: on clean failure, the next pool member gets the task (bounded by `maxRetriesPerTask`).

**Connections**: config pools → policy model → dispatch picks member per scope → launch gate → ledger →
review dispatch picks a different member.

## Rabbit holes

**Resolved here**:
- Split vs fan-out review → split (owner).
- Ceiling → 16 (owner).
- Legacy single-string roles → still accepted, normalized to one-element arrays.

**Pushed to /plan as risk** (owner: planner):
- Does Orca itself cap concurrent terminals/agents per session? Probe before raising defaults past 3.
- Same-file contention when two implementers run in parallel: dispatch must only run scopes the plan marks
  parallel-safe; confirm `orca-apply`/`diff-admit` handle concurrent patches in arrival order.
- Ledger and evidence schema change (member per scope) — version bump and migration of in-flight runs.
- `orca-eval-grader` fixtures hardcode `maxConcurrentWorkers: 3` and single-role coordinators.

**Pushed to no-go**:
- Swarm behavior (dynamic spawning, agent-to-agent messaging, load-based scheduling).
- Fan-out review mode.

## No-gos (this pitch)

- ✗ No unbounded concurrency; 16 is the ceiling.
- ✗ No change to who holds launch authority.
- ✗ Standing workflow-tooling no-gos apply.

## Critique findings

(Empty until /critique runs.)

## Bet decision

☐ **Bet** (→ /plan)
☐ Re-shape — named gap: {…}
☐ Pass — reason: {…}

> **Note (2026-10-16, unified-toon-config d42):** the TOON schema is now `schemaVersion: 2` with Orca nested under `integrations.orca` (`engine`, `enabled`, `multiAgent`, bounds, `coordinators.<vendor>.{workers,roles}`). References to `engines.orca` or top-level `orchestration` below mean `integrations.orca.engine` / `integrations.orca.*`.

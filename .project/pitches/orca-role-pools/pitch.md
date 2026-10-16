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

Run 2026-10-16: knowledge-historian, skeptic, appetite-auditor, cross-pitch-projector (eval-regression skipped: no AI-prompt scopes). Advisory only. Note: knowledge-historian and cross-pitch-projector had no Bash; they used Grep/file lists, not graph queries or diffs.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| A1 | appetite-auditor | high | scope-overrun | Breadboard = 20 files (14 source/doc + 6 tests); with conditional touches 22–25 vs big-batch cap 15. Core excluding CHANGELOG/VERSION ≈ 18. |
| A2 | appetite-auditor | medium | borderline | ~1,800–2,000 LOC touched vs cap 1,500; tests dominate. Trim test surface, not scope. |
| A3 | appetite-auditor | high | decomposition | Split: (1) pool model — `config.mts`, `orca-policy.mts`, `orca-launch-gate.mts`, `config-migrate.mts`, `orca-vendors.md`, example toon + tests (~10 files); (2) assignment + ledger — `orca-dispatch.mts`, `orca-ledger.mts` (+migration), `orca-apply.mts`, grader fixtures, build SKILL mirrors + tests (~12 files). Gate (2) on the Orca concurrency probe. |
| A4 | appetite-auditor | medium | hidden-surface | Omitted from Places: `orca-apply.mts:466`, `config-migrate.mts:185,250`, `orca-start.mts:165`, `orca-reconcile.mts:277,316`, `.opencode/commands/build.md`. `.codex/` has no build skill (mirror claim wrong); `.agents/skills/build/SKILL.md` is an 8-line stub. |
| S1 | skeptic | high | rabbit-hole | Config already accepts `roles.<role>: string[]` (`config.mts:18,435-452`) but `orca-policy.mts:112` keeps only `list[0]`: pool files load and extra members are silently dropped. `validateCoordinator` (`:35`) hard-codes `workers.length > 2`, line 37 rejects `worker === vendor`, line 39 fixes role keys, `report().roles` typed `Record<string,string>` (consumers: `orca-start.mts:165-188`, `orca-run.mts:300`). Name the widened type + consumers; decide whether legacy-JSON `validatePolicy` gets pools or stays frozen. |
| S2 | skeptic | high | rabbit-hole | Coordinator in its own pool: gate runs on `vendor: coordinator` (`orca-dispatch.mts:113,121`) then `policy.workers.includes(vendor)` (`:125`) passes — conflicts with "no change to launch authority". Define self-membership (sibling worker of same vendor?) and what the gate asserts; check `orca-start.mts:188`, `orca-preflight`. |
| S3 | skeptic | high | rabbit-hole | Round-robin vs retry/resume: `dispatchWithRetries` (`:202-220`) passes the same `vendor` every attempt (no mechanism for "next member"); `task-owned` blocks re-claim (`orca-ledger.mts:289`); a cursor from plan order shifts with preflight skips, so resumed runs may assign differently (`resumeExisting` `:195` trusts ledger vendor). Make assignment a pure function of (scopeId, pool snapshot), persisted before claim. `unknown-liveness` / `launch-failed:unproven` must never rotate to another member. |
| S4 | skeptic | high | rabbit-hole | Ledger is a closed strict reader (`orca-ledger.mts:86,133,143`): new keys or a version bump make older readers return `corrupt` and block dispatch (`orca-dispatch.mts:107`) and break `canonical()` replay detection. Prefer additive optional keys or derive reviewer≠implementer from `vendor`+`taskKey`; else write migration + drain rule. |
| S5 | skeptic | medium | rabbit-hole | Reviewer≠implementer with degenerate pools (one-member / same pool is the legacy default; grader fixture `:105`). "Ask" conflicts with "blocked means stop" and unattended runs — decide: block, or allow with recorded `reviewIndependence`. Per-vendor capacity (one `codex` terminal) unspecified. |
| S6 | skeptic | medium | stale-premise | 1..16 already shipped (`orca-policy.mts:49`, git log) — pitch's "was 1..3" is stale; check `config-migrate.mts:168` default 3. Grader fixtures encode old semantics (`:107`, `:236` `index % workers.length`). Add a 16-worker capacity test and ≥3 overlapping-writer test for `orca-apply`. |
| K1 | knowledge-historian | high | missed-knowledge | `decisions/unified-toon-config-schema-v2`: this pitch edits the schema it defines (invalid TOON contributes nothing, no v1 conversion, validators via `registerIntegrationValidator`, policy bounds "until orca-role-pools"). Add to Knowledge consulted. |
| K2 | knowledge-historian | high | missed-pattern | `patterns/reconcile-every-worker-of-a-wave-before-committing-any-scope`: committing one scope moves HEAD, siblings fail `apply:baseline-moved`; covers the same-file contention risk. |
| K3 | knowledge-historian | high | missed-issue | `issues/an-idempotent-replay-path-returned-success-without-re-checking-the-gate`: retry/reassignment reusing an attempt key can skip the launch gate — re-run the gate for the new member. |
| K4 | knowledge-historian | high | missed-pattern | `patterns/a-gate-spawns-exactly-what-it-probed`: authority is per (coordinator, worker) pair; spawn must use the probed executable. Relevant to coordinator-in-own-pool. |
| K5 | knowledge-historian | medium | missed-pattern | `patterns/reversible-aggregates-store-their-routing`: store routing per record at write time; migrate by adding the field empty with a `since` marker. |
| K6 | knowledge-historian | medium | missed-pattern | `patterns/settle-only-with-proof-bound-to-this-patch`: a retry on another member must not reuse the prior member's evidence. |
| K7 | knowledge-historian | medium | missed-issue | `issues/a-probe-child-ran-a-bare-command-with-the-parent-path`: per-member preflight needs realpath-spawn + worker-env rule. |
| X1 | cross-pitch-projector | high | schema/type conflict | `config.mts` already accepts pool arrays; `orca-policy.mts` + test (`:512`) expect `Record<string,string>`; `orca-start.mts:164` filters `typeof === "string"`, silently dropping pool members from preflight. Normalize pools once; probe every member. |
| X2 | cross-pitch-projector | high | uncommitted overlap | Projected files (`orca-launch-gate`, `orca-start`, `config.mts`, example toon, `orca-vendors.md`) are all modified in the working tree; `orca-engines-range` is shipped but uncommitted. Commit/ship it before `/plan`; do not `/build` on a dirty tree. |
| X3 | cross-pitch-projector | high | ordering | `config.mts:560` pins `schemaVersion !== 2`; `vendor-model-toon` bumps to 3, rollout assumes 2, both edit the example toon. Suggested order: orca-role-pools (no TOON schemaVersion bump; ledger/evidence bump only) → workflow-v3-rollout → vendor-model-toon → agent-model-sweep. |
| X4 | cross-pitch-projector | medium | mirror drift | `agent-model-sweep` edits `.opencode/commands/*.md` and `workflow-doctor` `checkSkill`; byte-mirror drift of build SKILL trips the doctor. Regenerate mirrors via `skill-vendors.mts`; sweep rebases after. |
| X5 | cross-pitch-projector | medium | fixtures | `agent-model-sweep` rewrites `workflow-doctor.mts`/tests; keep grader fixture update in role-pools scope only. |

**Synthesis:** the pitch under-sizes itself (A1/A3) and its premise is partly stale (S6: ceiling shipped; S1/X1: config already accepts pools while policy/start silently truncate them — a live silent-drop bug worth fixing first). Highest-risk design gaps: assignment determinism across retry/resume (S3), additive-only ledger change (S4), coordinator-in-own-pool authority (S2/K4).

## Bet decision

☐ **Bet** (→ /plan)
☐ Re-shape — named gap: {…}
☐ Pass — reason: {…}

> **Note (2026-10-16, unified-toon-config d42):** the TOON schema is now `schemaVersion: 2` with Orca nested under `integrations.orca` (`engine`, `enabled`, `multiAgent`, bounds, `coordinators.<vendor>.{workers,roles}`). References to `engines.orca` or top-level `orchestration` below mean `integrations.orca.engine` / `integrations.orca.*`.

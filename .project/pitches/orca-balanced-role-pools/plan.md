# Plan: orca-balanced-role-pools

**Pitch**: pitch.md  •  **Appetite**: big-batch (15 files, at the cap)  •  **Hill**: hill.md  •  **Mode**: Orca, Run `run_911f7939687b`, coordinator claude
**Precondition met**: 2.53.0 committed (`4a46383`) and pushed on `feat/state-project-depth`. This pitch builds on top of it.

## Settled at /plan

- **Concurrency (S1): an optimistic recheck under the claim lock.** `reserve()` gains an optional `admit(records)` callback. It runs inside the mutation lock on the same `list()` that `reserve` already reads. Dispatch passes a callback that recomputes the load and accepts only if the chosen vendor's load is still the minimum among the eligible members. On `load-changed`, dispatch re-resolves once and claims without the check (best effort: fairness never blocks a dispatch). The pick itself stays a pure function, outside the lock.
- **The owning set** for load is the same predicate `resolveAssignment` uses (`holds`): `processOwnerPid`, or a state of `claimed`, `launched`, `unknown-liveness` or `completed`, or `settled` with a `reportId`. A settled clean failure (no `reportId`) is not load.
- **Load window.** When the dispatch input carries `runId`, load counts the owning records with that same `runId`. Without one, it counts live records only (`claimed`, `launched`, `unknown-liveness`, or a `processOwnerPid`). Records without a `runId` never count toward a Run.
- **Tie-break.** Members are ordered by `(load, (indexInEligible − planIndex) mod n)`. With all loads equal, the result is today's round-robin, so the existing assign tests stay valid with an empty load.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| P1 | Least-load picker | `orca-assign.mts`, `orca-assign.test.mts` | ~40 + ~120 | — | P3 | **yes**, Orca **opencode** (by hand: the underused worker). Pure, 70-line module, fixed interface. | standard |
| P3 | `runId` dispatch input | `orca-run.mts`, `orca-run.test.mts` | ~25 + ~60 | — | P1 | **yes**, Orca **codex** (by hand). Disjoint, and the interface is fixed below. | standard |
| P2 | Ledger `runId`, Run-scoped load, recheck under the lock | `orca-ledger.mts`, `orca-ledger.test.mts`, `orca-dispatch.mts`, `orca-dispatch.test.mts` | ~90 + ~220 | P1 | — | **yes**, Orca **dispatched with `assign`** (the live dogfood: assign is still round-robin until P2 lands, so P2 records which worker that picks). Owns the lock-sensitive code; 4 files. | standard |
| P4 | Golden case executes | `.project/evals/datasets/orca-vendor-orchestration.json`, `orca-eval-grader.mts`, `orca-eval-grader.test.mts` | ~60 + ~40 | P1, P2, P3 | — | **yes**, Orca **dispatched with `assign` and `runId`** (the first balanced pick, after P2 is integrated). | standard |
| C1 | Guidance, contract test, release | `ai-framework/integrations/orca-vendors.md`, `ai-framework/workflow/phases/2-build.md` (pointer), the contract test inside `orca-run.test.mts` (after P3 is collected), `CHANGELOG.md`, `VERSION` | ~60 | P1–P4 | — | **no**. Coordinator integration and the live checks. | — |

**Cut line:** if P4's grader work overruns about 150 LOC, the case stays `parses-only` and P1/P2 unit tests carry the invariants (pitch A6).

### Fixed interfaces

```ts
// orca-assign.mts (P1). load absent or empty gives today's behaviour exactly.
export interface PickInput { pool: readonly string[]; planIndex: number; skip?: readonly string[]; recorded?: string; load?: ReadonlyMap<string, number> }
// pickImplementer / pickReviewer: eligible members ordered by (load ?? 0, rotation distance from planIndex); first wins.
export function leastLoaded(members: readonly string[], planIndex: number, load?: ReadonlyMap<string, number>): string | undefined;

// orca-ledger.mts (P2)
interface LedgerRecord { /* … */ runId?: string }          // ^run_[a-z0-9]{6,32}$, set once at claim; validateRecord checks shape
reserve(record, maxConcurrentWorkers, admit?: (records: readonly LedgerRecord[]) => boolean): ReserveResult  // adds outcome "load-changed"

// orca-dispatch.mts (P2)
interface DispatchOptions { /* … */ runId?: string }       // invalid shape -> { route: "normal", reason: "invalid-run-id" } before any side effect
export function loadOf(records: readonly LedgerRecord[], runId: string | undefined): Map<string, number>;

// orca-run.mts dispatch input (P3): optional key "runId" (same regex); bad value -> usage error "dispatch" (exit 2); passed through to dispatchScope.
```

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### P1 — Least-load picker
- `bun test ai-framework/scripts/orca-assign.test.mts` exit 0. Cases:
  - **Without load:** results identical to today. The existing determinism ×1000 and 16-member spread tests are unchanged.
  - **With load:** the lowest load wins, ties fall back to rotation from `planIndex`, `skip` is honoured, and the reviewer still excludes the implementer.
  - **Pool independence:** the implementation pool `[codex,claude,opencode]` and the review pool `[codex,opencode]` with shared load give greedy fairness at every pick over a 10-step sequence.
  - `recorded` still wins.
  - A load entry for a non-member is ignored.
  - Determinism: the same inputs give the same output ×1000.
- Mutants: removing the load ordering or the tie rotation each fails at least one test.
- `git status --porcelain` shows only the two P1 files changed by the worker.

### P3 — `runId` dispatch input
- `bun test ai-framework/scripts/orca-run.test.mts` exit 0. Cases:
  - A valid `runId` passes through to the dispatch options.
  - These are refused with exit 2 and the `dispatch` usage error, before any Orca call: `RUN_X`, `run_`, `run_../x`, a value of 33 or more characters, a non-string, and the key duplicated or misspelt (`exactKeys`).
  - Absent is unchanged.
- Only the two P3 files are changed.

### P2 — Ledger `runId`, Run-scoped load, recheck under the lock
- `bun test ai-framework/scripts/orca-ledger.test.mts ai-framework/scripts/orca-dispatch.test.mts` exit 0. Cases:
  - **Ledger:** `runId` is validated, stored at claim and set once (a patch cannot change it). Old records without it stay valid. `reserve` with `admit` returning false gives `load-changed` and writes nothing. `admit` sees the same `list()` as the capacity and overlap checks.
  - **Load:** the ownership-state matrix in the current Run:
    - counted: `claimed`, `launched`, `unknown-liveness`, `completed`, settled with a report, and a `processOwnerPid`;
    - not counted: a settled clean failure;
    - other Runs and no-`runId` records count 0;
    - without a `runId` input, only live records count.
  - **Dispatch:**
    - The recorded owner still wins.
    - A clean-failure rotation is unchanged (balancing never overrides `nextMember`).
    - Unknown-liveness is never moved.
    - `invalid-run-id` arrives before any side effect.
    - Two interleaved dispatches (injected at the lock) do not both pick the least-loaded vendor: the second gets `load-changed`, re-resolves and picks the next one.
    - An explicit `vendor` is unaffected.
    - An assign-picked opencode still frees the OpenCode port and resolves its agent id: the existing `prepareOpencode` path, tested here.
- Mutants: the clean-failure counting as load; dropping the `runId` filter; dropping `admit`. Each fails a test.
- The 4 P2 files only.

### P4 — Golden case executes
- The case `role-pools-balance-load-across-roles` is rewritten (pitch E1, E3–E6):
  - explicit `runId`s (current, other, missing);
  - an ownership-state matrix;
  - a clean failure and an unknown-liveness mid-sequence;
  - explicit `planIndex`/`skip`;
  - a degenerate pool;
  - one explicit-vendor dispatch.

  `coordinatorUsesAssignByDefault` moves out of the graded keys into a `notGraded` note (it is checked by C1's contract test and the live dispatch).
- The grader executes it (`node ai-framework/scripts/orca-eval-grader.mts --root .` shows it as `executes`, passing). `orca-eval-grader.test.mts` exit 0 with the mode map and counts updated (9 executed, 1 parses-only, 3 live-only).
- An in-memory mutant: the picker ignoring load turns the case red.

### C1 — Guidance, contract test, release
- `orca-vendors.md` § "Assignment" owns the rule. It says to dispatch with `assign` and `runId` (the Run verified at phase start), and to name `vendor` only when the owner names one or the scope needs a specific vendor, recording why. `2-build.md`'s Orca section gains one pointer line to it.
- A contract test in `orca-run.test.mts` asserts that the rule sentence is in `orca-vendors.md`, that `2-build.md` links to that section, and that no other phase doc restates it.
- **Live checks** (recorded in the run log):
  - P2 and P4 are dispatched with `assign`, with the picked vendors recorded.
  - At least one assign-picked **opencode** dispatch is made. If none of P2/P4 lands on opencode, a read-only smoke dispatch with `assign` runs after balancing is live, where load makes opencode the minimum.
- Checks: `workflow-doctor` READY; `setup-validator`, `graphify --check`, `graphify-relations --check`, `changelog --check` and `docs-links` exit 0; the full suite on an independent clone has 0 new failures.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Concurrent dispatches read the same load (S1) | P2 | no | Optimistic `admit` under the mutation lock, one re-resolve, never blocking |
| The guidance change does not change coordinator behaviour (E2) | C1 | no | Contract test plus live `assign` dispatches in this very build |
| The first assign-picked opencode fails at the port or the agent id (K3) | P2, C1 | no | A P2 test on the existing `prepareOpencode` path, plus a live opencode dispatch |
| Grader work overruns (A6) | P4 | no | Cut line: `parses-only` plus unit tests |
| Old task keys collide across Runs (S2) | — | no | Out of scope (followup). Load is Run-scoped, ownership is not |
| Four live workers exceed `maxConcurrentWorkers` | all | no | Waves of at most 2 |

## Parallel dispatch plan

- **Wave 1 (parallel, named by hand):** P1 to **opencode**, P3 to **codex**. Disjoint files, fixed interfaces.
- **Wave 2:** P2 with `assign: { role: "implementation", planIndex: 2 }`, after P1 is collected and re-tested. This is the dogfood of the *current* round-robin, and the result is recorded.
- **Wave 3:** P4 with `assign` plus `runId` (the new balanced pick), after P2 and P3 are integrated and the full Orca test files pass.
- **C1** by the coordinator. Every worker is released after collection; the coordinator re-runs every exit command.

## Wireframes (UI scopes only, light)

None. There is no UI scope.

## Living-spec deviations log

- 2026-11-24 (/build P3): the worker also added a top-level duplicate-key check to the dispatch input and turned unknown or duplicate dispatch keys into the `dispatch` usage error (exit 2). This was unplanned; the scan is linear over the coordinator's bounded input file. Flagged for /audit.
- 2026-11-24 (/build P2): the interleaved-dispatch test simulates a stale read, because the production mutation lock does not block. `admit` runs on the same `list()` as the capacity and overlap checks.
- 2026-11-24 (/build P4): the stuck attempt `r5c-1` (from the orca-api pitch, report refused for a `.project` path, Orca worker `succeeded` and released) held the grader, dataset and `orca-vendors.md` paths, so the overlap guard refused P4. The owner approved settling it. It was settled through `orca-ledger.mts` `update` (`launched` to `settled`). That followup is resolved.
- 2026-11-24 (/build C1): the mutant tests used `Bun.Transpiler`, which does not exist under Node. One of them was pre-existing and failed under Node at HEAD. They now import the mutant from a temporary `.mts` (`importMutant`), and 226 of 226 pass on both runtimes.
- Live evidence: P2 used `assign` with the old round-robin and got opencode. P4 used `assign` with `runId` and got codex (all loads 0, tie-break). Smoke s1 got claude (tie). Smoke s2 used planIndex 3, where round-robin would give codex; the pick was **opencode** because it had the least load.
- 2026-11-24 (/audit): two cycles by Orca workers, spread by hand over codex, claude and opencode. No must-fix. Fixed S1 to S5; S6 deferred to ship. The first dispatch of a Run now gets the load re-check, and only a pick made by load is re-checked. Record: `.project/analysis/2026-11-24-orca-balanced-role-pools-audit.md`.

# Pitch: orca-balanced-role-pools

**Date**: 2026-11-24  •  **Appetite**: big-batch
**Stack**: backend (Orca coordination: `orca-assign.mts`, `orca-dispatch.mts`, `orca-ledger.mts`, `orca-run.mts`) + ai-prompts (coordinator playbook guidance)

## Problem

With `implementation: codex, claude, opencode` and `review: codex, opencode`, the owner expects Orca work to be spread across every worker and both roles. It isn't:

- **Nobody uses the pools.** The coordinator names `vendor` by hand on every dispatch. In the `state-project-depth` session, 16 dispatches went 9 to codex, 7 to claude and **0 to opencode**.
- **The pools don't balance even when used.** `assign` picks by plan position only (`planIndex % pool`). For a reviewer it picks from the pool minus the implementer. Over a plan, the shared member (opencode, which is in both pools) gets about twice the work of the others. A review never considers how much a vendor already implemented.

## Knowledge consulted

- `records/shipped/orca-role-pools.md` and `records/legacy-upgrades/orca-role-pools.md` — **constrain and supersede in part.**
  - That pitch built pools with a deterministic, resumable round-robin.
  - It listed "load scheduling" as a **no-go**. This pitch lifts that no-go for one narrow thing: a deterministic, ledger-based least-load pick. It is not dynamic swarm scheduling.
  - Kept as-is:
    - The recorded ledger owner always wins, so resume never reassigns.
    - Rotation happens only after a proven-clean failure.
    - A reviewer is never the implementer.
    - The overlap guard at `reserve`.
- [patterns/an-ownership-predicate-must-mirror-the-claim-transactions-set] — **constrains load counting.** "Load" must use the same owning set as `reserve()` and `resolveAssignment` (`claimed`, `launched`, `unknown-liveness`, `completed`, settled-with-report). A proven-clean failure is a tried vendor, not load.
- [patterns/retry-only-on-positive-proof-of-a-clean-failure] — **unchanged.** Balancing never moves a task that has an owner, and never retries.
- [decisions/unified-toon-config-schema-v2] and issue [a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version] — **constrain config.** A new config key spreads to the schema, the migrator and their tests (R5a of the last Orca pitch hit 8 or more files). Balancing is therefore the default behaviour, **not a new setting**.
- Memory "OpenCode port before dispatch" and `orca-vendors.md` § "OpenCode port before the first OpenCode worker": once opencode is actually picked, the coordinator must free OpenCode's port first. `orca-run.mts` already has `prepareOpencode()`.
- Issue [a-hand-written-fixture-lags-when-the-contract-grows] — the grader's mode map and counts must move with the new case. This was done at shape: the case `role-pools-balance-load-across-roles` is in the dataset as `parses-only`.

## Solution sketch (breadboard, NOT wireframe)

**Re-shaped after critique (owner: one pitch, cut).** Two cuts, made for the 15-file cap:
- **Optional `reviewOf` is out.** Pitch-level reviewers (critique, audit) stay named by hand. This is a followup.
- **The `orca-run status` load view is out.**

Two design changes, from critique K1, K2 and K6:
- **The Run id comes from the coordinator.** It verified the Run at phase start, so it passes the id in as input, and dispatch makes no `run-current` call. That leaves no contract-snapshot change and no live CLI call.
- **The guidance has one owner**, `orca-vendors.md` (K4/K5). `2-build.md` only points to it.

**Places**
1. `orca-assign.mts`: the pure picker.
2. `orca-dispatch.mts` `resolveAssignment`: computes load from the ledger.
3. `orca-ledger.mts`: a record gains an optional, set-once `runId`.
4. `orca-run.mts dispatch`: input parsing, plus an optional `runId` field (a strict token).
5. Coordinator guidance: `orca-vendors.md` § Dispatch core owns it, and the build phase doc's Orca section has a one-line pointer.
6. The golden eval case, expanded and made to execute.

**Affordances**
- **Least-load pick.** `pickImplementer` and `pickReviewer` take `load: Map<vendor, number>`. Among the eligible members (pool minus skip, minus the implementer for a review), the lowest load wins. A tie goes to plan position (`planIndex` rotation), which keeps today's order when loads are equal. The function stays pure and deterministic for a given ledger.
- **Load = this Run's owning attempts per vendor, across both roles.** `resolveAssignment` counts the ledger records with the current `runId` that are in the owning set. Records from other Runs, or without a `runId`, count 0. That keeps old ledgers harmless.
- **`runId` in the dispatch input and the ledger.**
  - The coordinator passes the Run id it verified at phase start (`verify-run-binding-before-orca-dispatch`).
  - It must match `^run_[a-z0-9]{6,32}$`. Anything else is refused with `invalid-run-id` before any side effect (`a-receipt-field-reaches-a-reason-only-as-a-bounded-token`).
  - It is stored set-once at claim.
  - When it is absent, load counts live attempts only (`claimed`, `launched`, `unknown-liveness`): still a signal, never a block.
- **The coordinator uses `assign` by default.** The guidance says to dispatch scopes with `assign: { role: "implementation", planIndex }` and reviewers with `role: "review"`. Name a `vendor` only when the owner names one, or when a scope needs a specific vendor (for example the real-Archify loop), and record the reason. Explicit `vendor` stays fully supported.
- **Fairness under concurrency (S1).** The pick is made inside the same lock as `reserve()`'s claim, so two dispatches cannot read the same load. If that cannot be done cleanly, it is accepted and documented for a sequential coordinator. `/plan` decides.

**Connections**
Coordinator, then `orca-run dispatch` with `assign`, then `resolveAssignment`:
1. The recorded owner wins.
2. Otherwise, a clean failure rotates.
3. Otherwise, a least-load pick, with load taken from the ledger for this `runId`.

Then the launch gate as today, then a claim with `runId`.

## Rabbit holes

**Resolved here**
- **Determinism and resume.** The pick is a pure function of (pool, skip, implementer, planIndex, load). Load comes from the ledger, so a replay computes the same answer. A task with an owner is never re-picked.
- **What counts as load.** The owning set mirrors `reserve()`. Proven-clean failures do not count. Other Runs do not count.
- **Unequal pools (claude only implements).** No promise of an equal total per vendor. The invariant is greedy fairness at every pick: the chosen vendor has the lowest load among the members eligible *for that role*. Claude therefore takes more implementations while codex and opencode share the reviews. The golden case checks this invariant, not equal totals.
- **No new config key.** Balancing replaces the plan-position round-robin as the default, and the old order is the tie-break.

**Pushed to /plan as risk**
- **The guidance change is model behaviour.** It cannot be graded deterministically (E2), so it is checked two ways. A contract test asserts that `orca-vendors.md` owns the "use `assign`" rule and that `2-build.md` points to it. In `/build`, the coordinator dispatches its own scopes with `assign` (live check), including **at least one assign-picked opencode worker** (K3).
- **The golden case (E1, E3–E6).** It must hold:
  - a current-Run ownership-state matrix (settled with a report counts, a settled clean failure does not, unknown-liveness counts and is never moved);
  - a clean failure and an uncertain launch mid-sequence;
  - explicit Run ids (current, other, missing) and explicit `planIndex`/`skip`;
  - a degenerate pool;
  - an explicit-vendor dispatch.

  The case is rewritten at `/plan` and executed by the grader. If the grader work overruns, it stays parses-only plus unit tests (A6).
- **The pick inside the claim lock** (S1): see above.
- **OpenCode in rotation.** The first real opencode pick needs the port step. The plan confirms that `prepareOpencode()` runs on an `assign`-picked opencode as it does on a named one.

**Pushed to no-go**
- Optional `reviewOf` and balanced pitch-level reviewers (cut, followup). Also the `orca-run status` load view (cut).
- Task and attempt keys gaining a Run identity (S2: an older Run's `S1` is inherited). This is pre-existing and not caused by balancing; it becomes a followup.
- Lookahead or whole-plan optimal assignment, and weights per vendor or role.
- Dynamic scaling, work stealing, or moving an owned task.
- Cost- or model-aware routing.

## No-gos (this pitch)

- ✗ No change to launch authority, the gate, retries, rotation-after-clean-failure or the overlap guard.
- ✗ No new config key or schema version. The pools stay as configured.
- ✗ An owned or recorded task is never reassigned.
- ✗ No ledger migration. `runId` is optional and set once. Old records stay valid and count as another Run.
- ✗ No playbook text duplicated into every SKILL's Orca block. `orca-vendors.md` owns the guidance, and `2-build.md` only points to it.
- ✗ No new Orca CLI call. The Run id is coordinator input.
- **Sequencing (X1).** The uncommitted 2.53.0 (`state-project-depth`) lands or is committed before this pitch's release bump.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Ran 2026-11-24 as five Orca workers under Run `run_911f7939687b`, spread by hand: knowledge-historian and cross-pitch-projector on **opencode**, skeptic and eval-regression-projector on codex, appetite-auditor on claude. All five were collected and released. 29 rows were condensed below; the IDs are the reviewers' own.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| A1/A2/A3 | appetite-auditor | high | scope-overrun | About 21 files and 1,300–1,600 LOC against caps of 15 and 1,500. The ledger `runId` touches every ledger and dispatch fixture; `run-current` adds a contract-snapshot change. **Split**: an engine bet plus a small guidance bet, or cut. |
| A4 | appetite-auditor | medium | scope-creep | Optional `reviewOf` changes `orca-run.mts:233` and `orca-dispatch.mts:138`. It is only needed for pitch-level reviewers. (Note: those reviewers were 12 of the 16 hand-named dispatches in the measured session, so it does matter.) |
| A5 | appetite-auditor | low | doc-surface | Only `2-build.md` and `3-audit.md` (and `4-ship.md`) have Orca blocks. There is no critique phase doc, so the critique skill and its mirrors would add files. |
| K1 | knowledge-historian | high | missed-pattern | `verify-run-binding-before-orca-dispatch`: the Run is verified (objective and coordinator) at phase start. Do not let dispatch silently accept a null or mismatched Run. |
| K2 | knowledge-historian | high | missed-pattern | `a-doctor-check-stays-offline-…`: a new CLI call (`run-current`) must enter the contract snapshot and be checked offline. |
| K6 | knowledge-historian | medium | missed-pattern | `a-receipt-field-reaches-a-reason-only-as-a-bounded-token`: a `runId` from any source must be a closed-shape token, and malformed means absent. |
| K3 | knowledge-historian | medium | missed-issue | `orca-workers-differ-from-the-coordinator-environment`: run a live smoke with at least one assign-picked **opencode** dispatch in `/build`. |
| K4/K5 | knowledge-historian | medium | missed-pattern | `one-owner-per-instruction-topic-guarded-by-contract-tests`, `instruction-copies-drift-into-contradictions`: `orca-vendors.md` owns the "use `assign`" rule. Phase docs only point to it, and a contract test guards that. |
| S1 | skeptic | medium | rabbit-hole | The least-load pick runs outside the claim lock, so two concurrent dispatches can read the same load and pick the same vendor. Pick inside the `reserve` transaction, or accept this for sequential coordinators. |
| S2 | skeptic | medium | rabbit-hole | Task and attempt keys carry no Run identity, so a new Run reusing `S1` inherits an old Run's owner and retry history. This is pre-existing, and Run-scoped load does not fix it. |
| E1/E4 | eval-regression-projector | high | golden-blind-spot | The golden case needs a current-Run ownership-state matrix (settled-with-report vs settled clean failure, unknown-liveness as load) and a clean failure plus an uncertain launch mid-sequence. |
| E3/E5 | eval-regression-projector | medium | input gap | Explicit Run ids (current, other, missing), explicit `planIndex` and `skip`, and a degenerate pool. |
| E2/E6 | eval-regression-projector | medium–high | criterion gap | `coordinatorUsesAssignByDefault` cannot be graded deterministically: make it a docs contract test plus a live check. Add an explicit-vendor dispatch and an assigned-opencode port preparation to the case. |
| X1 | cross-pitch-projector | high | projected-conflict | `CHANGELOG.md`/`VERSION` are shared with `state-project-depth` (shipped, uncommitted). Commit and land that first, then bump. |
| X2 | cross-pitch-projector | medium | adjacent | Records without `runId` (all of state-project-depth's) must count as another Run. That is already a no-go; keep the test. |
| X3 | cross-pitch-projector | low | acknowledged | No contention with the other three active pitches. |

## Bet decision

☑ **Bet** (→ /plan), 2026-11-24, after one re-shape in which the owner chose "one pitch, cut".
- **Addressed in the pitch:** A1–A5 (cut to about 15 files), K1, K2 and K6 (Run id from the coordinator, no CLI call), K4/K5 (one owner and a pointer), X1 (sequencing), X2 (no-`runId` records count as another Run).
- **Carried to /plan:** S1 (pick under the claim lock), E1–E6 (the golden case rewrite), K3 (an assign-picked opencode live dispatch), A6 (grader budget).
- **Deferred:** S2 (Run identity in task keys) and pitch-level reviewers with pools. Both become followups.
☐ Re-shape — named gap:
☐ Pass — moved to `.project/pitches/_parked/orca-balanced-role-pools/`; reason:

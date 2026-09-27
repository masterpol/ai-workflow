# Plan: Native safety feasibility

**Pitch**: pitch.md • **Appetite**: small-batch • **Hill**: hill.md

## Scope

All deliverables live under `.project/analysis/native-safety-feasibility/`; no shared production code changes. Workflow bookkeeping is separate from the four-file deliverable budget.

| ID | Name | Files (relative to deliverable directory) | LOC estimate | Depends on | Parallel with | Subagent? | Model |
|---|---|---|---|---|---|---|---|
| S1 | Primitive experiments and recommendation | `bench.py`, `bench.test.js`, `evidence.json`, `report.md` | ≤400 total | — | — | No; one coordinated subprocess protocol and evidence set | — |

## S1 exit criteria

- `node --test .project/analysis/native-safety-feasibility/bench.test.js` exits 0. Use explicit pipe/barrier coordination, isolated temporary fixtures, child deadlines ≤5 seconds and test deadlines ≤30 seconds; clean up descendants and fixtures on failure. Do not infer ordering from sleeps.
- Tests exercise directory-relative open/rename/unlink across symlink swaps, leaf symlink refusal, and movement of an already-open directory outside the project. Record the exact guarantee and any demonstrated escape; a negative feasibility result can pass the spike.
- Tests exercise a paused lock holder, bounded nonblocking contention, holder death, helper/parent death, timeout cleanup, and lock inode replacement. Record that legacy noncooperating writers and hostile replacement cannot be covered by cooperative advisory locking.
- Tests validate `evidence.json`: host/runtime/API capabilities, each scenario's observed outcome, bounded completion, and platform coverage. Missing capabilities produce explicit unsupported results; Linux stays unverified unless executed there. No installation or unsafe fallback.
- Tests check `report.md` contains recommendations for both incomplete pitches, separates observations from hypotheses, and states required runtime/platform contracts and future integration appetite. Neither parent scope becomes done from this spike.
- `git diff --check` exits 0. Apply security §9 and testing rules: bounded inputs, operation-level ownership evidence, deterministic failure tests. No UI or AI-prompt scope; no build command exists for this repository.

## Risks inherited from the pitch

| Risk | Scope | Spike needed? | Mitigation |
|---|---|---|---|
| Captured directory moves outside root | S1 | Yes | Demonstrate movement at a barrier; distinguish symlink refusal from continuous containment. |
| Crashes, timeout, legacy collector overlap | S1 | Yes | Kill coordinated subprocesses; verify release and cleanup; document all-writer cooperation prerequisite. |
| Linux and unsupported platforms | S1 | Yes | Capability probe and explicit coverage ledger; no portable guarantee from macOS evidence. |
| Lock inode replaced by same-user actor | S1 | Yes | Demonstrate split ownership; keep normal lock inode stable and state threat boundary. |

Execute S1 sequentially. `/impact` is unnecessary: scratch-only new files with no production consumers. Preserve concurrent review edits and historical records. Approval authorizes these behavior experiments; production changes require a subsequent plan.

## Living-spec deviations

None at planning.

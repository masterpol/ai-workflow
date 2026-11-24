# Audit: orca-balanced-role-pools

Appetite: big-batch, cap 3 cycles (2 used).

**Dispatched as Orca workers** under Run `run_911f7939687b`, spread by hand across the three configured vendors:
- Cycle 1: security (claude), code (codex), test-coverage (opencode), cross-pitch (claude).
- Cycle 2, narrow: security (codex) and code (opencode).

**Why by hand:** pitch-level reviewers have no `reviewOf` scope, so the pools cannot pick them yet. That limit was cut from this pitch and is a followup.

**Independence:** `independent: no` for every role. The workers reviewed the repository read-only, not scratch copies, so no canary was planted. A clean report is therefore not proof of a clean audit on its own. The coordinator re-verified every finding against the code, and most fixes were also checked with a mutant. The test-coverage reviewer's report of "0 findings, 15 mutants caught" is not independent evidence. The cycle-1 code review found that one of the tests it counted (the ledger admit "mutant") never changed any code.

**Workers:** all 6 were collected (`worker_done`) and released, and no worker terminal is left open. After the Claude Code restart, a released opencode worker from the build (smoke `s2`) re-created its scratch file `orca-smoke/obrp-s2.md` and sent a `worker_done` that Orca rejected, because the sender was not the process that owns that dispatch. The stray file was removed. This shows that a released worker's terminal can come back after a restart, and the ledger rejected it correctly.

## Must-fix (blocks /ship)

None.

## Should-fix

| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| S1 | code C1-1 | `orca-dispatch.mts:261` | The first dispatch of a Run has no ledger directory. `admit` stayed unset, so a competing claim between the pick and the claim was not caught. The reviewer's reproduction showed codex ending at load 2 while opencode stayed at 0. | **fixed.** A missing ledger directory is an empty history and still gets `admit`. A new test injects a competing claim at the lock, and a mutant that restores the old condition fails it. |
| S2 | code C1-2 | `orca-ledger.test.mts:650` | The test named "mutant: dropping the admit callback" only re-imported the intact code, so it proved nothing. | **fixed.** It now asserts that the guard is in the source, removes it, asserts the source changed, and asserts that the mutant claims instead of returning `load-changed`. |
| S3 | code C1-3 | `orca-dispatch.test.mts:1157` | `LedgerRecord` was used without being imported (transpilation hid it). | **fixed.** `import type` added. |
| S4 | security C1-1 | `orca-dispatch.mts:303` | The re-pick path deleted a library caller's `agentId` for non-OpenCode vendors, while the first path kept it. Not reachable from the CLI. | **fixed.** The caller's value is restored. |
| S5 | security C1-3 | `orca-dispatch.mts:162-263` | `admit` was built for every pick, including a clean-failure rotation and a recorded owner. A rotation, which is chosen by pool order, could fail the minimum-load check and cause a spurious `load-changed`, a second assignment resolution and a second installed-agent probe. | **fixed.** `resolveAssignment` marks a pick made by load as `balanced`, and only that pick is re-checked. A test counts the installed-agent reads (2 with the fix, 3 with the old behaviour). The existing assignment tests now assert `balanced` for fresh picks. |
| S6 | cross-pitch C1 | branch | The branch also carries commit `4a46383` (state-project-depth, 2.53.0), which is not in `main`, so `git diff main` shows 54 files, not 18. 2.54.0 is stacked on 2.53.0. | **defer to ship:** open the PR after the state-project-depth PR merges, or say in the PR that 2.53.0 rides along. Review against `HEAD`. |

## Acknowledged

- **Balancing fails open** when the ledger cannot be listed. `reserve` still refuses on ownership, capacity and overlap. Documented in `orca-vendors.md`.
- **`runId` is not verified against Orca.** A fresh id per dispatch resets load to zero and gives plain rotation. It can never move an owned task. Documented; a followup could have the run helper supply the id.
- **Nested duplicate keys** in the dispatch input are not refused, only top-level ones. Every nested value is still validated. Documented.
- **Exit code for dispatch key errors** changed from 3 to 2 (usage), including a bad `runId`. Documented in `orca-vendors.md`.
- The interleaved-dispatch tests simulate a stale read, because the production mutation lock does not block (recorded deviation).

## Refused or dropped

None. All findings held on re-reading.

## Evidence (author-run)

- **Orca test files:** 228 of 228 pass under Bun and under Node (`orca-assign`, `orca-ledger`, `orca-dispatch`, `orca-run`, `orca-eval-grader`).
- **Mutants that fail their test:** removing the missing-ledger condition (first-dispatch test); building `admit` for every pick (rotation test: 3 installed-agent reads instead of 2); the real ledger admit mutant.
- **Checks:** doctor READY; docs links pass; the grader shows 9 of 9 executed cases passing.
- **Cycle 2 reviews:** no new findings from either reviewer, and all five cycle-1 findings that needed a code fix are fixed.

## Review records
### Security review, cycles 1 and 2
independent: no
canary: none (Orca workers reviewing the repo read-only)
read-only: verified by review-bench guard snapshot/check before each cycle. The only changes found were the coordinator's own fixes made after cycle 1's reports returned; the reviewers wrote only to `audit-out/` (outside the guarded roots). The checks ran after the fixes, so separation rests on timing, not on a clean diff.
prompt-sha256: 32b8c9bc6e31a4f3ce0d79239187fde10f7aeffa5db356f2f21096f3960a4242 (c1), f150c2fb4288a60ac42fe7eb3e5229a19484ce20651bd13020737fbf3ca4c100 (c2)
model: claude (c1) and codex (c2), Orca worker vendor defaults
cross-file interactions: reviewed (dispatch ↔ ledger ↔ run input ↔ launch gate; docs ↔ behaviour)
Checklist: security.md section 9 and the three named patterns, walked item by item. Proofs under /private/tmp. Not reviewed in c1: the dispatch and grader test files were not run by this reviewer (budget); the coordinator ran them.

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix | orca-dispatch.mts:303 | the re-pick drops a library caller's agentId | confirmed by reading; fixed (S4) |
| 2 | acknowledged | orca-dispatch.mts:261-263 | balancing fails open when the list is not ok | confirmed; documented |
| 3 | should-fix | orca-dispatch.mts:162-263 | admit also built for rotation and recorded-owner picks | confirmed by reading and a probe-count test; fixed (S5) |
| 4 | acknowledged | orca-run.mts, orca-dispatch.mts:223 | runId shape-checked only | confirmed; documented |
| 5 | acknowledged | orca-run.mts:190-207 | only top-level duplicate keys are refused | confirmed; documented |
| 6 | acknowledged | orca-run.mts:240 | dispatch key errors exit 2 instead of 3 | confirmed; documented |
| 7 | — | c2 | all named cycle-1 findings fixed; no new defects | consistent with the new tests |

### Code review, cycles 1 and 2
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check (as above)
prompt-sha256: e19be60fa9c3d0fb889d256ef749bb0a3d4fbc4d194e079ea449edce26e8105b (c1), 70d611dbd06b81a7944942c45c42a149876f6a2f660c77c0f3b457eb78ff2141 (c2)
model: codex (c1) and opencode (c2), Orca worker vendor defaults
cross-file interactions: reviewed (picker, loadOf and reserve ownership sets; the claim path; the OpenCode resolution duplicated in the re-pick branch; orca-run exit codes; docs and the contract test)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix | orca-dispatch.mts:261 | no admission on the first dispatch | reproduced by the reviewer with an injected competing claim; fixed (S1) |
| 2 | should-fix | orca-ledger.test.mts:650 | the "mutant" test never mutates | confirmed by inspection and a name-filtered run; fixed (S2) |
| 3 | should-fix | orca-dispatch.test.mts:1157 | `LedgerRecord` not imported | confirmed by search; fixed (S3) |
| 4 | — | c2 | all five cycle-1 findings fixed; no new defects | consistent with the tests |

### Test coverage, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check; mutants ran in a copy under /private/tmp
prompt-sha256: e245f397c0f3847847c70ae75803a4f65895369bd583635a09864d49f403d298
model: opencode, Orca worker vendor default
cross-file interactions: reviewed (every exit criterion of P1 to P4 and C1 mapped to a test)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | — | — | 0 findings; 15 mutants (3 per changed source file) caught | not independently confirmed; the code reviewer found a counted test that mutated nothing (S2), so the count is weaker than it reads |

### Cross-pitch, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check
prompt-sha256: 5a9b36f3b33d8eef6b8f594b3258c17471dc6647b351050255837672f5cd94a1
model: claude, Orca worker vendor default
cross-file interactions: reviewed (this diff against the plans and pitches of the three other active pitches)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix | branch | the branch carries commit 4a46383 (state-project-depth), so `git diff main` is polluted | confirmed with `git log main..HEAD`; deferred to ship (S6) |
| 2 | nit | VERSION, CHANGELOG.md | 2.54.0 is stacked on the unmerged 2.53.0 | confirmed; merge in order |
| 3 | — | — | the other three active pitches are disjoint | consistent with their files |

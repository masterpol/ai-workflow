# Audit — orca-role-pools

Appetite big-batch (cap 3 cycles). Cycles run: 2. Must-fix open at end: 0.

## Cycle 1 — 2026-10-16

Dispatched: security (1, sonnet, independent: yes) | code (1, sonnet, independent: yes) | test (1, sonnet, independent: yes) | cross-pitch (1, haiku, independent: yes, no canary: read-only comparison) | ux (n/a) | eval (n/a) | i18n (n/a)
Independence: each reviewer got a fresh scratch copy of the 106 source/test files (`review-bench.mts prepare`), a planted canary that breaks a scratch test, and no earlier findings. Canaries caught: security (state set in `resolveAssignment`), code (`live` guard in ledger `reserve`), test (same `live` guard). The code and test reviewers shared one scratch tree, so the test reviewer's `+live` repair mid-run was visible to the code reviewer; both still reported the canary. Cross-file interactions: reviewed (callers of `report().roles`, `dispatchWithRetries` assign passthrough, CLI assign vs `prepareOpencode`, `reserve` vs `resolveAssignment` race). read-only: guard snapshot/check (`review-bench.mts guard`); changed files since snapshot were only the author's own and a concurrent session's `workflow-doctor.mts`. Prompt: the template in `3-audit.md`, per-role Contract/Checklist lines; SHA-256 of the exact texts was not recorded (gap).

### Must-fix (verified)
| ID | Source | File | Issue | Verified | Cycle |
|----|--------|------|-------|----------|-------|
| M1 | code | `orca-dispatch.mts` `resolveAssignment` (`owner = state !== "failed"`) | A failed attempt later `settled` counted as the task's owner: rotation never moved on and `reserve` (settled is not task-owned) relaunched the failed vendor | yes: reproduced, `failed -> settled` is a legal transition; new test fails against the old code | 1 |

Fixed: `holds()` mirrors `reserve()`'s task-owned set plus settled-with-`reportId`; a failed (even later settled) attempt is a tried vendor. Evidence: `node --test orca-dispatch.test.mts` 84 pass / 0 fail; mutant restoring the old predicate fails 2 tests (restored).

### Should-fix
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| S1 | code | `orca-run.mts` prepareOpencode default | Assigned dispatch freed the port whenever `workers` had opencode, not the role pool | fixed + test (`never inspects OpenCode's port`) |
| S2 | test | `orca-dispatch.mts` resolveAssignment | 30 surviving mutants: ledger refused/corrupt, shape validation, full-history rotation, skip handling, review lookup, humanAction text, coordinator selection | fixed: 11 new direct tests; 5 spot-mutants re-run and killed |
| S3 | test | `orca-ledger.mts` | no test for settled/failed overlap or legacy record without authorizedPaths | fixed (test) |
| S4 | test | `orca-policy.mts` | empty/duplicate/non-string pool members only covered via config | fixed (direct validatePolicy test) |
| S5 | code | `orca-eval-grader.mts` | cap not range-checked; failed pick became vendor `""` | fixed: throws; test over 0, 17, 2.5, "4" |
| S6 | code | `orca-dispatch.test.mts` | retry-cap vs pool-exhaustion assertion ambiguous | fixed: exact reasons, third dispatch proves `pool-exhausted` |

### Acknowledged (logged for /cooldown)
- Path overlap is case-sensitive; on case-insensitive filesystems (macOS default) two live writers could own `Src/` and `src/`. Integration (`orca-apply`) still refuses true overlap. Candidate hardening: reject case variants in `validAuthorizedPaths`.
- `orca-start` defensive branches for non-array pools / `no-workers` / `worker-policy-ineligible` are unreachable through a validated policy (mutants survive); kept as defense in depth.
- `resolveAssignment`'s `planIndex >= 0` check is redundant with `pickImplementer`'s own validation (equivalent mutant).
- `skip` in `assign` has no length bound beyond the 64 KiB input cap.
- Pools are distinct vendors (max 3); concurrency above 3 live workers is unverified (S4 skipped).
- `orca-eval-grader.test.mts` could not run in the scratch copy (no `.project/` dataset); verified in the repo instead (16 pass).
- Cross-pitch: X1 `VERSION`/`CHANGELOG` collision with agent-model-sweep's 2.28.0 — resolved by order (this pitch's 2.27.0 committed first); X2 vendor-model-toon's open migrator incident is closed by `eb549ff`; workflow-v3-rollout must plan for (a) no in-place v2→v3 conversion (reader message promises one), (b) preflight now probes every pool member, (c) release numbering.

### False positives
None. The "must-fix" findings of the security and test reviewers were their planted canaries (scratch only), recorded as canary catches.

## Cycle 2 — narrow re-check (code reviewer only)

Dispatched: code (1, sonnet, independent: yes; fresh scratch copy, new canary: `unknown-liveness` dropped from `holds`). Canary caught by the reviewer and by the new test `every non-failed holder keeps its vendor`. This also exposed a real gap in cycle 1's fix (no test for `unknown-liveness` as a holder), closed before the dispatch. No new findings. Reviewer note acknowledged: the holder-state test is a loop plus one case, not one table.

## Evidence (after cycle 2)
- Full suite: 1626 pass / 4 fail / 3 skipped. Failures: 3 x `runtime/upgrade.test.mts` (agent-model-sweep doctor, not this pitch) + `mutant-7-regexpBacktracking-quotedCommas` (timing flake under load; passes alone). Bun not run.
- `setup-validator` READY; `graphify --check` clean; `workflow-doctor` READY WITH WARNINGS (1, pre-existing "Runtime boundary: tests").
- Ledger schema unchanged (asserted by test). Launch authority path unchanged (gate on coordinator identity, before and after resolution).

## Incident
The local gitignored `ai-workflow.toon` vanished during the audit (not removed by any step here; the doctor tests that delete it use temp dirs). Restored from `ai-framework/templates/ai-workflow.example.toon` with cap 4 and a single-member implementation role, matching what was seen earlier. Cause unknown; another session shares this checkout.

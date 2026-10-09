# Shipped: orca-vendor-reconcile-integration

Bet: 2026-10-08. Shipped: 2026-10-08; user approved audit and ship. Appetite: big-batch (16 files vs cap 15, overrun accepted with the CLI choice). Release: 2.17.0.

## Final verification

| Step | Result |
|---|---|
| Build / typecheck / lint / i18n | Not applicable: no such command in this repo (`stack.md`) |
| Tests | Node 1045 pass, 0 fail, 1 skipped (clean export: 1041 pass, 1 fail, 4 skipped; the failure is the pre-existing caveman-install test, also failing at HEAD); Bun 1017 pass, 0 fail, 1 skipped on a clean run (earlier runs right after the Node suite showed 1 and 4 unidentified failures that did not reproduce; see followups) |
| Workflow checks | `workflow-doctor.mts` READY, `setup-validator.mts` READY, `graphify.mts` CLEAN |
| Diff | No secrets; all wiring is inert unless `AI_WORKFLOW_ORCA_MULTI_AGENT=true` |

## Reconciliation

| Scope | Status | Evidence |
|---|---|---|
| I1 thin CLI | shipped | `orca-run.mts` + 17 tests (Node and Bun); parity with the libraries, fixed check catalog, bounded no-symlink input |
| I2 executable grader | shipped | `orca-eval-grader.mts` + 10 tests; 7 executed cases pass, 1 parse-only, 3 live-only (not-run); mutants red; no combined count |
| I3 phase wiring | shipped | opt-in blocks in build, audit, ship (claude, cursor byte-equal) and `3-audit.md`, `4-ship.md`; stale "separate capability" sentence fixed |
| I4 docs, dataset, release | shipped | `orca-vendors.md` CLI/grader/smoke section; `dispatchBetReady` corrected; hostile-summary case added; v2.17.0 |
| Live smoke | partial | Claude observed; Codex and OpenCode not-run (no funds); peer messaging not-run. Nothing counts not-run as pass |

## Audit

One cycle: code and security reviewers, independent (canary caught), 0 must-fix. One should-fix (grader dataset reader hardened, test added). Others acknowledged in `deviations.md`. Test-coverage check was author-run, not independent.

## No-gos honored

No command text from agents, no gate auto-advance, no guard repeated in the CLI, no live proof claimed for Codex/OpenCode.

## Followups

See `_followups.md` (orca-vendor-reconcile-integration 2026-10-08).

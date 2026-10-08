# Shipped: orca-vendor-reconcile (reconcile-core)

Bet: 2026-10-08. Shipped: 2026-10-08; user approved audit and [1] ship. Appetite: big-batch, accepted overrun (~2400 LOC vs the 1500 cap, D1). Releases: 2.15.0 and 2.15.1.

## Final verification

| Step | Result |
|---|---|
| Build / typecheck / lint / i18n | Not applicable: no such command in this repo (`stack.md`) |
| Tests | Node 982/982; Bun 966 pass, 0 fail on the final run (earlier full-run Bun failures were another session's half-written file and a collector-lease flake under load) |
| Workflow checks | `workflow-doctor.mts` READY, `setup-validator.mts` READY, `graphify.mts` CLEAN, `docs-links.mts` 0 broken |
| Diff | No secrets; reconcile is a library, off unless `AI_WORKFLOW_ORCA_MULTI_AGENT=true`, wired into no phase |

## Reconciliation

| Scope | Status | Evidence |
|---|---|---|
| R1 diff admission | shipped | `orca-diff-admit.mts` + 31 tests |
| R2 snapshot, apply, rollback | shipped | `orca-apply.mts` + 20 tests (check-first, touched-path rollback, hidden-edit and filter guards) |
| R3 evidence and cleanup | shipped | `orca-evidence.mts` + 19 tests (hash-verified evidence, positive-proof cleanup, re-checked at perform) |
| R4 reconcile orchestration | shipped | `orca-reconcile.mts` + 38 tests (real git repos and worktrees) |
| R5 release | shipped | docs in `orca-vendors.md`, CHANGELOG 2.15.0 / 2.15.1 |

## Audit

Three cycles: 8, 4 and 1 must-fix findings, all fixed; the final cycle-3 fixes were not independently re-reviewed. Reviewers were independent with caught canaries (opus security, sonnet code and coverage). Incident D2: an R2 subagent ran `git reset --hard` in the real repo and recovered it (rule: subagents never run destructive git outside scratch repos).

## No-gos honored

No scheduler, remote support, forced parallelism, permission bypass, automatic commits or publication; no phase wiring or grader (that is `orca-vendor-reconcile-integration`).

## Followups

See `_followups.md` (orca-vendor-reconcile 2026-10-08).

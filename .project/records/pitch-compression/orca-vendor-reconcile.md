# Compaction record: orca-vendor-reconcile

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded]], [[prove-a-guard-test-with-an-in-memory-mutant]], [[keep-the-fakes-guarantee-the-thing-they-replace]].

## Section 1: SHIPPED.md#final-verification

Node 982/982; Bun 966 pass, 0 fail on the final run (earlier Bun failures were another session's half-written file and a collector-lease flake under load). workflow-doctor and setup-validator READY, graphify CLEAN, docs-links 0 broken. Reconcile is a library, off unless `AI_WORKFLOW_ORCA_MULTI_AGENT=true`, wired into no phase at ship time.

## Section 2: SHIPPED.md#reconciliation

R1 diff admission `orca-diff-admit.mts` (31 tests). R2 snapshot, apply, rollback `orca-apply.mts` (20 tests; check-first, touched-path rollback, hidden-edit and filter guards). R3 evidence and cleanup `orca-evidence.mts` (19 tests; hash-verified evidence, positive-proof cleanup re-checked at perform). R4 orchestration `orca-reconcile.mts` (38 tests on real git repos and worktrees). R5 release (docs in `orca-vendors.md`, CHANGELOG 2.15.0 and 2.15.1).

## Section 3: SHIPPED.md#audit

Three cycles with 8, 4 and 1 must-fix findings, all fixed; the cycle-3 fixes were not independently re-reviewed at the time (a later independent re-review passed with five should-fix items, shipped in the follow-up commit). Reviewers independent with caught canaries. Incident D2: an R2 subagent ran `git reset --hard` in the real repo and recovered it; rule: subagents never run destructive git outside scratch repos.

## Section 4: SHIPPED.md#no-gos-honored

No scheduler, remote support, forced parallelism, permission bypass, automatic commits or publication; no phase wiring or grader (done in `orca-vendor-reconcile-integration`).

## Section 5: SHIPPED.md#followups

Tracked in `_followups.md` under orca-vendor-reconcile 2026-10-08.

## Section 6: pitch.md#no-gos

As dispatch-core: no scheduler, remote support, forced parallelism, permission bypass, automatic commits or publication.

## Section 7: pitch.md#rabbit-holes

Baseline and dirty-work attribution; symlink-safe evidence copy; settlement proven before cleanup and reassignment; coordinator-only verification. Related knowledge: false cross-pitch attribution in a shared uncommitted file, and a gate must not trust its own author.

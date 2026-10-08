# Compaction record: orca-vendor-dispatch

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[retry-only-on-positive-proof-of-a-clean-failure]], [[a-gate-spawns-exactly-what-it-probed]], [[prove-a-guard-test-with-an-in-memory-mutant]].

## Section 1: SHIPPED.md#final-verification

Node 846/846; Bun 817 pass, 0 fail. workflow-doctor and setup-validator READY, graphify CLEAN, docs-links 0 broken. No build/typecheck/lint/i18n commands exist in this repo. No secrets; dispatch is off unless `AI_WORKFLOW_ORCA_MULTI_AGENT=true` and an opted-in policy.

## Section 2: SHIPPED.md#reconciliation

S0 live runtime contract: partial (Claude launch, completion, settlement and isolation observed; Codex hit a trust prompt then no funds; OpenCode's port was held by the user's service then no funds; peer messaging not observed). S1 launch gate `orca-launch-gate.mts` (23 tests; executable pinning, worker guard, env allowlist, bounded briefs). S2 ownership ledger `orca-ledger.mts` (18 tests; distinct missing/refused/corrupt, symlink-safe, set-once dispatch id). S3 dispatch `orca-dispatch.mts` (40 tests; claim before launch, resume never relaunch, fail-closed retries, one live attempt per task, `worker_done` grammar). S4 wiring, docs and release (build skill, `orca-vendors.md`, README, `.env.example`, CHANGELOG). Added the `AI_WORKFLOW_ORCA_MULTI_AGENT` switch and Node/Bun async `run` timeout, overflow and grace fixes. Releases 2.14.0 and 2.14.1.

## Section 3: SHIPPED.md#audit

Two cycles. Cycle 1: 4 security must-fix and 3 code high findings, all fixed. Cycle 2: security PASS, code 1 must-fix fixed. Reviewers independent with caught canaries. A later round of should-fix items was applied without a third review pass.

## Section 4: SHIPPED.md#no-gos-honored

No scheduler, remote/SSH/WSL support, forced parallelism, permission bypass, automatic commits or publication. Worker changes were not reconciled here (that is `orca-vendor-reconcile`).

## Section 5: SHIPPED.md#followups

Process-group kill, gate-level pair check, compare-before-rename test, ledger pruning, observed worker env markers, live Codex/OpenCode completion and peer messaging (see `_followups.md`).

## Section 6: pitch.md#no-gos

New scheduler, remote/SSH/WSL support, every-phase rewrite, forced parallelism, permission bypass, automatic publication or commits, broad metrics redesign, guaranteed savings.

## Section 7: pitch.md#rabbit-holes

The installed-version runtime launch/message/completion contract was a prerequisite (S0, partly observed); baseline and dirty-work handling and evidence tied to integrated changes went to the reconcile pitch; duplicate/replayed mail, partial launches, unknown liveness, restart and rate limits were handled with bounded retries on positive proof only; file/LOC appetite was held by decomposing into dispatch, reconcile and integration.

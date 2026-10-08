# Shipped: orca-vendor-dispatch (dispatch-core)

Bet: 2026-10-08. Shipped: 2026-10-08; user approved audit and [1] ship. Appetite: big-batch. Releases: 2.14.0 and 2.14.1.

## Final verification

| Step | Result |
|---|---|
| Build / typecheck / lint / i18n | Not applicable: no such command in this repo (`stack.md`) |
| Tests | Node 846/846; Bun 817 pass, 0 fail (`node --test` over scripts, runtime, hooks, `.claude/hooks`; `bun test`) |
| Workflow checks | `workflow-doctor.mts` READY, `setup-validator.mts` READY, `graphify.mts` CLEAN, `docs-links.mts` 0 broken |
| Diff | No secrets; dispatch is off unless `AI_WORKFLOW_ORCA_MULTI_AGENT=true` and an opted-in policy |

## Reconciliation

| Scope | Status | Evidence |
|---|---|---|
| S0 live runtime contract | partial | `runtime-contract.md`: Claude launch/completion/settlement/isolation observed; Codex (trust prompt, then no funds) and OpenCode (port held by the user's service, then no funds) launched but did not complete; peer messaging not observed |
| S1 launch gate | shipped | `orca-launch-gate.mts` + 23 tests; executable pinning, worker guard, env allowlist, bounded briefs |
| S2 ownership ledger | shipped | `orca-ledger.mts` + 18 tests; distinct missing/refused/corrupt, symlink-safe, set-once dispatch id |
| S3 dispatch | shipped | `orca-dispatch.mts` + 40 tests; claim before launch, resume never relaunch, fail-closed retries, one live attempt per task, `worker_done` grammar |
| S4 wiring, docs, release | shipped | build skill (claude, cursor), `orca-vendors.md`, README, `.env.example`, CHANGELOG |
| Added | shipped | `AI_WORKFLOW_ORCA_MULTI_AGENT` switch; Node and Bun async `run` timeout/overflow/grace fixes |

## Audit

Two cycles. Cycle 1: 4 security must-fix and 3 code high findings, all fixed. Cycle 2: security PASS (0 must-fix), code 1 must-fix fixed. Reviewers were independent with caught canaries. A later round of should-fix items was applied without a third review pass. Detail in `log.md`.

## No-gos honored

No scheduler, remote/SSH/WSL support, forced parallelism, permission bypass, automatic commits or publication. Worker changes are not reconciled here (`orca-vendor-reconcile`).

## Followups

See `_followups.md` (orca-vendor-dispatch 2026-10-08): process-group kill, gate-level pair check, compare-before-rename test, ledger pruning, observed worker env markers, live Codex/OpenCode completion and peer messaging.

# Audit cycle 2 — orca-auto-start-all-phases

Dispatched via Orca (coordinator claude): security re-review (1, opencode, independent: yes). Narrowed to the area cycle 1 changed (worker lookup path/env, hook command wiring, prose); test-coverage and code reviewers not re-dispatched: their cycle-1 items (extra tests, prose) were verified by the coordinator by re-running every suite on Node and Bun.
Independence: fresh dispatch, no earlier findings repeated as conclusions (the brief named the two previous issues as context). A canary was planted in the scratch copy only: the worker lookup restored to the bare unresolved command and the full parent env (`orca-start.mts:148`), which fails 2 scratch tests. The worker cited `orca-start.mts:148` and both failing tests: canary caught. Read-only: verified by `review-bench guard check` (clean, no changes). Model differs from the author's.

## Verification by the coordinator (before triage)
- Finding 1 (High, `orca-start.mts:148`) is the planted canary. The real line is `lookupWorker(resolved, …, buildWorkerEnv(env, deps), …)`; the real suites pass.
- Finding 2 (Medium, `runtime/cli.mts:21/35`): reproduces only when the hook is run WITHOUT the configured `AI_WORKFLOW_RUNNER=node` prefix (exit 1, non-blocking). Through the exact command in `.claude/settings.json` under `sh`, with the switch ON, runner configured as bun and no bun on PATH, the result is exit 2 (blocked); with the switch OFF, exit 0 and silent (re-run earlier today by the coordinator). The prefix is required by the docs (`orca-vendors.md:159`) and asserted by the hook test.
- Real-code reruns after cycle-1 fixes: Node orca-start 33, orca-run 26, hook 17, invariants 5, workflow-doctor 6 (+1 skipped), skill-defaults 27, grader 10; Bun orca-start 33, orca-run 26, hook 17; setup-validator READY; mirrors identical.

## Must-fix
None.

## Acknowledged → followups
- A hook entry copied without the `AI_WORKFLOW_RUNNER=node` prefix (another host, a hand-edited settings file) fails open (exit 1, non-blocking) when the configured runner is missing. Defence in depth: let `runDirect` take a fail-closed exit code for hook scripts. Followup.
- The test files' direct `node:*` imports (cross-pitch, `runner-aware-runtime-boundary-validator`) stay a followup.

## Gate
Zero must-fix after 2 of 3 cycles. Options: Approve → /ship / Revise / Back to /build / Stop.

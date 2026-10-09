---
id: verify-run-binding-before-orca-dispatch
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [orchestration, coordinator, readiness]
related: [retry-only-on-positive-proof-of-a-clean-failure, orca-workers-differ-from-the-coordinator-environment]
source: codex-orca-coordinator-parity
confidence: low
---

# Pattern: Verify Run binding before Orca dispatch

Readiness is a launch-policy/runtime decision, not proof of a bound orchestration Run. A Codex coordinator passed startup while run-current returned run:null; worker launch then failed. Creating and binding the pitch Run enabled real Claude/OpenCode dispatch, authoritative completion and release.

After ready, inspect run-current with the same executable and verify the objective and coordinator. Create a Run only when absent; request a choice for an unrelated binding. Preserve its identity. Do not treat status.dispatchReady or a startup line as binding/authentication evidence. Unknown-liveness ownership remains intact until recovery proves a disposition.

Evidence: codex-orca-coordinator-parity pitch critique/recovery and completed critique/build/audit lifecycle receipts for run_86cdf117ec09. Host hook activation is separate and remains unverified.

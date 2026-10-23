---
id: orca-model-preflight-can-leave-unproven-ledger-ownership
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [orca, orchestration, liveness, model-routing, diagnostics]
related: [a-gate-must-not-trust-its-own-author, reviewer-reports-contradicted-by-measurement]
source: workflow-usage-capture
severity: medium
resolved: false
confidence: low
---

# Issue: an Orca model preflight refusal can look like unknown worker liveness

During this audit the dispatch library claimed an attempt, then reduced the runtime's failed OpenCode
model-pin preflight to launch-failed:unproven without preserving the safe capability reason. The ledger
retained unknown-liveness and no Dispatch ID. Worker-list absence alone could not justify a retry.

Read-only inspection of the exact runtime established that its model-support check runs before
createStartingWorkerDispatch. That build allows pinning for OpenCode 1.18.30, 1.18.32 and 2.0.16;
the installed CLI reported 2.1.1. Version/code-path proof plus the scoped durable journal established
preflight failure before creation. The owner authorized recovery; the failed attempt was classified
failed and remaining reviews used an already configured Claude alternate through Orca. No app,
credentials, OpenCode config or global vendor defaults were changed.

These versions describe the observed runtime, not a permanent support matrix. Recheck the selected
runtime and executable. Preserve unknown ownership until positive evidence supports recovery. A future
adapter fix should retain a bounded safe preflight receipt or probe capabilities before claiming.
Brief fields also forbid control characters: normalize whitespace and call workerBrief locally before
dispatch, rather than sending a multiline field that will be refused.

Evidence: audit-cycle-1.md and metrics audit opencode-recovery-proof.json (runtime source hash and
pre-creation gate excerpt), effective-model-receipts.json, accepted completions and release receipts.

Audit evidence was subsequently archived with per-file SHA-256 verification to
`.project/runs/2026-10-21-workflow-usage-capture-audit-evidence.tar.gz`; its adjacent manifest
preserves the former metrics filenames and hashes. Extract to a temporary directory to inspect it.

---
id: reconcile-every-worker-of-a-wave-before-committing-any-scope
type: pattern
created: 2026-10-16
updated: 2026-10-16
tags: [orca, workers, reconcile, ordering, upgrade]
related: [orca-auto-start-design, unified-toon-config-schema-v2]
source: upstream-project-drift
confidence: low
---
# Pattern: reconcile a whole wave of workers before committing any of its scopes

## Summary
Committing one scope moved HEAD, so the other workers' reconcile ended with `apply:baseline-moved`. A worker dispatched under 2.22.x also had no `authorizedPaths` in its ledger record and could not be reconciled after the upgrade to 2.23.0.

## The Pattern
- Collect every `worker_done` of a wave, review the diffs, reconcile them all, then commit the scopes.
- If HEAD already moved and the files are disjoint, fast-forward the worker worktree to HEAD and retry.
- Dispatch dependent scopes only after the scope that owns the shared file is integrated (S7 was dispatched before S4 and had to be applied by hand).
- Free OpenCode's service port before the first OpenCode worker; the pitch automated it in `opencode-service.mts`.

---
id: settle-only-with-proof-bound-to-this-patch
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [orchestration, evidence, idempotency]
related: [retry-only-on-positive-proof-of-a-clean-failure, a-gate-must-not-trust-its-own-author, git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded]
source: orca-vendor-reconcile
---

# Pattern: settle an attempt only with proof bound to this attempt's patch, and make reruns re-prove it

## Summary

A rerun after a crash must not trust whatever evidence sits in the slot. Audit rounds found forged evidence for a
different patch, an empty manifest, evidence reused when only the patch hash matched, a mode-only change counted as
applied, a resumed attempt settled without passing checks, and a catch-all that rolled back an already-settled worker.

## The Pattern

- Resume re-admits the worker's diff; evidence is reused only if its patch hash AND entries equal the freshly admitted ones.
- Evidence that cannot describe a change (empty entries or files) never verifies; local data directories are off limits to workers.
- A resumed attempt still runs the checks; failing checks stop the settle and leave the decision to a person.
- Rollback never touches a worker whose ledger state is already `settled`.
- Report every outcome per attempt; a top-level `integrated` must not hide `evidence: failed`.

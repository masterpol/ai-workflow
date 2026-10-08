---
id: retry-only-on-positive-proof-of-a-clean-failure
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [orchestration, retries, safety]
related: [async-agent-launch-hook-counted-as-completion, hardening-a-shared-reader-made-its-writer-destructive, a-gate-must-not-trust-its-own-author]
source: orca-vendor-dispatch
---

# Pattern: retry a launch only on positive proof that the failure left nothing behind

## Summary

Launching a supervised worker has side effects (worktree, terminal, a running agent). "Non-zero exit" and "no
failure stage in the output" are absence of evidence, not proof. Three audit rounds found the same mistake in
different forms: a receipt printed on stdout was dropped, a `{}` receipt counted as clean, an unreadable receipt freed
the task for a second worker.

## The Pattern

- Read the receipt from every stream the tool may use (Orca prints failures on stdout).
- Retry only when the receipt parses AND shows an explicitly empty residual-resources list. A timeout, signal exit,
  overflow, unreadable or unproven receipt keeps ownership as `unknown-liveness` for a person to inspect.
- Record `failed` (freeing the task) only when the tool itself reports the dispatch failed; clean-up of what it left
  is then the person's job.
- Bound retries by min(caller, policy ceiling, hard cap) and by the deadline; each retry gets a new attempt id.

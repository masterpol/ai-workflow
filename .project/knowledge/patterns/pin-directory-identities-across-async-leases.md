---
id: pin-directory-identities-across-async-leases
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [filesystem, security, locking, metrics, runtime-injection]
related: [collector-metrics-lease-design, metrics-ancestor-swap-during-async-lease, hardening-a-shared-reader-made-its-writer-destructive]
source: workflow-usage-metrics
confidence: low
---

# Pattern: carry directory identity through an asynchronous lease

Validating a path before awaiting a lock does not validate the path eventually used by the
locked action. Capture directory inode/device identity and canonical paths before waiting;
recheck them after acquisition and before filesystem effects. Keep both readers and writers
on those guarded dependencies, including report destinations and temporary-file cleanup.

Preserve descriptor closing and lease release even when path checks refuse an operation.
Never follow a substituted path merely to clean up. Reproduce the race through injected
scheduling points rather than timing sleeps; assert outside files stay unchanged and a later
operation can recover after the directory is restored.

Concurrent initialization has a separate race: `EEXIST` is not automatically a failure or
permission to continue. Reinspect the winner and accept only the safe directory expected by
the transaction. Test safe, symlink and regular-file winners.

This pattern reduces asynchronous validation gaps. It does not replace anchored OS operations
or claim atomic protection against hostile ancestor changes inside a syscall. Source implementation:
`ai-framework/scripts/workflow-metrics-state.mts`, with Node/Bun and reviewer fault-injection proof.

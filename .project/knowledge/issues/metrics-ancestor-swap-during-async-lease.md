---
id: metrics-ancestor-swap-during-async-lease
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [metrics, security, filesystem, concurrency, symlinks]
related: [collector-metrics-lease-design, hardening-a-shared-reader-made-its-writer-destructive, pin-directory-identities-across-async-leases]
source: workflow-usage-metrics
severity: high
resolved: true
---

# Issue: a directory checked before an asynchronous lease can change before use

The workflow usage writer validated `.project/metrics` before awaiting its shared loopback
lease. An injected scheduling point replaced the directory with a symlink after lease binding.
Leaf `O_NOFOLLOW` and leaf inode checks did not protect ancestor traversal: recording changed
outside state and reporting read outside state and wrote outside views.

The audit reproduced both paths using the real lease. The fix pins parent/directory identities
before waiting and supplies guarded filesystem dependencies to each action. Checks reject
symlinks, different inode/device pairs and different canonical paths before filesystem effects.
Descriptor close and lease release remain available after refusal.

Reviewer proofs cover swaps during lease acquisition, between leaf inspection and open, and
after temporary writing. Outside files stay unchanged, descriptors/lease release and subsequent
recording recovers. Node and Bun behavior tests cover both record and report. Full audit evidence
is `.project/pitches/workflow-usage-metrics/audit.md`.

This is per-operation checking, not atomic protection against malicious renames inside an OS
syscall. After substitution, cleanup refuses the new pathname and can leave a private temporary
file in the original directory. That boundary is explicit rather than represented as fixed.

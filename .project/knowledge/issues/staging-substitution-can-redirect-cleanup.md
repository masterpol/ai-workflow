---
id: staging-substitution-can-redirect-cleanup
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [security, filesystem, staging, cleanup, concurrency]
related: [metrics-ancestor-swap-during-async-lease, a-writer-reinspects-the-target-at-the-publish-step, pin-directory-identities-across-async-leases]
source: token-time-report
severity: high
resolved: true
confidence: medium
---

# Issue: a stage swap after publication can redirect cleanup

A report publisher correctly checked its exclusive stage at setup, then linked a file successfully. An injected swap replaced that stage path with a symlink before cleanup. The following unlink traversed the substituted stage and deleted a controlled outside file.

The fix verifies stage-chain identities on every filesystem operation, rechecks staged bytes and records the successful link before cleanup can fail. Cleanup removes only this attempt's identified files. The independent before/after fixture proves the outside file remains intact and incomplete-publication accounting stays truthful. Node/Bun publication regressions pass; evidence is token-time-report/S2-evidence.md. This is per-operation defense, not an anchored-openat guarantee: an OS check-to-syscall race remains, and an unowned substituted stage is preserved for operator recovery.

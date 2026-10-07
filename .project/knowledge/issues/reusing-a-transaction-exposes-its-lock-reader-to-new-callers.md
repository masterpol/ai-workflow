---
id: reusing-a-transaction-exposes-its-lock-reader-to-new-callers
type: issue
created: 2026-10-07
updated: 2026-10-07
tags: [path-safety, transactions, locks, fifo, shared-helpers, audit]
related: [hardening-a-shared-reader-made-its-writer-destructive, compaction-recovery-shares-context-and-trusted-directories, resolve-before-matching-a-protected-path-allowlist]
source: path-safety-hardening
severity: medium
resolved: true
---

# Issue: reusing skill-registry transactions for ledger commits exposed their lock read to FIFOs and huge files

## Symptom
Ledger commits were routed through the skill-registry transaction code for symlink refusal and atomic replace. That made them read
the registry lock too: a FIFO there blocked forever, and an oversized lock caused an unbounded read. Found by the independent
security reviewer in audit cycle 1, not by the author's tests.

## Fix and rule
`acquire` opens locks with `O_NOFOLLOW|O_NONBLOCK`, requires a regular file of at most 4096 bytes, and reads no more. A rollback
refusal now keeps both the write failure and the recovery error (AggregateError). When a new caller reuses a shared transaction,
re-review every file that transaction touches against the new caller's trust level. Cleanup through a path whose ancestor changed
is refused (a temp file may be retained in the moved original) rather than followed. The final ancestor TOCTOU stays an accepted,
documented limit ([[compaction-recovery-shares-context-and-trusted-directories]]).

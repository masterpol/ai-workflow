---
id: read-before-the-lease-commit-cursor-and-totals-together
type: pattern
created: 2026-10-19
updated: 2026-10-19
tags: [metrics, exactly-once, leases, transcripts, atomic-write]
related: [pin-directory-identities-across-async-leases, reversible-aggregates-store-their-routing, hardening-a-shared-reader-made-its-writer-destructive]
source: token-attribution
confidence: low
---

# Pattern: read a growing file before the lease, then commit cursor, ids and totals in one atomic write

## Summary

To count usage from a file that keeps growing (a transcript) exactly once without holding the metrics lease
during a large read: read from the stored cursor before taking the lease, then under the lease keep only items
past the locked cursor and outside the locked recent-id window, and write the new cursor, ids and totals in the
same atomic snapshot write.

## The Pattern

1. Unlocked, read-only: read the cursor from the snapshot, call a pure reader (numbers and bounded ids only).
2. Reader holds back the last message group unless the caller says the file is final, drops partial trailing
   lines, resets on a shorter file or changed inode, and steps over a line longer than its read window.
3. Under the lease: filter by the locked offset and the locked id window; apply totals; store offset, size,
   inode, dev, recent ids; write once. A failed write leaves cursor and totals unchanged together.
4. Refusals (symlink, FIFO, outside root) are distinct outcomes that still count the completion as unavailable
   and never write a cursor.
5. Re-validate every reader value at the write point; key cursors by a hash, never a path.

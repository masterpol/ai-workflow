---
id: a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash
type: pattern
created: 2026-10-23
updated: 2026-10-23
tags: [compaction, ledger, integrity, hashing, limits]
related: [pitch-folders-accumulate-staging-nothing-consumes, pitch-compaction-gate-and-recovery-design, live-test-evidence-outlived-its-pitch-path]
source: connected-memory-consolidation
---

# Pattern: account for bulk with a group bound by a tree hash, not a larger cap

## Context

A destructive gate must prove every file it will delete was judged. Per-file entries do that, but a hard cap on entries makes large folders uncompactable, and raising the cap only moves the wall and grows the ledger.

## Pattern

Let one entry cover a folder prefix. Bind it by the member count and a hash over every member's path and hash in a fixed order, computed by the tool and recomputed by the gate. Any add, drop, rename or edit changes the hash. Refuse overlap (a file belongs to one entry), refuse a group that matches nothing, and keep a separate bound on total files. Put the coverage rule in one pure function used by both the writer and the remover.

## Evidence

Mutation checks: ignoring the count, ignoring the tree hash, hashing without member hashes, dropping the overlap check, ignoring unaccounted files, accepting a stale group hash at commit and hashing only part of the folder were each caught. Hashing without a count prefix survived and showed the prefix was redundant, so it was removed. See [[pitch-folders-accumulate-staging-nothing-consumes]].

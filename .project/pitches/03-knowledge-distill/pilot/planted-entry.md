---
id: a-ledger-for-judged-files-lists-every-file
type: pattern
created: 2026-10-23
updated: 2026-10-23
tags: [compaction, ledger, integrity, hashing, limits]
related: [a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash]
source: connected-memory-consolidation
---

# Pattern: when a person must judge each file, give each file its own ledger entry

## Context

Some folders hold files whose loss matters one by one, such as decisions and approval records. A hard cap on ledger entries makes such a folder harder to compact.

## Pattern

Do not cover these files with a folder group, even when the group would be bound by a count and tree hash: a hash proves the set did not change, not that anyone judged each member. List every file with its own entry. If the cap is reached, stop and split the pitch folder.

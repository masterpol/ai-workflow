---
id: a-lease-refused-capture-leaves-a-bounded-marker-for-the-next-lease
type: pattern
created: 2026-10-20
updated: 2026-10-20
confidence: low
tags: [workflow-metrics, lease, observability, bounded-state, fail-closed]
related: [pin-directory-identities-across-async-leases, read-before-the-lease-commit-cursor-and-totals-together, metrics-ancestor-swap-during-async-lease]
source: workflow-usage-state
---

# Pattern: a lease-refused capture leaves a bounded marker for the next lease

## Context

A collector that writes a shared JSON state under a lease cannot record that a capture was dropped because the lease was refused: the dropped event is the one that could not write. Counting those drops in the state is impossible, and silence reads as "nothing was lost".

## Pattern

- Outside the lease, a writer that was refused appends one byte to a side file next to the state. It never creates the directory, never throws, refuses symlinks, non-files and a size at a hard cap, and reports only true or false.
- Under the next lease, after the event is accepted, the consumer renames the marker aside, adds its size (clamped to the cap) to a counter in the state, writes the state, and only then unlinks the renamed file. A failed write renames it back.
- Report the counter as "at least": drops past the cap, and a byte appended to a marker already renamed, are not counted.

## Evidence

Shipped in `workflow-usage-state` S6 with tests for three markers then one event, a busy lease, a legacy lock, the cap, a symlink, a FIFO, a failed write and a counter overflow. Residual: without `O_APPEND`/`O_NOFOLLOW` constants in the runtime adapter the open uses flag `"a"`, leaving one symlink-planting window when no marker exists (accepted, in `deviations.md`).

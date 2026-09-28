# Pitch: Bundle sync marker fix

**Date**: 2026-09-26  •  **Appetite**: small-batch (≤2 files, ≤250 LOC)
**Stack**: Node.js sync CLI

## Problem

Maintainers lose visibility of upstream changes when a kept, unverified file is later shown as a local-only edit even though it was never applied.

## Knowledge consulted

- `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — sync protects instance customization and validates installed code after sync.
- `patterns/dual-hash-tracking-for-transformed-content` — recorded source and applied state must remain distinct.
- `patterns/subprocess-revalidation-against-on-disk-code` — sync state must describe what is actually installed.
- `ai-framework/rules/testing.md` — preserve exact repro as a behavior test.

## Solution sketch (breadboard, NOT wireframe)

**Places**: `bundle-sync.js` marker construction; `bundle-sync.test.js` sequential sync fixtures.

**Affordances**: retain each file's prior base when it stays unverified, local, or conflicted; record new source base only after file is applied.

**Connections**: compare source, target, and previous base; apply or keep each entry; construct next marker from per-entry outcome. A second run must still report an unapplied upstream file as pending.

## Rabbit holes

**Resolved here**:
- Marker state records target's effective base, not a snapshot of every current source file.

**Pushed to /plan as risk**:
- Removed files and prune outcomes need same per-entry rule — owner: planner.

**Pushed to no-go**:
- New conflict-resolution UI, forced overwrite behavior, or syncing `.project`.

## No-gos (this pitch)

- ✗ No automatic application of unverified files.
- ✗ No marker schema bump unless tests prove it is necessary.
- ✗ No changes to unrelated skill reconciliation.

## Critique findings

Skipped: small-batch.

## Bet decision

☒ **Bet** (→ /plan)
☐ Re-shape — named gap: prune marker semantics
☐ Pass — moved to `.project/pitches/_parked/bundle-sync-marker-fix/`; reason: {…}

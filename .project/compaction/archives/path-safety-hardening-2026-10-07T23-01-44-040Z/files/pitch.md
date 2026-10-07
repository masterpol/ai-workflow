# Pitch: Path safety hardening

**Date**: 2026-09-26  •  **Appetite**: small-batch (≤4 files, ≤400 LOC)
**Stack**: Node.js workflow tooling

## Problem

Maintainers cannot rely on skill installation or pitch-compaction writes to remain inside the project when another local process races an ancestor-path swap.

## Knowledge consulted

- `issues/hardening-a-shared-reader-made-its-writer-destructive` — refusal must never become an unsafe fresh write.
- `patterns/resolve-before-matching-a-protected-path-allowlist` — resolve and verify every protected write path.
- `decisions/pitch-compaction-gate-and-recovery-design` — ledger writes are part of a recoverable deletion gate.
- `ai-framework/rules/security.md` §9 and `rules/testing.md` — guarded writes are atomic and mutation-tested.

## Solution sketch (breadboard, NOT wireframe)

**Places**: `skill-registry.js` managed-write resolver; `pitch-compress.js` ledger writer; focused tests.

**Affordances**: retain identity for each checked path component, re-check it immediately before a write; refuse a symlinked `compaction` or `ledgers` ancestor; create ledger files with a unique temp file and rename.

**Connections**: a transaction or ledger request resolves destination, creates safe parents, verifies destination ancestry still matches, then writes atomically. Tests force changed-path and symlink-refusal paths.

## Rabbit holes

**Resolved here**:
- Co-resident write access is required for the race; closing it is still worthwhile because both commands write project records.
- A refused source or destination is an error, never treated as absent.

**Pushed to /plan as risk**:
- Deterministic race simulation without flaky timing — owner: planner.

**Pushed to no-go**:
- Platform-specific descriptor APIs or a general filesystem transaction framework.

## No-gos (this pitch)

- ✗ No changes to compaction retention, ledger schema, or deletion approval.
- ✗ No changes to skill source fetching or vendor mirrors.
- ✗ No historical record edits.

## Critique findings

Skipped: small-batch.

## Bet decision

☒ **Bet** (→ /plan)
☐ Re-shape — named gap: deterministic race coverage
☐ Pass — moved to `.project/pitches/_parked/path-safety-hardening/`; reason: {…}

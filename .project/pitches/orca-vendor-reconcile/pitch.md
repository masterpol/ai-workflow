# Pitch: orca-vendor-reconcile

**Date**: 2026-10-08 • **Appetite**: big-batch (≤15 files / ≤1500 LOC); estimate 9 files / ~1000 LOC
**Stack**: Node.js workflow tooling (`.mts` on injected `RuntimeDeps`) / agent instructions
**Depends on**: `../orca-vendor-dispatch/pitch.md` (dispatch-core)
**Parent**: `../orca-vendor-orchestration/pitch.md`

## Problem

Dispatched workers return changes. The coordinator must integrate only verified work onto an explicit baseline, preserve unrelated dirty work, and finish the normal audit/ship gates.

## Solution sketch

`orca-reconcile.mts` plus tests: explicit shared baseline; flag overlapping dirty files instead of guessing ownership; copy accepted evidence outside worker resources and verify before cleanup; re-measure changed files, checks and counts rather than accepting worker claims; safe conflict recovery; combined checks; audit-phase mirrors (4); executable grader for `.project/evals/datasets/orca-vendor-orchestration.json`; live smoke criteria; CHANGELOG/VERSION.

## Rabbit holes (push to /plan)

- Baseline and dirty-work attribution (`issues/false-cross-pitch-attribution-in-a-shared-uncommitted-file`); symlink-safe evidence copy; settlement proven before cleanup and reassignment; coordinator-only verification (`a-gate-must-not-trust-its-own-author`).

## No-gos

As dispatch-core: no scheduler, remote support, forced parallelism, permission bypass, automatic commits/publication.

## Bet decision

☐ Bet — only after dispatch-core ships and live runtime verification exists. ☐ Re-shape ☐ Pass

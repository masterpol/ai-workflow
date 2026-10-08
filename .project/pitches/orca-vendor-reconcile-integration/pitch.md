# Pitch: orca-vendor-reconcile-integration

**Date**: 2026-10-08 • **Appetite**: small-batch to low big-batch; estimate ~7 files / ~700 LOC
**Stack**: Node.js workflow tooling (`.mts` on injected `RuntimeDeps`) / agent instructions
**Depends on**: `../orca-vendor-reconcile/pitch.md` (reconcile-core API)
**Parent**: `../orca-vendor-orchestration/pitch.md`

## Problem

Reconcile-core can integrate verified worker changes, but the phases do not use it, the dataset of golden cases is only static, and release records are missing.

## Solution sketch

Executable grader for `.project/evals/datasets/orca-vendor-orchestration.json` (decide which cases it executes versus parses; independent review of the grader itself); audit and ship phase wiring in `.claude` and `.cursor` (the `.agents`/`.opencode` loaders only if they need a line); live smoke criteria for each vendor and peer messaging; one release step (docs, CHANGELOG, VERSION).

## Rabbit holes (push to /plan)

- Grader scope and fixtures; grader is an instrument and needs its own review. Mirror parity across vendors. One release step, not one per scope.

## No-gos

Standing no-gos (`decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers`).

## Bet decision

☐ Bet — only after reconcile-core ships. ☐ Re-shape ☐ Pass

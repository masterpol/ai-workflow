# Pitch: workflow-v3-rollout

**Date**: 2026-10-16  •  **Appetite**: small-batch
**Stack**: workflow-tooling (bundle-sync, config-migrate) across LAH, RN, climbing-lab-monorepo
**Epic**: `workflow-v3` — pitch 5 of 5. Depends on pitches 1-4 shipped in base.

## Problem

After 3.0.0 ships, the three projects still run 2.22.5 with hand edits. The owner needs each project on the
base version with one config file, and no manual patching left.

## Knowledge consulted

- [decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers] — constrains: no silent
  override of instance customization.
- [decisions/effective-sync-bases-and-bounded-font-discovery] — applies: verify sync bases after the run.
- [patterns/sync-tools-refuse-symlinks-in-source-and-destination] — applies.

## Solution sketch (breadboard)

**Places**: each project's `ai-framework/`, `.project/`, root `ai-workflow.toon`; one branch + PR per project.

**Affordances** (per project):
- `bundle-sync` dry-run → review → apply. Expected conflicts only on rows marked project-local in the
  drift ledger.
- Move RN's rewritten rules into `.project/rules/` per the drift ledger.
- `config-migrate --dry-run` → owner review → `--apply`.
- Gauntlet: workflow tests under the project's runner, doctor clean, Orca preflight passes.

**Connections**: base 3.0.0 → per-project sync → migrate → verify → PR.

## Rabbit holes

**Resolved here**:
- Order → climbing (node runner, most drift) first, then LAH, then RN.

**Pushed to /plan as risk**:
- In-flight pitches in a project during sync: checkpoint them first.

## No-gos (this pitch)

- ✗ No application code changes in any project.
- ✗ No merge without owner review of each PR.

## Bet decision

☐ **Bet** (→ /plan)
☐ Re-shape — named gap: {…}
☐ Pass — reason: {…}

## Amendment (2026-10-21)

The rollout now also carries the `connected-memory-consolidation` work (P1 relations graph, P2a ledger/decision/record schemas,
P2d installed-project sync, P2c legacy upgrade) and must be prepared for it. Details, per-project consequences and the open
inputs are in `consolidation-carry.md`. `readiness.md` (bundle 2.30.0) is historical and must be re-run at the release that
includes this work. Appetite may need a re-check at /plan: three projects plus an instance-data migration step per project.
Depends additionally on: `connected-memory-consolidation` P1, P2a, P2d shipped (P2c tool preferably).


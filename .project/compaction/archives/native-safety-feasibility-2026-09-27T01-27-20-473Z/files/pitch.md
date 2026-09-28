# Pitch: Native safety feasibility

**Date**: 2026-09-26  •  **Appetite**: small-batch (≤4 files, ≤400 LOC, ≤1 day)
**Stack**: Node orchestrator; isolated Python standard-library experiments

## Problem

Maintainers cannot close the remaining path and collector races using the existing pathname checks. We need measured evidence for a safe primitive before changing the bundle's dependency-free runtime contract.

## Knowledge consulted

- `issues/hardening-a-shared-reader-made-its-writer-destructive` — refused paths must never become fresh writes.
- `patterns/a-gate-must-not-trust-its-own-author` — ownership must hold at the protected operation.
- `patterns/reversible-aggregates-store-their-routing` — totals and stored records survive migration.
- `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — capability and transaction boundaries precede mutation code.
- `ai-framework/rules/security.md` §9 and `testing.md` — bounded inputs, guarded writes, deterministic failure tests.

## Solution sketch (breadboard, NOT wireframe)

**Places**: scratch-only primitive harness; capability report; two existing pitches' re-shape addenda.

**Affordances**: use Python's directory-relative open/rename/unlink and Unix file locking in isolated fixtures; coordinate ancestor swaps, paused owners, process death, and lock-file replacement. Measure what succeeds and what cannot be guaranteed.

**Connections**: detect APIs without installation; run bounded adversarial fixtures; record support and failure semantics; produce a concrete implementation recommendation for each existing pitch. No production writer changes in this spike.

## Rabbit holes

**Resolved here**:
- This macOS host has Python 3.14.7, directory-relative operations, and fcntl.flock; this proves API availability only.
- Lock files must not be unlinked/replaced during normal locking. Advisory locks require every writer to cooperate.

**Pushed to /plan as risk**:
- Directory moved outside the project while its descriptor remains open: define the exact containment guarantee, not merely symlink refusal — owner: planner.
- Helper crash, parent crash, timeout, and old collector interoperability — owner: planner.
- Linux verification and unsupported-platform refusal — owner: planner; unavailable hosts must be reported unverified.

## No-gos

- No production Python dependency, installation, compilation, or dependency manifest.
- No unsafe fallback or claim of Windows support.
- No edits to historical records or concurrent independent-review implementation.
- No full filesystem attacker-proof claim; same-user hostile modification of lock inodes must be explicitly bounded.

## Critique findings

Skipped: small-batch feasibility only. Production integration appetite is decided from the measured result.

## Bet decision

☐ Bet — run the bounded feasibility spike, then re-plan the two incomplete fixes.
☐ Re-shape — change primitive or platform scope.
☐ Pass — retain incomplete scopes and documented limits.

## Sources

https://docs.python.org/3/library/os.html (directory-relative APIs and supports_dir_fd)
https://docs.python.org/3/library/fcntl.html (Unix flock and nonblocking modes)

## Decision record — 2026-09-26

User selected **Bet**. Proceed to planning the bounded feasibility spike; production integration remains outside this bet.

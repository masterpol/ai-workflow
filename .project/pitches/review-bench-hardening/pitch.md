# Pitch: review-bench-hardening

**Date**: 2026-10-23  •  **Appetite**: small-batch
**Stack**: workflow tooling (TypeScript `.mts` review-bench script, tests)
**Origin**: cooldown candidate F1 (`runs/cooldown-2026-10-23-forced.md`), approved and promoted to a pitch draft 2026-10-23. Draft: not yet shaped or bet.

## Problem

`review-bench` prepares the scratch copy, plants the canary and guards the tree for independent audit re-reviews. Three
followups from `token-time-report` and an older open question leave it softer than its role needs:

- **TTR-A1**: inspecting an untrusted tree can run project, local or global Git config helpers (fsmonitor, filters). Current use is
  limited to this trusted checkout, so the contract must stay narrow and explicit.
- **TTR-A2**: appetite counting accepts non-finite or non-numeric `--max` and reads Git listings that break on non-ASCII names.
- **TTR-A3**: snapshot destinations such as `..name` inside the root are wrongly refused, snapshot shape is not validated, filesystem
  errors can surface raw, and citation/record parsing is loose.
- **Isolation question (2026-09-27)**: is convention-based read-only enough, or does the tool need real process isolation?

## Knowledge consulted

- patterns/`a-planted-canary-makes-a-reviewer-finding-checkable`, `a-gate-must-not-audit-its-own-instrument`.
- patterns/`path-containment-compares-real-paths` and the security.md section G rules promoted 2026-10-23.
- `_followups.md` entries TTR-A1, TTR-A2, TTR-A3 and "review-bench.js: is convention-based read-only enough".

## Solution sketch (breadboard)

**Places**: `review-bench.mts` and `review-bench.test.mts`.

**Affordances**: Git invoked with a clean environment and config disabled (or an explicit trusted-root refusal); `--max` validated as a
finite non-negative integer; NUL-delimited Git listings; fixed-text diagnostics for filesystem errors; snapshot shape validation;
stricter citation parsing. Isolation question decided in shaping and recorded as a decision.

**Connections**: `/audit` → review-bench `prepare`/`guard`/`canary-check` → reviewers, with execution-spy regressions for each fix.

## Rabbit holes

**Pushed to /shape**: whether isolation is in scope or recorded as an accepted trusted-checkout boundary; keeping outside-only snapshots, symlink/FIFO refusals and current caps unchanged.

## No-gos (this pitch)

- ✗ No weakening of existing symlink, FIFO, secret-name or size refusals.
- ✗ No execution of any script supplied by the reviewed tree.
- ✗ No sandboxing infrastructure unless shaping decides isolation is in scope.

## Critique findings

(Empty until /critique runs.)

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — reason: {…}

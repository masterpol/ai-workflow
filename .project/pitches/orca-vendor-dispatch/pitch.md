# Pitch: orca-vendor-dispatch

**Date**: 2026-10-07 • **Appetite**: big-batch (≤15 files / ≤1500 LOC / ≤1 week); estimate 12 files / 1350 LOC
**Stack**: Node.js workflow tooling / agent instructions
**Depends on**: `../orca-vendor-foundation/pitch.md`
**Parent**: `../orca-vendor-orchestration/pitch.md`

## Problem

Users want configured vendors to complete independent scopes together, communicate about contracts, and return verified changes to the current agent for reconciliation.

## Knowledge consulted

Parent investigation consulted isolated writers/provenance, independent report verification, truthful cost reporting, trusted policy, and native fallback. The parent's `investigation.md` links current Orca lifecycle, messaging, placement, and launch contracts.

## Solution sketch (breadboard, NOT wireframe)

**Places**: existing build/audit dispatch boundary, installed Orca Run/Task/Dispatch interfaces, worker inboxes and isolated worktrees, coordinator integration record.
**Affordances**: dispatch ready scopes to eligible alternate vendors; send peer questions; report completion; inspect attempts; reconcile accepted changes and run combined checks.
**Connections**: consume foundation eligibility, retain the invoking harness as coordinator, and prepare bounded independent task briefs. Place parallel writers in isolated checkouts with an explicit shared baseline. Workers exchange Run-scoped messages and report outcomes using their authoritative preambles. Coordinator verifies reports, changes, and checks; integrates accepted results while preserving unrelated dirty work; completes normal audit/ship gates.

Before any launch, unsupported delegation uses the normal workflow. After launch, unknown liveness requires inspection and preservation, never duplicate editing. Reassignment follows proven settlement. Workers do not launch their own workers or ship. Preserve each task's ownership through restart, partial startup, and completion replay. Static golden fixtures live at `.project/evals/datasets/orca-vendor-orchestration.json`; /plan must turn them into executable checks and add live smoke criteria for each vendor and peer communication.

## Rabbit holes

- **Push to /plan, owner: planner**: installed-version runtime launch/message/completion contract is a prerequisite to betting this pitch; currently unverified.
- **Push to /plan, owner: planner**: baseline and dirty-work handling, evidence tied to integrated changes, safe conflict recovery, and gate ownership.
- **Push to /plan, owner: planner**: duplicate/replayed mail, partial launches, unknown liveness, restart, and rate limits with bounded retries.
- **Push to /plan, owner: planner**: count all phase mirrors, tests, and release records; keep ≤15 files / ≤1500 LOC or decompose further.

## No-gos

New scheduler, remote/SSH/WSL support, every-phase rewrite, forced parallelism, permission bypass, automatic publication/commits, broad metrics redesign, or guaranteed savings.

## Critique findings

Parent critique A1 requires decomposition; A2 requires installed-runtime evidence before betting dispatch. S1 requires distinct missing/refused/corrupt recovery outcomes; uncertainty preserves ownership. S2 requires accepted evidence copied outside worker resources and verified before cleanup. K1–K4 require attempt-specific completion, proven settlement, and independent review of reconciliation. E1–E5 require adversarial baseline/completion cases, all vendor permutations, stateful recovery tests, executable graders, and separate live smoke evidence. Parent records full findings and dispositions.

## Bet decision

☐ **Bet** — only after foundation and installed-runtime prerequisites are satisfied, with a separate user decision.
☐ **Re-shape** — revise named gap.
☐ **Pass** — park.

Pending prerequisites and user decision.

# Pitch: orca-vendor-dispatch

> **Revised 2026-10-08 (critique C1-C7 addressed).** This pitch is now **dispatch-core** only: launch gate, task briefs, ownership ledger, replay, liveness, bounded retries, build-phase mirrors. Baseline/dirty-work handling, evidence copy, conflict recovery, combined checks, audit mirrors and the executable grader moved to `../orca-vendor-reconcile/pitch.md`, which depends on this one.

**Date**: 2026-10-07 (revised 2026-10-08) • **Appetite**: big-batch (≤15 files / ≤1500 LOC / ≤1 week); revised estimate 8 files / ~900 LOC after splitting reconcile out (critique C1)
**Stack**: Node.js workflow tooling / agent instructions
**Depends on**: `../orca-vendor-foundation/pitch.md`
**Parent**: `../orca-vendor-orchestration/pitch.md`

## Problem

Users want configured vendors to complete independent scopes together, communicate about contracts, and return verified changes to the current agent for reconciliation.

## Knowledge consulted

Parent investigation consulted isolated writers/provenance, independent report verification, truthful cost reporting, trusted policy, and native fallback. The parent's `investigation.md` links current Orca lifecycle, messaging, placement, and launch contracts.

## Solution sketch (breadboard, NOT wireframe)

**Places**: existing build/audit dispatch boundary, installed Orca Run/Task/Dispatch interfaces, worker inboxes and isolated worktrees, coordinator integration record.
**Affordances**: dispatch ready scopes to eligible alternate vendors; send peer questions; report completion; inspect attempts. (Reconcile and combined checks: `orca-vendor-reconcile`.)
**Connections**: consume foundation eligibility, retain the invoking harness as coordinator, and prepare bounded independent task briefs. Place parallel writers in isolated checkouts with an explicit shared baseline. Workers exchange Run-scoped messages and report outcomes using their authoritative preambles. Coordinator verifies reports, changes, and checks; integrates accepted results while preserving unrelated dirty work; completes normal audit/ship gates.

Before any launch, unsupported delegation uses the normal workflow. After launch, unknown liveness requires inspection and preservation, never duplicate editing. Reassignment follows proven settlement. Workers do not launch their own workers or ship. Preserve each task's ownership through restart, partial startup, and completion replay. Static golden fixtures live at `.project/evals/datasets/orca-vendor-orchestration.json`; /plan must turn them into executable checks and add live smoke criteria for each vendor and peer communication.

## Rabbit holes

- **Push to /plan, owner: planner**: installed-version runtime launch/message/completion contract is a prerequisite to betting this pitch; currently unverified.
- **Push to /plan, owner: planner**: baseline and dirty-work handling, evidence tied to integrated changes, safe conflict recovery, and gate ownership.
- **Push to /plan, owner: planner**: duplicate/replayed mail, partial launches, unknown liveness, restart, and rate limits with bounded retries.
- **Push to /plan, owner: planner**: count all phase mirrors, tests, and release records; keep ≤15 files / ≤1500 LOC or decompose further.

## Revision 1 additions (critique 2026-10-08)

- **Launch gate (C2):** a new contract decides launch authority, since foundation always returns `dispatchReady: false`. It re-reads the policy and re-probes immediately before each `worker-start` (strict installed-version match, caller session match, throw-if-touched fakes). A version change after launch is treated as unknown liveness: preserve ownership, never relaunch. Owner: planner.
- **Recursion guard (C3):** every brief injects `--worker-context`; default-deny is derived from `ORCA_*` environment when the flag is absent. Adversarial test: a worker runs preflight without the flag.
- **Async on RuntimeDeps (C4):** use `deps.child.run`, `deps.clock` and `errorCode` (ETIMEDOUT/ENOBUFS) as the single timeout source; refuse a call with under 1 ms budget; a stateful fake Orca on injected deps covers restart, replay and partial launch.
- **Child environment (C5):** sanitize PATH and environment for every launch; refuse relative or dot launcher entries. Completion is never inferred from a launch ack, only from the worker's authoritative report; attempt/task join keys carry a prefix.
- **Ledger and paths (C6):** the ownership ledger keeps missing, refused and corrupt distinct and never treats refused as absent; worker checkout paths are `lstat`-checked per component with symlinks refused; policy is read from the coordinator root, never a worker tree.
- **Untrusted mail (C7):** peer messages are parsed against a grammar, re-emitted and allow-listed at ingest and render.
- **Knowledge to cite at /plan:** the entries listed under critique C5-C7; guard tests proven against an in-memory mutant.

## No-gos

New scheduler, remote/SSH/WSL support, every-phase rewrite, forced parallelism, permission bypass, automatic publication/commits, broad metrics redesign, or guaranteed savings.

## Critique findings

Parent critique A1 requires decomposition; A2 requires installed-runtime evidence before betting dispatch. S1 requires distinct missing/refused/corrupt recovery outcomes; uncertainty preserves ownership. S2 requires accepted evidence copied outside worker resources and verified before cleanup. K1–K4 require attempt-specific completion, proven settlement, and independent review of reconciliation. E1–E5 require adversarial baseline/completion cases, all vendor permutations, stateful recovery tests, executable graders, and separate live smoke evidence. Parent records full findings and dispositions.

## Bet decision

☑ **Bet** — 2026-10-08, user decision. Critique C1-C4 addressed (split, launch gate, recursion guard, async deps); C5-C7 to be cited at /plan. Installed-runtime live verification is a mandatory /plan gate before any /build scope that launches a worker.
☐ **Re-shape** — revise named gap.
☐ **Pass** — park.

Bet 2026-10-08. Next: /plan.

## Critique findings — re-run 2026-10-08 (after the direct-.mts runtime migration)

Perspectives: knowledge-historian, skeptic, appetite-auditor (sonnet each; cross-pitch skipped, one active pitch). Advisory; dispositions pending the user.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| C1 | appetite-auditor | high | scope-overrun | Honest count is ~16 files (2 impl + 2 tests + 4 build mirrors + 4 audit mirrors + integration doc + grader + CHANGELOG/VERSION) and ~1700-2000 LOC, over the 15/1500 cap; the stated 12/1350 omits mirrors and records. Split into dispatch-core (launch, briefs, ownership ledger, replay, liveness, retries, build mirrors; ~8 files/900 LOC) then reconcile (baseline, dirty work, evidence copy, conflict recovery, audit mirrors, grader; ~9 files/1000 LOC). |
| C2 | skeptic | high | rabbit-hole | No launch authority exists: foundation always returns `orchestration-unverified` / `dispatchReady: false`. Define the launch-gate contract: who flips it, re-read policy and re-probe immediately before each `worker-start` (strict version match `1.4.222`, session id match), and whether a version change after launch is unknown liveness. |
| C3 | skeptic | high | rabbit-hole | The worker-recursion guard (`--worker-context`) is self-declared. Inject it in every brief and derive default-deny from `ORCA_*` env; adversarial test where a worker runs preflight without the flag. |
| C4 | skeptic | medium | rabbit-hole | Dispatch is async and long-running: use `deps.child.run`, `deps.clock` and `errorCode` (ETIMEDOUT/ENOBUFS) as the single timeout source, not `runSync` and elapsed-time inference; needs a stateful fake Orca on injected RuntimeDeps. |
| C5 | knowledge-historian | high | missed-knowledge | Cite `patterns/opt-in-before-runtime-discovery` (child PATH/env allowlist is dispatch's job; refuse relative launcher entries), `issues/async-agent-launch-hook-counted-as-completion` (never infer completion from launch ack; prefix join keys), `issues/rounded-zero-timeout-disables-cancellation` (refuse calls with <1 ms budget; fractional-boundary clock test). |
| C6 | knowledge-historian | high | missed-knowledge | Cite `patterns/sync-tools-refuse-symlinks-in-source-and-destination` and `resolve-before-matching-a-protected-path-allowlist` for worktree and evidence-copy paths; `issues/hardening-a-shared-reader-made-its-writer-destructive` (ledger reader keeps missing/refused/corrupt distinct); `patterns/a-gate-must-not-trust-its-own-author` and `...audit-its-own-instrument` (re-validate before cleanup, coordinator re-measures worker claims per `issues/reviewer-reports-contradicted-by-measurement`). |
| C7 | knowledge-historian | medium | missed-knowledge | `issues/false-cross-pitch-attribution-in-a-shared-uncommitted-file` (flag overlapping dirty files, do not guess ownership); `patterns/allow-list-untrusted-labels-at-ingest-and-at-render` and `parse-untrusted-values-and-re-emit-them` for peer mail; `resolve-config-only-from-trusted-root` (read policy from the coordinator, not a worker tree); `prove-a-guard-test-with-an-in-memory-mutant`; `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers`. Historian read the first four in full and judged the rest from index summaries. |

Disposition options: **Address** (revise pitch: split per C1, add C2-C7), **Acknowledge**, **Override**. Recommended: address C1-C4 and cite C5-C7 before `/plan`.

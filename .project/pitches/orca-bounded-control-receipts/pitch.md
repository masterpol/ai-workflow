# Pitch: orca-bounded-control-receipts

**Date**: 2026-10-22  •  **Appetite**: small-batch
**Stack**: workflow tooling (`orca-start.mts`, Orca adapter/preflight scripts, tests)
**Origin**: cooldown candidate C7 (`runs/cooldown-2026-10-21-forced.md`), approved to become a pitch 2026-10-22. Draft: not yet shaped or bet.

## Problem

Two healthy-runtime situations make the Orca control plane fail closed for the wrong reason: startup reports
`worker-identity-unavailable` because the worker-list receipt (268,003 bytes) exceeded `MAX_OUTPUT_BYTES` (262,144); and an OpenCode
model-pin preflight refusal (installed 2.1.1) is reduced to `launch-failed:unproven`, claiming unknown ownership. Recovery today
needed an owner-requested `orchestration reset --tasks`.

## Knowledge consulted

- issues/`orca-model-preflight-can-leave-unproven-ledger-ownership` — the second failure.
- patterns/`an-ownership-predicate-must-mirror-the-claim-transactions-set` and `verify-run-binding-before-orca-dispatch` — ownership stays fail-closed.
- decisions/`orca-auto-start-design`, `runtime-boundary-validator-design`.
- rule `coding-standards.md` "Producer and Reader Share One Bound" (promoted by the same cooldown).

## Solution sketch (breadboard)

**Places**: `orca-start.mts` `lookupWorker`, `orca-preflight.mts`, the launch/claim path that records ownership.

**Affordances**: (1) paginated or projected worker-list requests that stay under the bound, plus a regression over a large
historical fleet; (2) a bounded, safe capability probe or error receipt before claiming ownership, so a structured preflight
refusal is reported as itself without weakening liveness rules.

**Connections**: start → identity lookup (bounded) → preflight capability receipt → claim or refuse with a precise reason.

## Rabbit holes

**Pushed to /shape**: pagination support in the Orca CLI vs a narrower field projection; how to keep unknown-liveness ownership
fail-closed; cleanup stays an explicit user action; capability matrix for OpenCode pins.

## Scope note

The "guard reader bounds" half of the original candidate was already fixed: the review guard shares a 16 MiB snapshot read/write bound
and skips protected names before reads (see `_followups.md`, token-time-report). It is out of this pitch.

## No-gos (this pitch)

- ✗ No automatic cleanup or reset of workers or tasks; cleanup requires explicit authorization.
- ✗ No weakening of fail-closed ownership.
- ✗ No change to Orca-owned behavior outside this repo's adapter code.

## Critique findings

(Empty until /critique runs.)

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — reason: {…}

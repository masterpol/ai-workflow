---
id: orca-identity-lookup-and-refusal-reporting
type: decision
status: accepted
created: 2026-11-23
updated: 2026-11-23
tags: [orca, preflight, identity, receipts, fail-closed]
related: [a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller, a-receipt-field-reaches-a-reason-only-as-a-bounded-token, orca-worker-list-concise-view-hides-the-worker-identity-fields, orca-model-preflight-can-leave-unproven-ledger-ownership, orca-workers-differ-from-the-coordinator-environment]
alternatives: [paginate-the-full-record, project-fewer-fields]
applies-to: [orca-start, orca-dispatch]
source: orca-bounded-control-receipts
---

# Decision: the Orca caller-identity lookup is bounded by live work, and a refused start keeps its reason without weakening ownership

## Summary

The identity lookup asks `worker-list` per terminal state other than `released` in the concise view and halves `--limit` when a page is over the shared output bound; a structured worker-start refusal is reported as `launch-failed:refused:<code>` while ownership stays `unknown-liveness`.

## Context

A full 100-row `worker-list` page is about 262,900 bytes, over the 262,144-byte bound, which blocked every phase with `worker-identity-unavailable` once the fleet had history; and an OpenCode model-pin refusal was reduced to `launch-failed:unproven`, losing its cause. Orca's own supported-version list for model pinning is Orca-internal, so this repo cannot probe it.

## Decision

- **Projection over pagination.** Query the terminal states `active`, `retained`, `reclaimable`, `release_pending` and `release_unknown` (the complement of `released`: an open dispatch cannot sit in a released terminal). Fall back to one unfiltered `--full --limit 25` read if the CLI does not know the filter; halve `--limit` (100, 50, 25, 10) on an oversize page or `ENOBUFS`, carrying the size that worked; end a never-ending listing with the reason `worker-list-too-large`.
- **Reasons carry only tokens.** A refusal `code` or a `failedStage` is reported only if it is a lower-case token of at most 64 characters; nothing else from a receipt is echoed.
- **Ownership is unchanged.** The code says why a start was refused; it does not prove that nothing was created, so the task, its capacity and `unknown-liveness` stay until a person has proof.

## Delivered scopes, no-gos and rabbit holes (kept when the pitch folder was compacted, 2026-11-23)

**Scopes.** S1 (bounded lookup) and S2 (refusal reason) shipped; S3, capturing one real pre-creation refusal receipt, was deferred because it creates Orca coordination state (followup: save it as `.project/analysis/orca-opencode-pin-refusal-receipt.json`).

**No-gos honored.** No automatic cleanup or reset of workers or tasks; no weakening of fail-closed ownership (tests assert the ledger state, `task-already-owned` and no retry); no change to Orca-owned behaviour.

**Rabbit holes.** Resolved at plan time: pagination vs projection (projection), unknown-liveness stays fail-closed, cleanup stays an explicit user action, the OpenCode pin capability matrix is Orca's. Surfaced in the audit and fixed: an `active`-only filter is fail-open ([[a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller]]); an existing unbounded `failedStage` echo ([[a-receipt-field-reaches-a-reason-only-as-a-bounded-token]]). Open: whether Orca accepts a cursor reused after the page size changes; whether the five states cover every state an open dispatch can have on a real worker; a phase start is about 0.5 s slower.

**Verification at ship.** Full suite 2101 pass, 0 fail, 3 skipped; 10 in-memory mutants killed; live Orca 1.4.271 `ready`; audit cycle 1 had 0 must-fix and 5 should-fix fixed (`.project/analysis/2026-11-23-orca-bounded-control-receipts-audit.md`), not independently re-reviewed.

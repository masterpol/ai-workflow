---
id: orca-worker-list-concise-view-hides-the-worker-identity-fields
type: issue
created: 2026-11-23
updated: 2026-11-23
tags: [orca, preflight, cli-contract, launch-gate]
related: [orca-workers-differ-from-the-coordinator-environment, orca-model-preflight-can-leave-unproven-ledger-ownership, a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller]
source: manual
severity: high
resolved: true
confidence: low
---

# Issue: an Orca CLI upgrade silently changed output the launch gate parses

## Summary

After Orca 1.4.271 every workflow phase failed with `worker-identity-unavailable`, because `worker-list --json` printed a concise view without the fields the gate read.

## Symptoms
- `orca-run.mts start` returned `blocked: worker-identity-unavailable` for every phase; the unit tests still passed because they mock the CLI.
- After that fix a second block, `orchestration-guide-unsupported`, appeared.

## Root Cause
Three independent drifts: (1) the concise view replaced `agentTerminalHandle` and `dispatchStatus` with `terminal` and `state`, and only `--full` keeps the old record; (2) context-only dispatches have `agentTerminalHandle: null`, which the strict "must be a string" check treated as a malformed list; (3) the `orchestration` guide now says `check`, not `orchestration check`.

## Solution
Pass `--full`, skip rows whose handle is `null`, and match the guide on `check`. Each has a test with the new shape.

## Prevention
Probe the real CLI output when a gate fails after a vendor upgrade, not only the mocked fixtures. A new "real shape" fixture per upgrade would have caught all three at once.

## Follow-up: make the gate tolerate the next update (2.51.2)

Fixing the three drifts one at a time would have left the gate one rename away from the next outage. The gate now reads only what it uses: the row for its own terminal (full record or concise view), the commands it calls in the guide (`worker-start`, `worker_done`), and more places for the dispatch id. Rows of other terminals, a missing `page` and a rejected `--full` no longer block. A row for its own terminal with an unrecognised status still fails closed. Tests use the shapes recorded from 1.4.224 and 1.4.271 and 7 in-memory mutants; the policy and the update procedure are in `orca-vendors.md` under "Surviving Orca updates".

## Second follow-up: bound the answer, not just the shape (orca-bounded-control-receipts)

The 2.51.2 tolerance still asked for `--full`; a full 100-row page is about 262,900 bytes, over the shared 262,144-byte bound, which is the original incident, and it was only saved by a retry. The lookup now asks per terminal state (every state except `released`) in the concise view, halves `--limit` on an oversize page, and falls back to `--full --limit 25` when the filter is rejected. See [[a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller]].


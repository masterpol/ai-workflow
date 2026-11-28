---
id: orca-collect-refuses-a-path-that-dispatch-authorized
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: high
tags: [orca, dispatch, ledger]
related: [orca-model-preflight-can-leave-unproven-ledger-ownership, changing-a-shipped-template-or-skill-has-hidden-consumers]
source: greenfield-kickoff
severity: medium
resolved: false
---

# Issue: Orca collect refuses a path that dispatch authorized

## Summary
Dispatch accepts a `.project` entry in `authorizedPaths`, but collect refuses a report that lists such a file.

## Symptoms
- `orca-run collect` returns `invalid-files`.
- The attempt stays `launched` after the worker is released, and it counts against the concurrency cap.
- With three older stale records, every slot was counted as taken.

## Root Cause
The two steps apply different path rules.

## Solution
Not fixed. The stale records were moved unchanged into a local archive, with the owner's approval, after Orca showed each worker exited and released.

## Prevention
- Do not authorize a `.project` path for a worker to change. The coordinator makes that edit.
- Refuse the path at dispatch, or define a recovery for released workers.

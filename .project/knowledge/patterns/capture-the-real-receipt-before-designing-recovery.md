---
id: capture-the-real-receipt-before-designing-recovery
type: pattern
confidence: low
created: 2026-11-23
updated: 2026-11-23
tags: [orca, receipts, recovery, spike, evidence]
related: [retry-only-on-positive-proof-of-a-clean-failure, a-receipt-field-reaches-a-reason-only-as-a-bounded-token, replace-a-library-with-a-fixture-table-from-the-library, opencode-agent-id-comes-from-the-installed-agent-list]
source: orca-api-currency-and-opencode2
---

# Pattern: observe the real receipt before designing recovery or defaults around it

## Summary

Three authorized real launches (a bad agent id, a clean start, a start cut off by a 1 ms `--timeout-ms`) each overturned or settled an assumption the shaped pitch rested on, and one of them removed a whole scope. Reading help text and guides had not shown any of it.

## What the launches showed

- The default id `opencode2` fails here; the id that works is `opencode` (see the decision).
- The request id is not in the concise receipt. It appears under `--full` as `result.mutation.requestId` (success, failed start, timeout) and in a refusal as `error.data.orchestrationRequestId`. The envelope `id` is a different, per-call id.
- `request-show` says `absent` for a refusal and `completed` (with the whole receipt) for a started or timed-out request. Orca's own timeout returns a structured failed receipt with the id, so settling a lost response by replay (`--retry-request`) added risk without information, and that scope was dropped.

## How to apply

When a plan depends on what an external CLI returns on an edge (refusal, timeout, lost response), put one owner-authorized real capture early in the plan, before the scopes that depend on it, and write the recorded receipt into the fixtures. Keep `absent` and "no failure stage" out of proof rules.

---
id: a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller
type: pattern
created: 2026-11-23
updated: 2026-11-23
tags: [orca, identity, fail-closed, filters, security]
related: [orca-worker-list-concise-view-hides-the-worker-identity-fields, orca-workers-differ-from-the-coordinator-environment, a-planted-canary-makes-a-reviewer-finding-checkable]
source: orca-bounded-control-receipts
confidence: low
---

# Pattern: a server-side filter that shrinks an identity lookup must cover the complement of "cannot be me"

## Summary

To keep the Orca worker lookup under its output bound the first design asked only for `active` terminals. That fails open: any state in which a worker's dispatch is still open but its terminal is not `active` (kept open, being released) makes a worker look like a coordinator, and it would start coordinating.

## How to apply
- State the property as "an open dispatch cannot be in state X", and query the complement of X, not the state you expect (here: every terminal state except `released`; the CLI lists exactly six).
- A "not found" from a filtered query is only as strong as the filter. Test it with a row that sits in each state you excluded.
- When the filter is not understood, fall back to one unfiltered read, which covers all states at once, rather than treating the rejection as "not found".
- Carry the size that worked into the next query so several small queries cost no more oversize retries than one.

## Evidence
Found by the security reviewer as a should-fix (the Orca semantics could not be proved without a real worker); fixed by design with a test that places the worker in `retained`, plus three mutants. Cost: about 0.5 s per phase start.

---
id: an-ownership-predicate-must-mirror-the-claim-transactions-set
type: pattern
created: 2026-10-17
updated: 2026-10-17
tags: [orca, ledger, state-machine, retry, testing]
related: [reversible-aggregates-store-their-routing, retry-only-on-positive-proof-of-a-clean-failure, prove-a-guard-test-with-an-in-memory-mutant, settle-only-with-proof-bound-to-this-patch]
source: orca-role-pools
---

# Pattern: a "who owns this task" read must use the same state set as the transaction that claims it

## Summary

When an unlocked read decides what to do next (`resolveAssignment`) and a locked transaction later enforces it (`reserve`), the read's idea of "owner" must be the transaction's task-owned set, stated positively (`claimed`, `launched`, `unknown-liveness`, `completed`, plus a settled attempt that was completed first). Writing it negatively ("not failed") quietly classifies every state added or reachable later, such as `failed -> settled`, as an owner.

## What happened

The first cut was `owner = attempts.find(state !== "failed")`. A clean failure that was later settled (a legal transition) counted as the owner, so rotation to the next pool member never happened and `reserve` (settled is not task-owned) relaunched the failed vendor. The code reviewer found it; a test and a mutant now pin it. A second gap showed up while choosing a canary for the re-review: no test used `unknown-liveness` as a holder, so dropping it from the predicate would have rotated a possibly-live worker to a second writer. The final `reserve` check would still have refused the claim, which is why nothing failed.

## How to apply

- Derive the holder set from the claiming transaction, name it once, and test every `STATES` member against it.
- A settled attempt keeps ownership only when its record proves it succeeded (report id present); no proof means a tried vendor.
- Pick a reviewer canary that breaks a test; if none exists, you have found an untested invariant, so add the test first.

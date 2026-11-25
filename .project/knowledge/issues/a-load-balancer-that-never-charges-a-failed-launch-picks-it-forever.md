---
id: a-load-balancer-that-never-charges-a-failed-launch-picks-it-forever
type: issue
created: 2026-11-25
updated: 2026-11-25
tags: [orca, scheduling, assignment, fail-closed, code-review]
related: [recheck-an-optimistic-pick-under-the-claim-lock, an-ownership-predicate-must-mirror-the-claim-transactions-set]
source: orca-balanced-role-pools
severity: high
resolved: true
---

# Issue: a worker that fails before it is claimed never gains load, so least-load picks it every time

## Symptom
Orca role pools picked the least-loaded member, counting load from claimed ledger records. A member that could not launch before any claim (not installed, no agent id, not a configured worker) never produced a record.
It stayed at load 0, won every later pick, and each dispatch fell back to the normal workflow. The old round-robin had moved past it by plan position.
Two audit cycles missed it; a later `/code-review` of the branch found it.

## Fix and rule
- A **load pick** that fails before a claim is skipped for the next least-loaded member; if every member fails, report the first launch failure, not "pool exhausted". A recorded owner is never skipped.
- When a scheduler's signal is derived from successful claims, ask what a member that **cannot produce the signal** looks like. Test the member that always fails before the first write, not only the one that fails after it.

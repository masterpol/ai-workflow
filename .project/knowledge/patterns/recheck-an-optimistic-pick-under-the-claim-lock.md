---
id: recheck-an-optimistic-pick-under-the-claim-lock
type: pattern
created: 2026-11-25
updated: 2026-11-25
tags: [orca, concurrency, ledger, scheduling, assignment]
related: [an-ownership-predicate-must-mirror-the-claim-transactions-set, a-load-balancer-that-never-charges-a-failed-launch-picks-it-forever]
source: orca-balanced-role-pools
confidence: low
---

# Pattern: pick from a snapshot, then re-check the pick inside the claim lock

## Summary
A choice made from a listing (here: the least-loaded worker) can be stale by the time it is claimed. Do not hold the lock while choosing.
Pass the claim transaction a pure `admit(records)` check that runs under the lock and writes nothing when it fails; the caller then picks again.

## The Pattern
- Re-check **only choices made by the rule being checked.** A recorded owner or a rotation after a clean failure is chosen by another rule; re-checking it against load caused a spurious second resolution and a second host probe.
- **Re-check the retry too**, with a small bound, and let the last try claim without the check so a busy queue cannot loop. A single unchecked retry left the race it was built to close.
- An **empty history is not an error**: the first claim of a Run has no ledger directory and still needs the check.
- Balancing fails open when the listing is unavailable; ownership, capacity and path overlap stay enforced by the claim itself.
- Test it by injecting a competing claim at the lock, and show a mutant that drops the check fails.

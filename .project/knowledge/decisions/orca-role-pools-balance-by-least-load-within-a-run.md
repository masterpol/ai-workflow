---
id: orca-role-pools-balance-by-least-load-within-a-run
type: decision
status: accepted
created: 2026-11-25
updated: 2026-11-25
tags: [orca, scheduling, assignment, ledger]
related: [recheck-an-optimistic-pick-under-the-claim-lock, a-load-balancer-that-never-charges-a-failed-launch-picks-it-forever, an-ownership-predicate-must-mirror-the-claim-transactions-set]
alternatives: [plan-position-round-robin, whole-plan-optimal-assignment, weights-per-vendor]
applies-to: [build, audit]
source: orca-balanced-role-pools
---

# Decision: an Orca pool pick takes the least-loaded eligible member of the current Run

## Summary
Round-robin by plan position never balanced across roles: one session sent 9 dispatches to codex, 7 to claude and 0 to opencode. The pick is now
deterministic from the ledger: lowest load across both roles in this Run, plan position breaking ties (so equal loads equal the old order). This lifts
the earlier "no load scheduling" exclusion for this one rule only.

## Decision
- Load counts the attempts `reserve()` treats as owned; proven-clean failures and other Runs do not count. A record without a `runId` is another Run.
- The guarantee is greedy fairness at each pick, not equal totals: unequal pools give unequal totals.

## Limits (kept)
- No change to launch authority, the gate, retries, rotation after a clean failure or the path overlap guard.
- No new config key or schema version; the pools stay as configured. An owned or recorded task is never reassigned.
- No ledger migration: `runId` is optional and set once. No new Orca CLI call: the Run id is coordinator input.
- The rule has one owner, `ai-framework/integrations/orca-vendors.md`; `2-build.md` only points to it. No copies in skill Orca blocks.
- Left out: whole-plan assignment, per-vendor weights, work stealing, cost-aware routing, Run identity in task keys, balanced pitch-level reviewers.

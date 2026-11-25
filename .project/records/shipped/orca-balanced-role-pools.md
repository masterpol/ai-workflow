---
slug: orca-balanced-role-pools
shipped: 2026-11-25
schemaVersion: 1
---
# orca-balanced-role-pools

An Orca dispatch with `assign` picks the least-loaded eligible pool member of its Run across both roles; plan position breaks ties, so equal loads behave like the old round-robin.
Dispatch takes an optional `runId`; the pick is re-checked inside the claim lock, and a member that cannot launch before a claim is skipped.
A recorded owner still wins, a reviewer is never the implementer, and rotation happens only after a proven-clean failure.
Audit: two cycles by Orca workers (not independent, no canaries); later code-review changes were not audited.

- outcome: work spreads across the configured workers and both roles instead of by plan position alone.
- docs: [Orca vendor contract](ai-framework/integrations/orca-vendors.md)
- decisions: none
- knowledge: [re-check a pick under the lock](.project/knowledge/patterns/recheck-an-optimistic-pick-under-the-claim-lock.md), [a failed launch is never charged](.project/knowledge/issues/a-load-balancer-that-never-charges-a-failed-launch-picks-it-forever.md)
- code: [picker](ai-framework/scripts/orca-assign.mts), [dispatch](ai-framework/scripts/orca-dispatch.mts), [ledger](ai-framework/scripts/orca-ledger.mts), [run input](ai-framework/scripts/orca-run.mts)
- verification: [audit synthesis](.project/analysis/2026-11-24-orca-balanced-role-pools-audit.md), [ship log](.project/runs/2026-11-25-orca-balanced-role-pools.md)
- followups: [backlog](.project/pitches/_followups.md)
- archive: [full log](.project/runs/2026-11-25-orca-balanced-role-pools.md), [hill chart](.project/runs/2026-11-25-orca-balanced-role-pools-hill.md)

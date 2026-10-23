---
slug: orca-role-pools
shipped: 2026-10-17
schemaVersion: 1
---
# orca-role-pools

A coordinator can now list itself and several workers, and a role can be a pool of up to three distinct vendors.
A pure assignment module splits scopes round-robin, keeps reviewer different from implementer and rotates only after a proven clean failure.
Launch authority is unchanged; overlapping authorized paths across live scopes are refused. Concurrency above 3 is unverified.

- outcome: Orca roles accept worker pools with deterministic, resumable assignment and a path-overlap guard.
- docs: [orca vendors](ai-framework/integrations/orca-vendors.md)
- decisions: [build decisions and deviations](.project/records/legacy-upgrades/orca-role-pools.md#build-decisions-and-deviations)
- knowledge: [schema bump left stale tests](.project/knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md), [ownership predicate](.project/knowledge/patterns/an-ownership-predicate-must-mirror-the-claim-transactions-set.md), [gate spawns what it probed](.project/knowledge/patterns/a-gate-spawns-exactly-what-it-probed.md)
- code: [assign](ai-framework/scripts/orca-assign.mts), [policy](ai-framework/scripts/orca-policy.mts), [dispatch](ai-framework/scripts/orca-dispatch.mts), [ledger](ai-framework/scripts/orca-ledger.mts)
- verification: [verification and historical counts](.project/records/legacy-upgrades/orca-role-pools.md#verification-and-historical-counts)
- followups: [follow-ups and historical limits](.project/records/legacy-upgrades/orca-role-pools.md#follow-ups-and-historical-limits), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/orca-role-pools.md)

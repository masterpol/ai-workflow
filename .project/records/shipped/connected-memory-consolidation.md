---
slug: connected-memory-consolidation
shipped: 2026-10-23
schemaVersion: 1
---
# connected-memory-consolidation

The workflow keeps its process as a graph, ships work as bounded v2 outcome records with checked coverage ledgers, and migrates installed projects; all 46 legacy pitches are upgraded with v1 ledgers and archives kept.
Four tracks shipped under separate owner-approved receipts; later work added reviewed destination drift, group entries for large pitch folders and safer narrative retirement.
Owner-approved exceptions: token-time-report retained 9.74% of its source, and the state-history archive fallback is deferred.

- outcome: Process graph, v2 coverage ledgers, installed sync and a gated legacy upgrade shipped as four tracks, with all 46 legacy pitches upgraded.
- docs: [rollup](.project/records/consolidation/rollup.md), [plan](.project/records/consolidation/plan.md), [versioning and sync](ai-framework/docs/versioning-and-sync.md)
- decisions: [drift acceptance binds both versions](.project/knowledge/decisions/legacy-upgrade-drift-acceptance-binds-both-versions.md), [deviations](.project/records/consolidation/deviations.md)
- knowledge: [pitch folders accumulate staging](.project/knowledge/issues/pitch-folders-accumulate-staging-nothing-consumes.md), [group entry pattern](.project/knowledge/patterns/a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash.md), [archive authorization boundary](.project/knowledge/issues/verified-cache-review-does-not-authorize-archive-search.md), [typed navigation](.project/knowledge/issues/valid-outcome-records-can-lack-queryable-navigation.md), [case aliases](.project/knowledge/issues/case-aliases-bypassed-compaction-destination-protection.md)
- code: [legacy upgrade](ai-framework/scripts/legacy-upgrade.mts), [ledger schema](ai-framework/scripts/ledger-schema.mts), [relations](ai-framework/scripts/graphify-relations.mts)
- verification: [track receipts](.project/records/consolidation/tracks.md), [ship verification](.project/runs/2026-10-22-connected-memory-consolidation-ship-verification.md)
- followups: [remaining work](.project/records/consolidation/remaining-work.md), [backlog](.project/pitches/_followups.md)
- archive: [audit cycles](.project/records/consolidation/audit-cycles.md), [audit reviews](.project/records/consolidation/audit-reviews.md), [full log and hill](.project/runs/2026-10-23-connected-memory-consolidation.md)

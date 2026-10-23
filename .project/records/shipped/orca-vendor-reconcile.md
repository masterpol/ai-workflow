---
slug: orca-vendor-reconcile
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-reconcile

Reconciliation admits and checks worker changes before integration.
Evidence and cleanup decisions remain bound to the integrated patch.
Historical review chronology and assurance limits remain separately recorded.

- outcome: Guarded reconciliation preserves user changes and patch-bound settlement evidence.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md#reconcile-core-opt-in-library-only)
- decisions: [approved scope](.project/records/legacy-upgrades/orca-vendor-reconcile.md#scope-and-build-decisions)
- knowledge: [patch-bound settlement](.project/knowledge/patterns/settle-only-with-proof-bound-to-this-patch.md)
- code: [reconcile core](ai-framework/scripts/orca-reconcile.mts)
- verification: [historical closure](.project/records/pitch-compression/orca-vendor-reconcile.md)
- followups: [assurance limits](.project/records/legacy-upgrades/orca-vendor-reconcile.md#historical-assurance-and-limitations)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-reconcile.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-reconcile.md)

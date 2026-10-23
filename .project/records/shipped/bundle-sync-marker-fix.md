---
slug: bundle-sync-marker-fix
shipped: 2026-09-26
schemaVersion: 1
---
# bundle-sync-marker-fix

Bundle sync records the effective base for each file outcome.
The decision and code links below describe the current implementation.
Historical verification and closure evidence remain in the compact record.

- outcome: Bundle sync retains correct per-file bases across repeated comparisons.
- docs: [documentation](ai-framework/docs/versioning-and-sync.md)
- decisions: [decision](.project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md)
- knowledge: none
- code: [implementation](ai-framework/scripts/bundle-sync.mts)
- verification: [historical closure](.project/records/pitch-compression/bundle-sync-marker-fix.md)
- followups: none
- archive: [compact record](.project/records/pitch-compression/bundle-sync-marker-fix.md), [source supplement](.project/records/legacy-upgrades/bundle-sync-marker-fix.md)

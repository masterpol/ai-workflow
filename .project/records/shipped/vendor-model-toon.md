---
slug: vendor-model-toon
shipped: 2026-10-17
schemaVersion: 1
---
# vendor-model-toon

ai-workflow.toon gained a models block at schemaVersion 3 that maps each vendor's fast, standard and deep profile to a model, with strict validation.
config-migrate converts a version 2 file in place, keeping values, comments and line endings, and the example and README show the block.
Agent files were left untouched; the block was inert until the later agent-model-sweep pitch.

- outcome: Projects declare model identifiers per vendor profile in one validated block, and version 2 files migrate in place.
- docs: [example toon](ai-framework/templates/ai-workflow.example.toon), [model routing rule](ai-framework/rules/model-routing.md), [harnesses](ai-framework/integrations/harnesses.md)
- decisions: [TOON subset grammar](.project/decisions/toon-subset-grammar.md)
- knowledge: [migrator edits the token](.project/knowledge/patterns/a-version-migrator-edits-the-token-not-the-model.md), [schema bump left stale tests](.project/knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md)
- code: [config](ai-framework/scripts/runtime/config.mts), [config-migrate](ai-framework/scripts/config-migrate.mts)
- verification: [verification history](.project/records/legacy-upgrades/vendor-model-toon.md#verification-history)
- followups: [historical limits](.project/records/legacy-upgrades/vendor-model-toon.md#historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/vendor-model-toon.md)

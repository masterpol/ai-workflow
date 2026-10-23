---
slug: unified-toon-config
shipped: 2026-10-16
schemaVersion: 1
---
# unified-toon-config

All workflow configuration now lives in one root ai-workflow.toon read through loadConfig, with the legacy JSON files kept as a one-minor fallback.
A migrator converts legacy files with backups, dual-hash tracking and a fresh-process re-parse, and it never deletes them; an owner reshape moved Orca settings under integrations.orca at schemaVersion 2.
Two audit cycles fixed a ReDoS and a terminal escape echo; later pitches changed the schema again.

- outcome: One validated TOON file configures the workflow, migrated by a guarded CLI, with legacy files read as a temporary fallback.
- docs: [example toon](ai-framework/templates/ai-workflow.example.toon), [runtime README](ai-framework/scripts/runtime/README.md)
- decisions: [schema v2](.project/knowledge/decisions/unified-toon-config-schema-v2.md), [TOON subset grammar](.project/decisions/toon-subset-grammar.md)
- knowledge: [untrusted text in errors](.project/knowledge/patterns/untrusted-text-reaches-the-terminal-through-error-messages.md), [quadratic regex](.project/knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md), [reconcile every worker](.project/knowledge/patterns/reconcile-every-worker-of-a-wave-before-committing-any-scope.md)
- code: [config](ai-framework/scripts/runtime/config.mts), [migrator](ai-framework/scripts/config-migrate.mts), [orca policy](ai-framework/scripts/orca-policy.mts)
- verification: [verification history](.project/records/legacy-upgrades/unified-toon-config.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/unified-toon-config.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/unified-toon-config.md)

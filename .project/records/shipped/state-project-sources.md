---
slug: state-project-sources
shipped: 2026-11-25
schemaVersion: 1
---
# state-project-sources

At project depth, `/state` reads a project's schema from a Drizzle snapshot or from SQL migrations in any dialect, at the root or under a workspace, and lists monorepo workspace packages.
The page names the source it used, the alternatives, and what it found but did not read; status fails closed, so a schema is `observed` only when every statement was understood.
The SQL reader is pure text in, schema out; it never executes, connects or imports. Names from project files are refused on a credential shape and never copied into the facts.
Audit: three cycles by Orca workers (not independent, no canaries); the cycle-3 fixes were not re-reviewed.

- outcome: LAH's page shows 13 tables from its SQL migrations instead of a stale 9, and a nested or SQL-only schema is no longer reported as "unconfigured".
- docs: [state report contract](ai-framework/integrations/state-report.md)
- decisions: [SQL migrations as a neutral schema source](.project/knowledge/decisions/state-sql-migrations-as-a-neutral-schema-source.md)
- knowledge: [credential check on names](.project/knowledge/issues/a-word-boundary-credential-check-misses-joined-and-long-names.md), [quadratic string build](.project/knowledge/issues/a-string-built-in-a-loop-by-reading-its-last-character-is-quadratic.md)
- code: [SQL reader](ai-framework/scripts/facts-sql.mts), [project readers](ai-framework/scripts/facts-project.mts), [collector](ai-framework/scripts/facts-gather.mts)
- verification: [audit synthesis](.project/analysis/2026-11-24-state-project-sources-audit.md), [ship log](.project/runs/2026-11-25-state-project-sources.md)
- followups: [backlog](.project/pitches/_followups.md)
- archive: [full log](.project/runs/2026-11-25-state-project-sources.md), [hill chart](.project/runs/2026-11-25-state-project-sources-hill.md)

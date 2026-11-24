---
slug: state-project-depth
shipped: 2026-11-24
schemaVersion: 1
---
# state-project-depth

In a project with the workflow installed, `/state` adds a Drizzle schema ERD, a two-level folder tree and the stack; this bundle stays simple.
`bundle-sync --apply` resets the last `/state` delivery when it changes files, only for files whose hashes match Archify's receipt.
`/state` never replaces a draft it did not write or deliver; ownership checks pin the descriptor that was hashed.
Audit: three cycles by Orca workers (not independent, no canaries); a real schema broke the first ERD and was fixed.

- outcome: an installed project's state page shows its schema, layout and stack, and a bundle update no longer leaves a stale page behind.
- docs: [state report contract](ai-framework/integrations/state-report.md)
- decisions: [project depth for installed projects](.project/knowledge/decisions/state-project-depth-for-installed-projects.md)
- knowledge: [a real schema breaks a naive ERD](.project/knowledge/issues/a-real-schema-breaks-a-naive-erd.md), [pin the descriptor you hashed](.project/knowledge/patterns/pin-the-descriptor-you-hashed-before-removing-or-replacing.md)
- code: [project readers](ai-framework/scripts/facts-project.mts), [collector](ai-framework/scripts/facts-gather.mts), [bundle sync](ai-framework/scripts/bundle-sync.mts)
- verification: [audit synthesis](.project/analysis/2026-11-24-state-project-depth-audit.md), [ship log](.project/runs/2026-11-24-state-project-depth.md)
- followups: [backlog](.project/pitches/_followups.md)
- archive: [full log](.project/runs/2026-11-24-state-project-depth.md), [hill chart](.project/runs/2026-11-24-state-project-depth-hill.md)

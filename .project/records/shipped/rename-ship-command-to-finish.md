---
slug: rename-ship-command-to-finish
shipped: 2026-11-25
schemaVersion: 1
---
# rename-ship-command-to-finish

The ship phase is started with `/ship-pitch`, because a host's built-in `/ship` shadowed the workflow command; the phase is still `ship` wherever it is data.
One mapping turns commands into phases for the startup and metrics hooks, and a guard test refuses the old command in bundle-owned text.
`bundle-sync --apply` removes the old adapters in installed projects only when their content is one this bundle shipped; any other copy is kept and reported.
Audit: two cycles by Orca workers (not independent); the last fixes were not re-reviewed.

- outcome: the close-out runs again, and an upgraded project does not keep two commands for one phase or lose a file it customized.
- docs: [state of the pipeline](ai-framework/docs/pipeline.md), [Orca vendor contract](ai-framework/integrations/orca-vendors.md)
- decisions: none
- knowledge: [a command shadowed by a built-in](.project/knowledge/issues/a-workflow-command-can-be-shadowed-by-a-host-built-in.md), [prove ownership before removing](.project/knowledge/patterns/prove-ownership-by-shipped-content-before-removing-a-renamed-file.md)
- code: [mapping](ai-framework/scripts/phase-commands.mts), [bundle sync](ai-framework/scripts/bundle-sync.mts), [skill](.claude/skills/ship-pitch/SKILL.md)
- verification: [audit synthesis](.project/analysis/2026-11-25-rename-ship-command-audit.md), [ship log](.project/runs/2026-11-25-rename-ship-command-to-finish.md)
- followups: [backlog](.project/pitches/_followups.md)
- archive: [full log](.project/runs/2026-11-25-rename-ship-command-to-finish.md), [hill chart](.project/runs/2026-11-25-rename-ship-command-to-finish-hill.md)

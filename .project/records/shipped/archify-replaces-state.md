---
slug: archify-replaces-state
shipped: 2026-11-23
schemaVersion: 1
---
# archify-replaces-state

/state now gathers facts with a bounded collector and renders the page with the pinned Archify skill, replacing about 10,000 lines of bespoke snapshot, theme and AI-fragment code.
Archify is installed per checkout and git-ignored; /state stops after the facts preview when it is absent. Full history is in the recovery archive archify-replaces-state-2026-11-23T15-50-40-947Z.
The audit had no must-fix and its should-fix items were fixed, but the fixes were not independently re-reviewed.

- outcome: /state is a fact collector plus the pinned Archify skill; the old snapshot, renderer and AI-fragment code is removed and five shipped records were retargeted.
- docs: [state report contract](ai-framework/integrations/state-report.md), [state skill](.claude/skills/state/SKILL.md)
- decisions: [Archify renders the state report](.project/knowledge/decisions/archify-renders-the-state-report.md), [state report design (superseded in part)](.project/knowledge/decisions/project-state-report-design.md)
- knowledge: [link check parses code spans](.project/knowledge/issues/a-link-check-that-strips-code-with-one-regex-can-hide-links.md), [deleting a cited file breaks records](.project/knowledge/issues/deleting-a-file-breaks-shipped-outcome-records-that-link-to-it.md), [a contract claim needs a test per member](.project/knowledge/patterns/a-contract-claim-of-same-families-needs-a-test-per-member.md)
- code: [fact collector](ai-framework/scripts/facts-gather.mts), [collector tests](ai-framework/scripts/facts-gather.test.mts), [skill source link check](ai-framework/scripts/skill-source.mts)
- verification: [Archify v3.3.0 validation](.project/analysis/2026-11-23-archify-v3.3.0-validation.md), [audit synthesis](.project/analysis/2026-11-23-archify-replaces-state-audit.md), [ship log](.project/runs/2026-11-23-archify-replaces-state.md)
- followups: [backlog](.project/pitches/_followups.md)
- archive: [full log](.project/runs/2026-11-23-archify-replaces-state.md), [hill chart](.project/runs/2026-11-23-archify-replaces-state-hill.md)

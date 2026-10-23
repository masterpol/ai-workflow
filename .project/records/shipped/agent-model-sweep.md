---
slug: agent-model-sweep
shipped: 2026-10-16
schemaVersion: 1
---
# agent-model-sweep

Canonical agents declare a capability profile in frontmatter and no longer name a model.
The doctor reads profiles from that key, warns without it and no longer guesses from model prefixes.
Cursor mirrors, opencode routing, tests and docs changed together; other vendor mirrors stayed for a later bet.

- outcome: Agent profiles come from one frontmatter key checked by the doctor and an invariant test.
- docs: [harnesses](ai-framework/integrations/harnesses.md), [vendors](ai-framework/docs/vendors.md), [extending](ai-framework/docs/extending.md)
- decisions: [profile detection in frontmatter](.project/knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md)
- knowledge: [warn text consistency](.project/knowledge/patterns/warn-text-must-be-self-consistent-with-the-code-it-ships.md), [mandatory config check](.project/knowledge/patterns/mandatory-config-files-emit-one-top-level-failure.md)
- code: [doctor](ai-framework/scripts/workflow-doctor.mts), [invariant test](ai-framework/scripts/agent-frontmatter-invariant.test.mts)
- verification: [historical counts](.project/records/legacy-upgrades/agent-model-sweep.md#verification-and-historical-counts)
- followups: [Bet 3 and historical limits](.project/records/legacy-upgrades/agent-model-sweep.md#follow-ups-and-historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/agent-model-sweep.md)

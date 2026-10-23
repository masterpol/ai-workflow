---
slug: fix-instruction-conflicts
shipped: 2026-10-18
schemaVersion: 1
---
# fix-instruction-conflicts

Conflicting instructions across phase specs, skills, agents and rules now agree, with one owner per topic.
No gate, reviewer, evidence requirement or permission boundary was removed.
Contract tests guard the owners; live behavior across vendors was not verified.

- outcome: Each instruction topic has one owning file and contract tests keep its copies consistent.
- docs: [orca vendors](ai-framework/integrations/orca-vendors.md), [vendors](ai-framework/docs/vendors.md), [skill defaults](ai-framework/integrations/skill-defaults.md)
- decisions: [findings and owners](.project/records/legacy-upgrades/fix-instruction-conflicts.md#findings-and-owners)
- knowledge: [one owner per topic](.project/knowledge/patterns/one-owner-per-instruction-topic-guarded-by-contract-tests.md), [instruction drift](.project/knowledge/issues/instruction-copies-drift-into-contradictions.md)
- code: [contract tests](ai-framework/scripts/workflow-contracts.test.mts), [security reviewer](.claude/agents/security-reviewer.md), [overview](ai-framework/workflow/overview.md)
- verification: [review chronology](.project/records/legacy-upgrades/fix-instruction-conflicts.md#review-chronology), [validation pass](.project/records/legacy-upgrades/fix-instruction-conflicts.md#validation-pass)
- followups: [historical limits](.project/records/legacy-upgrades/fix-instruction-conflicts.md#historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/fix-instruction-conflicts.md)

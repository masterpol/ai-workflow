---
slug: instruction-compression
shipped: 2026-10-19
schemaVersion: 1
---
# instruction-compression

The build and audit phase wrappers now point at their phase owners and passed a frozen 31-case loading check with no new scored regression (1,314 to 489 and 941 to 468 words).
The ship wrapper change was rejected after OpenCode lost two satisfied criteria, and it was restored to its earlier bytes; an upgrade-fixture repair shipped in its place.
Savings are source-word counts only; no token, cost or latency gain is claimed.

- outcome: Build and audit wrappers are thin with reusable owner-loading proof; the ship wrapper stays deferred with its failed evidence kept.
- docs: [build skill](.claude/skills/build/SKILL.md), [audit skill](.claude/skills/audit/SKILL.md), [build phase](ai-framework/workflow/phases/2-build.md), [audit phase](ai-framework/workflow/phases/3-audit.md)
- decisions: [S3 review decision](.project/records/legacy-upgrades/instruction-compression.md#s3-review-decision)
- knowledge: [failed candidates kept](.project/knowledge/patterns/a-compression-pilot-keeps-failed-candidates-and-defers.md), [one owner per topic](.project/knowledge/patterns/one-owner-per-instruction-topic-guarded-by-contract-tests.md), [killed mutation script](.project/knowledge/issues/mutation-script-killed-leaves-source-mutated.md)
- code: [loading proof](ai-framework/scripts/instruction-loading.test.mts), [contract tests](ai-framework/scripts/workflow-contracts.test.mts), [upgrade fixture](ai-framework/scripts/runtime/upgrade.test.mts)
- verification: [audit and verification history](.project/records/legacy-upgrades/instruction-compression.md#audit-and-verification-history)
- followups: [open items](.project/records/legacy-upgrades/instruction-compression.md#open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/instruction-compression.md)

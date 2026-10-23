---
slug: shape-lite
shipped: 2026-10-07
schemaVersion: 1
---
# shape-lite

A fast, bounded framing step handles small tasks or mid-flow rejections inside or outside an active pitch.
It keeps the graph-only knowledge gate, mechanical escalation to full shape and a single approval gate.
A validated AGENTS.md import for CLAUDE.md was added during the build.

- outcome: Small tasks and rejections get a compressed framing step that escalates to full shape on hard triggers.
- docs: [shape-lite skill](.claude/skills/shape-lite/SKILL.md)
- decisions: [shape-lite is a gated escalating variant](.project/knowledge/decisions/shape-lite-is-a-gated-escalating-variant-of-shape.md)
- knowledge: [quadratic regex](.project/knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md), [gate must not trust its author](.project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md)
- code: [entry import](ai-framework/scripts/entry-import.mts), [entry import tests](ai-framework/scripts/entry-import.test.mts)
- verification: [audit and review chronology](.project/records/legacy-upgrades/shape-lite.md#audit-and-review-chronology)
- followups: [historical limits](.project/records/legacy-upgrades/shape-lite.md#historical-limits), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/shape-lite.md)

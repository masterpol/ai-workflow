---
slug: toon-machine-data
shipped: 2026-10-19
schemaVersion: 1
---
# toon-machine-data

Workflow-only data files read by agents can now be written in a lossless TOON subset (data grammar 1.0) with a shared reader and writer.
A converter proves a round trip before writing, and a rule says when to use TOON and to measure each file.
Nothing in the repository was converted because no existing file qualified; the skill registry is the real saving.

- outcome: New agent-loaded data files can start in TOON with a rule, a converter and a hardened reader and writer.
- docs: [machine-data-format rule](ai-framework/rules/machine-data-format.md), [data grammar](.project/decisions/toon-data-grammar.md)
- decisions: [data files use their own grammar](.project/knowledge/decisions/data-files-use-their-own-toon-grammar-not-the-config-parser.md)
- knowledge: [convert only where loaded](.project/knowledge/patterns/convert-a-format-only-where-an-agent-loads-the-file-and-measure-it.md), [writer re-inspects](.project/knowledge/patterns/a-writer-reinspects-the-target-at-the-publish-step.md), [mutation hang](.project/knowledge/issues/an-unbounded-mutation-run-hangs-on-a-mutant-that-removes-a-stall-guard.md)
- code: [parser](ai-framework/scripts/runtime/toon-data.mts), [reader and writer](ai-framework/scripts/runtime/data-file.mts), [converter](ai-framework/scripts/toon-convert.mts)
- verification: [audit and review chronology](.project/records/legacy-upgrades/toon-machine-data.md#audit-and-review-chronology)
- followups: [followups](.project/records/legacy-upgrades/toon-machine-data.md#followups), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/toon-machine-data.md)

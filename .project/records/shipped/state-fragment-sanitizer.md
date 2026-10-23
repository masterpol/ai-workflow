---
slug: state-fragment-sanitizer
shipped: 2026-10-20
schemaVersion: 1
---
# state-fragment-sanitizer

A pure sanitizer library now turns untrusted AI fragment text into re-emitted allow-listed markup with citations, or a rejection with a closed reason, and a separate evidence checker binds numbers and paths to the snapshot.
Three audit cycles ended clean after fixing a caller-limits Proxy bypass of the depth cap; 531 tests and 51 of 52 mutant rows killed, one proven redundant.
Release 2.35.0 shipped with 666 of 800 production lines. Rendering and injection were left to state-ai-authoring.

- outcome: A bounded, no-echo fragment sanitizer and citation checker ship as a library with a 13 and 9 dataset partition.
- docs: [state report guide](ai-framework/integrations/state-report.md)
- decisions: [design decisions D1 to D10](.project/records/legacy-upgrades/state-fragment-sanitizer.md#design-decisions)
- knowledge: [limits object defeats cap](.project/knowledge/patterns/a-caller-supplied-limits-object-can-defeat-a-hard-cap.md), [sparse array holes](.project/knowledge/issues/a-sparse-array-hole-skips-every-but-visits-for-of.md), [named test per case](.project/knowledge/patterns/a-golden-dataset-case-counts-only-when-a-named-test-passes.md)
- code: [parser](ai-framework/scripts/state-fragment-parse.mts), [validator](ai-framework/scripts/state-fragment.mts), [evidence checker](ai-framework/scripts/state-fragment-evidence.mts), [dataset](.project/evals/datasets/state-ai-fragments.json)
- verification: [verification history](.project/records/legacy-upgrades/state-fragment-sanitizer.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/state-fragment-sanitizer.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/state-fragment-sanitizer.md)

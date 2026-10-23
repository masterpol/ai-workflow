---
slug: runtime-test-helpers
shipped: 2026-10-08
schemaVersion: 1
---
# runtime-test-helpers

Shared runtime test helpers were added and piloted on three suites.
Callers remain responsible for fixture cleanup and for binary-comparison conventions.
Review chronology and historical failure counts remain separately recorded.

- outcome: Shared runtime test helpers provide fakes and fixtures for workflow test suites.
- docs: none
- decisions: [build decisions](.project/records/legacy-upgrades/runtime-test-helpers.md#build-decisions-and-incidents)
- knowledge: [faithful fakes](.project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md), [alias guard](.project/knowledge/issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard.md)
- code: [test helpers](ai-framework/scripts/runtime/test-helpers.mts)
- verification: [historical closure](.project/records/pitch-compression/runtime-test-helpers.md)
- followups: [historical limits](.project/records/legacy-upgrades/runtime-test-helpers.md#historical-limits)
- archive: [compact record](.project/records/pitch-compression/runtime-test-helpers.md), [source supplement](.project/records/legacy-upgrades/runtime-test-helpers.md)

---
slug: orca-engines-range
shipped: 2026-10-16
schemaVersion: 1
---
# orca-engines-range

The accepted Orca version is now an npm-style range in config instead of a constant in code.
A hand-written linear parser checks it, and invalid ranges fail closed with a position.
A bare version is an exact pin; the default floor is greater than or equal to 1.4.224.

- outcome: Projects state the supported Orca versions as a range and new releases need no code edit.
- docs: [orca vendors](ai-framework/integrations/orca-vendors.md)
- decisions: [decisions and deviations](.project/records/legacy-upgrades/orca-engines-range.md#decisions-and-deviations)
- knowledge: [parse untrusted values](.project/knowledge/patterns/parse-untrusted-values-and-re-emit-them.md), [backtracking regex](.project/knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md)
- code: [range engine](ai-framework/scripts/runtime/semver-range.mts), [preflight](ai-framework/scripts/orca-preflight.mts), [config](ai-framework/scripts/runtime/config.mts)
- verification: [historical verification](.project/records/legacy-upgrades/orca-engines-range.md#historical-verification)
- followups: [followups](.project/records/legacy-upgrades/orca-engines-range.md#followups), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/orca-engines-range.md)

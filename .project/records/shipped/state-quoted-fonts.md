---
slug: state-quoted-fonts
shipped: 2026-09-26
schemaVersion: 1
---
# state-quoted-fonts

The state report accepts ordinary quoted font families and one same-file CSS variable hop.
Values are re-emitted in canonical form and validated again at render time.
Historical counts and naming differences remain separately recorded.

- outcome: Quoted font families and same-file variables resolve to the project's own typeface in the state report.
- docs: none
- decisions: [bounded font discovery](.project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md)
- knowledge: [bounded font discovery](.project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md)
- code: [theme parser](ai-framework/scripts/state-theme.mts)
- verification: [historical closure](.project/records/pitch-compression/state-quoted-fonts.md), [mutation proof](.project/records/legacy-upgrades/state-quoted-fonts.md#mutation-proof)
- followups: none
- archive: [compact record](.project/records/pitch-compression/state-quoted-fonts.md), [source supplement](.project/records/legacy-upgrades/state-quoted-fonts.md)

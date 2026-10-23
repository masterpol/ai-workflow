# Log: toon-machine-data

- 2026-10-18 `/build start` approved with `orca=normal` (no Orca Run, no workers; S3 and S4 run sequentially in the main session).
- 2026-10-18 S0 done: `inventory.md`, 14 table rows, `Decision: NO-GO`. See deviations.md.
- 2026-10-19 `Approve all` taken as approval of every per-scope gate; `/build end` stays gated. S1-S4, S6 built in the main session (no Orca, no workers).
- 2026-10-19 Finding while building S3: `toon-convert --report` on the repo's own JSON shows TOON smaller than the stored (pretty) file but mixed against minified JSON; not a large saving on prose-heavy files.
- 2026-10-19 Runtime boundary check refused `node:util` in production code; replaced with `dataEquals` in toon-data.mts.
- 2026-10-19 Version 2.32.0 recorded. Full suite: 1741 tests, 1738 pass, 0 fail, 3 skipped. setup-validator READY, doctor READY, graphify CLEAN.
- 2026-10-19 `/audit` (orca=normal): cycle 1 five reviewers, 3 must-fix confirmed and fixed, 7 should-fix fixed; cycle 2 security + code narrow, 3 should-fix fixed; 4 planted canaries and 1 more per cycle caught. Record: audit.md (record-check ok). 2.32.1.
- 2026-10-19 A mutation run hung 37 minutes (infinite loop in a mutant); killed by the owner; no source left mutated. See audit.md Incident.

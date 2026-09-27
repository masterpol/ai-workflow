# Build evidence

## S1 — 2026-09-26

`node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/opencode-plugin.test.js`: 59 tests, 58 pass, 1 skipped on macOS (Linux kernel identity fixture), zero failures.

New behavior tests distinguish colon-collision identities and agent IDs from types, count type-only completions independently, preserve explicit replay dedup, retain old live and EPERM locks, and reject a replacement installed during reclaim comparison. Existing v1/v2 migration fixtures preserve lifetime totals. Dead and malformed aged locks remain recoverable.

In-memory mutations changing structured identity to colon joining and disabling malformed-lock age reclamation each fail their focused test (exit 1). The Linux reused-PID test was not exercised on this macOS host; no claim of cross-platform reuse recovery or atomic replacement safety is made.

# S2, S3, S4 roll-up evidence

Run 2026-09-24. S2 evidence in full: `s2-evidence.md` (subagent's own record); S3: `s3-evidence.md`. Re-verified independently by the main session:

- `node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/hooks/scripts/token-report.test.js ai-framework/scripts/skill-defaults.test.js`: 62 tests, 62 pass, 0 fail. `skill-defaults.test.js` unchanged (its pinned Markdown/HTML strings at lines 345-348 still pass).
- `grep -c "function markdown\|function html" ai-framework/hooks/scripts/token-consumption.js`: 0.
- Coverage (`--experimental-test-coverage`): `token-consumption.js` 94.13% lines, `token-report.js` 100% lines / 98.61% branches.
- Render cost (S2 subagent, 100 `recordEvent` calls, two runs): median 5.95 ms and 6.22 ms per call; limit was 100 ms.
- `node ai-framework/scripts/workflow-doctor.js --no-color`: READY, 738 checks. `node ai-framework/scripts/setup-validator.js --no-color`: READY, 21 checks.
- End to end through the CLI (skill event, async agent launch, then stop event, in a temp root): the Markdown report has "Most used", "By Vendor", "By Model", "By Agent", "By Effort" and "Skills" sections; a marker string placed in skill `args`, the agent prompt and the last assistant message appears in none of the three output files (0 matches).
- A copy of the real v1 metrics file (210 completions) migrated to v2 with lifetime totals intact and rendered a full report (sample output reviewed).
- `git diff` scope: 9 tracked files modified for this pitch (collector, its test, plugin, `settings.json`, `hooks.json`, `README.md`, `harnesses.md`, `workflow-doctor.js`) plus new `token-report.js` and `token-report.test.js`, plus this pitch's records. `.codex/hooks.json` untouched. 10 code/doc files, within the 15-file cap; CHANGELOG/VERSION are written at /ship.

## Open items for /audit and /ship
- OpenCode `variant` and skill tool id are unverified live (stub tests only).
- The wired Claude `Skill` hook has not been observed firing yet; it loads with the next session.
- The real `.project/metrics` file: hooks during this session already migrated it to v2 (the report showed `since 2026-09-25T03:03:53Z`).
- Another session's work (`project-state-report`: `state-snapshot.js`, state skill) reads `token-consumption.json`; it already accepts schema 1 and 2 and only reads `lifetime`, so no conflict. Its files are not part of this pitch.
- Async Claude launches recorded before this change inflated Claude completion counts; not corrected (D1).

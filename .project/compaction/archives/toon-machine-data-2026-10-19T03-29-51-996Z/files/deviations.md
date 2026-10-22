# Deviations: toon-machine-data

| Date | Scope | Plan said | Reality | Decision |
|------|-------|-----------|---------|----------|
| 2026-10-18 | S5 | Convert `orca-vendor-orchestration.json` if S0 = GO | S0 = NO-GO: no existing dataset is agent-loaded and eligible (grader-only, hash-pinned, or the pitch's own gate) | S5 dropped; 12 files remain; follow-up pitch `toon-skill-registry` to shape later |
| 2026-10-18 | S1 | Test file asserts `absent`/`refused` outcomes | `absent` is file-level, so it lives in `data-file.mts`; `toon-data.mts` returns `parsed`/`refused` and tests assert a non-text input is refused, not absent | Grammar doc states it; S2 tests the three outcomes |
| 2026-10-18 | S2 | Reuse config's `inspectPath`/`readBoundedFile` | Both are hard-wired to `ai-workflow.toon` and a 64 KiB cap; reusing them would change `config.mts` | `data-file.mts` has its own small inspector (lstat per component, O_NOFOLLOW, identity pin, bounded read); `config.mts` untouched. Exit grep for `inspectPath` is replaced by the hostile-shape tests |
| 2026-10-18 | S2 | Writer "keeps line endings" | Data files are new and written by one tool; keeping CRLF has no meaning for them | Reader accepts CRLF and BOM, writer always emits LF |
| 2026-10-19 | S2/S3 | `writeData` publishes with rename; converter checks `existsSync` | Audit cycle 1-2: rename can replace a file created in the last instant; the existence check was a race | New files are published with a hard link; `createOnly`; re-inspect (incl. size and mtime) before publish; `writeData` returns the published dev/ino |
| 2026-10-19 | S3 | `toon-convert.test.mts` converts three real datasets | `instruction-compression.json` is untracked and owned by another pitch, so it is absent on a clean checkout | Test lists only tracked datasets |
| 2026-10-19 | S2 | JSON nesting limit as for TOON | Audit cycle 2: arrays counted as depth in the JSON reader but not in the TOON grammar | JSON reader limits objects to 32 levels and total containers to 68 |
| 2026-10-19 | Close-out | Version 2.32.0 only | Audit fixes recorded as 2.32.1 | CHANGELOG patch entry |

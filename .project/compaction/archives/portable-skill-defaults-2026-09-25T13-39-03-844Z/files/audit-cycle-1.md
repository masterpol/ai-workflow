# Audit cycle 1 — portable-skill-defaults (D1+D2+D3)

**Dispatch:** code-reviewer, security-reviewer, test-coverage-checker (always) +
cross-pitch-conflict-checker (≥2 other active pitches). No UI/i18n/AI-prompt scopes, so
ux-reviewer, i18n-checker and eval-runner did not fire.

## Findings and disposition

| # | Source | Severity | Finding | Verified? | Disposition |
|---|---|---|---|---|---|
| 1 | security-reviewer | **must-fix** | `skill-compress-guard.js`'s `canCompress()` matched protected directories against the raw, unresolved path — a symlink at an allowed path pointing at a protected file (e.g. `.project/notes/memory.md` → `.project/pitches/x/pitch.md`) was reported `allowed:true` | Independently reproduced with a live PoC before and after the fix | **Fixed.** `canCompress()` now resolves the real path (`resolveReal`, walking existing ancestors via `fs.realpathSync`) before any protected-dir match. |
| 2 | security-reviewer | **must-fix** | Same function's protected-dir match was case-sensitive; on the default case-insensitive macOS/Windows filesystem, `.PROJECT/PITCHES/...` is the same on-disk file as `.project/pitches/...` but wasn't matched | Independently reproduced (this environment is macOS; PoC confirmed `allowed:true` for the uppercase path pre-fix) | **Fixed.** The resolved relative path is lowercased before matching — safe in both directions (never turns a real bypass into a false negative, at most over-protects on a case-sensitive filesystem). |
| 3 | test-coverage-checker | **must-fix** | D1's own exit criterion ("workflow-doctor fails loudly on a malformed skill-defaults.json... itself tested") had no automated test — only verified manually during D1 build | Confirmed: no such test existed in any `*.test.js` file | **Fixed.** Added a real-bundle-copy test to `skill-defaults.test.js` proving doctor exits 0 clean and fails loudly (specific check, specific detail message) on a corrupted catalog. |
| 4 | security-reviewer | should-fix | `loadModes()` (skill-defaults.js) and `currentCavemanMode()` (token-consumption.js) only `lstat`'d the leaf `modes.json` for a symlink; a symlinked **ancestor** directory (e.g. `.project/skills/` itself) bypassed the check entirely | Independently reproduced with a live PoC before and after the fix | **Fixed.** Both now resolve the real path and confirm it stays under the real project root — the same pattern `bundle-sync.js`'s `isSafeProjectPath` already uses. Also tightened `skill-compress-guard.js` to refuse any resolution outside root, not just the four named protected dirs, for consistency. |
| 5 | security-reviewer | should-fix | `pythonAvailable()` was missing the `timeout: 5000` its two sibling presence-checks (`runtimeStatus`, `cliStatus`) both set | Confirmed by reading the code | **Fixed** — one-line addition, now consistent with the pattern. |
| — | code-reviewer | — | No findings; verified pattern consistency with `skill-sync.js`/`skill-vendors.js` precedent | N/A | — |
| — | cross-pitch-conflict-checker | — | No real conflict against district-multisite-foundation, pitch-compaction, or project-state-report; all this pitch's changes are additive (new files, one optional field, documentation) | N/A | — |

All four security findings were independently reproduced with live proof-of-concept scripts
before trusting them (`node -e '...'` against the actual exported functions), not accepted on
the subagent's report alone, and re-verified as closed after the fix using the same scripts.

## Evidence after fixes

```
node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/skill-defaults.js,ai-framework/scripts/skill-compress-guard.js,ai-framework/scripts/browser-runtime.js' --test-coverage-lines=90 \
  ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-compress-guard.test.js \
  ai-framework/scripts/browser-runtime.test.js ai-framework/hooks/scripts/token-consumption.test.js
```
44 tests, 44 pass (was 39; +5 for the security regression tests + doctor test). 100%
line/branch/function coverage on all three new scripts.

- `node --test ai-framework/scripts/bundle-sync.test.js`: 11/11 pass (unaffected).
- `node --test ai-framework/scripts/add-skill.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/skill-sync.test.js`: 53/53 pass (S1–S3 unaffected).
- `node ai-framework/scripts/workflow-doctor.js --json`: 0 failures.
- `node ai-framework/scripts/setup-validator.js`: READY, 18 checks.
- `node ai-framework/scripts/graphify.js --check`: CLEAN.

## Cycle result

3 must-fix + 2 should-fix, all fixed and evidenced above. Zero findings remain open. No
re-dispatch needed — cycle 1 closes the audit.

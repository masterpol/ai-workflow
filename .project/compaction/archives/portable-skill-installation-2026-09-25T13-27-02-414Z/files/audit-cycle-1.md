# Audit cycle 1 — portable-skill-installation (S1+S2+S3)

**Dispatch:** code-reviewer, security-reviewer, test-coverage-checker (always) +
cross-pitch-conflict-checker (≥2 active pitches). No UI/i18n/AI-prompt scopes, so ux-reviewer,
i18n-checker and eval-runner did not fire.

## Findings and disposition

| # | Source | Severity | Finding | Verified? | Disposition |
|---|---|---|---|---|---|
| 1 | code-reviewer | should-fix | `skill-source.js` frontmatter parsing sliced quoted YAML scalars without unescaping (`\"` retained literally; `''` not collapsed) | Confirmed by reading the code and reproducing with a crafted description | **Fixed this cycle.** Double-quoted values now go through `JSON.parse`; single-quoted values collapse `''`→`'`. Regression tests added in `add-skill.test.js`. |
| 2 | security-reviewer | should-fix | TOCTOU: `resolveFile`'s lstat-ancestor check and the later write are not atomic; a second local process with write access to the same project directory could race an ancestor directory into a symlink between the check and the write | Confirmed as a real code property; the reviewer's own report confirms it requires an independent local attacker already able to write to the project — not reachable from crafted upstream skill content alone (symlinks inside fetched content are already rejected) | **Deferred**, logged below and in `deviations.md`. Reason: the precondition (a co-resident process racing filesystem operations with existing write access to the project) already implies capabilities well beyond this tool's threat model (a lock file assumes cooperating processes, not adversarial ones); a proper fix (fstat/inode verification on every write call site) is a nontrivial cross-cutting change out of proportion to this residual risk for a big-batch pitch that already completed all three scopes. |
| 3 | security-reviewer | acknowledged (low confidence, flagged for verification) | Whether Prettier's `--config <path>` truly disables its own cascading config auto-discovery, so a `.prettierrc.js` living inside fetched skill content could never be picked up | Verified the code-level mitigation directly: `formatter.configPath` is resolved exclusively from the trusted project root (`discoverFormatter(root)`, `root` = `ctx.roots.target`) and never from package/scratch content, regardless of Prettier's own CLI semantics | **No code change** (the code already only sources `--config` from trusted content). Added a spy-based regression test proving `--config` is never influenced by a same-named file inside the fetched skill's own content. |
| 4 | security-reviewer | acknowledged | Lock-file PID-reuse could make a stale lock appear "alive" | Confirmed as described; reviewer's own analysis: failure mode is a false "locked" (denial), not a bypass | **No action.** Not a security issue as characterized. |
| — | test-coverage-checker | — | No findings; independently mapped every S1/S2/S3 machine-checkable exit criterion to a specific test | N/A | — |
| — | cross-pitch-conflict-checker | — | No real conflict against district-multisite-foundation, portable-skill-defaults, pitch-compaction, or project-state-report | N/A | — |

## Evidence after fixes

```
node --test --experimental-test-coverage '--test-coverage-include=**/skill-*.js' --test-coverage-lines=90 \
  ai-framework/scripts/add-skill.test.js ai-framework/scripts/skill-vendors.test.js \
  ai-framework/scripts/skill-sync.test.js ai-framework/scripts/bundle-sync.test.js
```
63 tests, 63 pass (was 62; +1 for the formatter-provenance regression test). Line coverage
100% on all skill-*.js modules; branches 94.14%; functions 97.37%.

- `node ai-framework/scripts/workflow-doctor.js --json`: 0 failures.
- `node ai-framework/scripts/setup-validator.js`: READY, 18 checks.
- `node ai-framework/scripts/graphify.js --check`: CLEAN.
- `node --test ai-framework/hooks/scripts/token-consumption.test.js`: 4/4 pass.

## Cycle result

Zero must-fix findings after verification. One should-fix (#1) fixed and evidenced above; one
should-fix (#2) deferred with reason logged. No re-dispatch needed — cycle 1 closes the audit.

# Cycle 3 code review: state-project-sources

Model: GPT-6-based Codex worker (the session does not expose a more specific model identifier).
Checklist walked: yes, including the canonical code-reviewer checklist, coding-standards.md, and boundaries.md; application-only items were not applicable.
Cross-file interactions reviewed: yes, including facts-project → facts-sql, the shared SECRET_PATTERNS import into facts-gather.clean, workspace discovery → database discovery, and raw facts → projectPanels.

Verdict: BLOCK — one must-fix finding remains. This was a read-only review; the only repository file created by this worker is this report. All executable probes and copied source files are under `/private/tmp/sps-audit3-code-reviewer/`.

## Findings

For the commands below, the working directory is `/private/tmp/sps-audit3-code-reviewer`. The probe scripts and their complete output are retained there; all credential samples are synthetic.

| ID | Severity (must-fix/should-fix/nit) | file:line | defect | failure scenario with the command you ran and its output | verified (yes/no) |
|---|---|---|---|---|---|
| C3-CR-1 | must-fix | ai-framework/scripts/facts-project.mts:51 | `credentialShaped` examines only the first 200 characters, while workspace paths may contain 4096 characters and package labels may contain 1024. A credential-shaped later path segment bypasses refusal and enters the public facts JSON. Scan the entire accepted input, including separator suffixes, or refuse the overlong input before preserving it. | `TMPDIR=/private/tmp/sps-audit3-code-reviewer node --experimental-strip-types --disable-warning=ExperimentalWarning probes.mts` created a workspace at a 210-character harmless parent followed by `/ghp_` and 30 synthetic `A` characters. Output: `credential present in path facts true`, with workspace status `observed`. `node --experimental-strip-types --disable-warning=ExperimentalWarning matrix.mts` also printed `late credentialShaped false`. This concerns the newly emitted workspace path, not the acknowledged pre-existing structure.nodes exposure. | yes |
| C3-CR-2 | should-fix | ai-framework/scripts/facts-project.mts:295 | A regular `package.json` that cannot be read within the size limit or cannot be parsed is silently ignored. The symlink fix works, but this other branch still reports absence or a fully observed sibling workspace list and drops the failed file from evidence. Mark this discovery incomplete when `pkgSource.value` is undefined. | `TMPDIR=/private/tmp/sps-audit3-code-reviewer node --experimental-strip-types --disable-warning=ExperimentalWarning probes.mts` printed `invalid-package {"value":null,"status":"unconfigured","evidence":[],"note":"no workspace configuration found"}` for `{broken`, and `valid-sibling-plus-invalid-package` reported `observed` using only pnpm evidence. The 36-case `matrix.mts` probe likewise reported an oversized regular JSON manifest as `unconfigured` alone and `observed` beside valid pnpm configuration; both should disclose incomplete inspection. | yes |
| C3-CR-3 | should-fix | ai-framework/scripts/facts-sql.mts:310; ai-framework/scripts/facts-sql.mts:336; ai-framework/scripts/facts-sql.mts:384 | Exact-then-unambiguous-case-insensitive resolution is not applied consistently to DROP paths. DROP INDEX and DROP CONSTRAINT compare raw names; DROP COLUMN resolves the column but compares stored constraint column spellings literally, allowing orphan unique keys. Use canonical identity consistently when resolving names and removing dependent constraints, and count ambiguous operations as not understood. | `node --experimental-strip-types --disable-warning=ExperimentalWarning matrix.mts` printed `sqlite-index-reader {"dialect":"sqlite","unique":[["id"]],"notUnderstood":0}` after creating `"EmailIdx"` and dropping `emailidx`. An independent `sqlite3 :memory:` run with the same DDL and `SELECT 'indexes_remaining=' \|\| count(*) FROM pragma_index_list('t');` printed `indexes_remaining=0`. `probes.mts` also showed that creating `"Email" text, CONSTRAINT u UNIQUE(email)` then dropping `"Email"` leaves `columns:[]`, `unique:[["email"]]`, and `notUnderstood:0`; dropping a mixed-case constraint retained the key and counted it as unknown instead of using the module's documented fallback. | yes |
| C3-CR-4 | should-fix | ai-framework/scripts/facts-project.mts:97 | The multiline flow-list reader accepts an unterminated list as complete: it strips the opening bracket and returns entries without requiring a closing bracket or balanced quotes. This produces observed workspace facts for malformed configuration and can silently accept the first 200 lines of a longer unfinished list. Refuse or mark incomplete when the supported flow syntax cannot be completely parsed. | `TMPDIR=/private/tmp/sps-audit3-code-reviewer node --experimental-strip-types --disable-warning=ExperimentalWarning probes.mts` supplied `packages: [apps/web` with an existing `apps/web` directory. Output: `unterminated-flow {"value":{"packages":[{"path":"apps/web","name":"(unnamed)","frameworks":[]}],"unresolved":0},"status":"observed","evidence":["pnpm-workspace.yaml"]}`. `matrix.mts` reproduced `observed` for this malformed pnpm input with every regular JSON sibling state. | yes |

## Verification and regression coverage

The three requested test files ran from copied sources, with TMPDIR restricted to the scratch directory. The copy also included the required `ai-framework/integrations/skill-vendors.json`. An initial run before that dependency was copied failed only the real-reset integration test with `ERR_MODULE_NOT_FOUND`; the completed runs below supersede that setup failure.

| Runner | Command | Result |
|---|---|---|
| Bun 1.4.4 | `TMPDIR=/private/tmp/sps-audit3-code-reviewer bun test ai-framework/scripts/facts-sql.test.mts ai-framework/scripts/facts-project.test.mts ai-framework/scripts/facts-gather.test.mts` | 136 tests: 129 pass, 7 skip, 0 fail; 6.36 seconds. Output: `bun-tests-final.log`. |
| Node v22.11.0 | `TMPDIR=/private/tmp/sps-audit3-code-reviewer node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/facts-sql.test.mts ai-framework/scripts/facts-project.test.mts ai-framework/scripts/facts-gather.test.mts` | 136 tests: 129 pass, 7 skip, 0 fail; 5.76 seconds. Output: `node-tests-final.log`. |

The named cycle-2 regression cases pass: credential-shaped migration filenames with separator prefixes are skipped; ordinary password-related migration names are read; raw short credential-shaped package labels are redacted before substitution; workspace entry truncation is stale; linked configuration is stale; valid multiline flow lists and column-zero block dashes resolve; unique and approximate output names use entity spelling; migration ordering is numeric; ambiguous DROP TABLE is counted; CREATE TABLE IF NOT EXISTS uses fallback matching; INCLUDE before WHERE remains partial; a missing 21st package does not imply overflow; duplicate discovered package paths count once. C3-CR-1, C3-CR-2, and C3-CR-4 record limits those existing regression cases do not cover.

An independent text comparison against the pre-change facts-gather implementation printed `SECRET_PATTERNS unchanged: True`. The full credential-family clean() test passes on both runners. The import move therefore preserves the existing cleaner's pattern set and redaction behavior; the newly introduced bounded credential helper has the separate defect above.

Workspace state combinations were additionally checked with a 6 × 6 matrix of pnpm and JSON input states: absent, ordinary metadata without declarations, valid declaration, malformed content, linked file, and oversized file. Linked configuration and oversized pnpm input consistently produce stale results, including with valid siblings. Malformed or oversized JSON and unterminated pnpm flow lists have the incorrect states documented above. Existing tests cover observed resolved and unresolved patterns, entry truncation, refusal, overflow, duplicate declarations, and missing literal paths. A wholly missing literal declaration currently returns unconfigured with configuration evidence; it is not reported as a refusal or overflow.

SQL lookup was traced through CREATE, guarded ADD, ALTER, unique-index creation, primary-key assignment, relation emission, DROP TABLE, DROP COLUMN, DROP CONSTRAINT, and DROP INDEX. The requested CREATE and DROP TABLE fixes hold; the remaining DROP inconsistencies are consolidated in C3-CR-3.

Unverified: seven optional real-Archify validation tests were skipped because the isolated copy has no Archify installation. No Archify validation result is claimed. The acknowledged exclusions in the task brief were not re-reported, and no repository implementation changes were made.

## Review summary

| Tier | Count |
|---|---|
| must-fix | 1 |
| should-fix | 3 |
| nit | 0 |

Verdict: BLOCK — 1 must-fix finding requires resolution before merge.

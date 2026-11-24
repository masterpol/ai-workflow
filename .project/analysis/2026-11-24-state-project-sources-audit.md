# Audit: state-project-sources

Appetite: big-batch, cap 3 cycles (3 used). Mode: Orca, Run `run_05080422e84d`.

**Dispatched as Orca workers**, one read-only review per role:
- Cycle 1: security (claude), code (codex), test coverage (codex), cross-pitch (opencode).
- Cycle 2, narrow: security (codex), code (claude).
- Cycle 3, narrow and last: security (claude), code (codex).

**Independence:** `independent: no` for every role. The workers reviewed the repository read-only, not scratch copies, so no canary was planted. A clean report is therefore not proof of a clean audit. The coordinator reproduced the findings before fixing them (probe scripts for the SQL reader, new regression tests for the rest), and most fixes carry a test that fails on the old code.

**Cycle 3 fixes were not re-reviewed.** The cycle cap is 3. The cycle-3 findings (one must-fix, three should-fix) were fixed after the last review, each with a regression test, and the whole suite passes. No reviewer has seen those edits. The ship step reruns the full suite on an independent clone.

**Workers:** all collected (`worker_done`) and released. After the Claude Code restart the released opencode terminal of the critique phase resurfaced and received the S2 build dispatch in its old session; it was redirected by message (see plan.md deviations).

## Must-fix (blocks /ship)

None open. Seven were found and fixed (below).

## Findings and dispositions

| ID | Cycle | Source | File | Issue | Disposition |
|----|-------|--------|------|-------|-------------|
| SEC-1, TC1 | 1 | security, test | `facts-project.mts` | Migration file names were never scrubbed and reached the facts JSON and draft | **fixed.** Names are allow-listed (letters, digits, `. _ -` space), refused on a credential shape, skipped and counted ("N migration file(s) not read"); the name is never copied. Tests with a credential, an npm token, markup |
| SEC-2 | 1 | security | `facts-project.mts` | `\b` let `db_password_prod` and raw `AKIA…` folder names through | **fixed.** `_ -` are separators; the shared credential shapes are refused anywhere |
| SEC-3 | 1 | security | `facts-sql.mts` | `render` was quadratic (38 s on 1.8 MB) | **fixed.** Linear, stops at 80 characters; timing test (best of 3, doubling) |
| SEC-4 | 1 | security | `facts-project.mts` | 1 GB could be read before the 8 MB cap applied | **fixed.** Size by `lstat` before reading; 8 MB per source and 16 MB per scan |
| SEC-5 | 1 | security | `facts-project.mts` | Directory probes unbounded; `queue.shift()` O(n) | **fixed.** Enqueue cap (2 x dirs budget), index loop |
| SEC-6, CR4, H, I | 1, 2 | security, code | `facts-project.mts` | pnpm yaml: flow list, key order, quoted `#`, column-0 dashes, multiline flow | **fixed.** `pnpmPackages` and `stripComment`; tests for each form |
| SEC-7, N, C2-SEC-3 | 1, 2 | security, code | `facts-project.mts` | Glob listing cut without saying so | **fixed.** Stale with an "entry budget" note |
| SEC-10 | 1 | security | `facts-project.mts` | One planted symlink made the whole SQL source unavailable | **fixed.** The file is skipped and counted; the rest is stale |
| SEC-11 | 1 | security | `facts-project.mts` | `SqlEntity` etc. undeclared; duplicated notes | **fixed.** Aliases declared; notes de-duplicated |
| CR1 | 1 | code | `facts-sql.mts` | `"Foo"` and `"foo"` collapsed; an unquoted reference missed a mixed-case table | **fixed.** Unquoted fold to lower case, quoted keep case; exact lookup first, then a unique case-insensitive match; emitted names are the real ones |
| CR2 | 1 | code | `facts-sql.mts` | `ADD COLUMN IF NOT EXISTS` replaced the column | **fixed.** |
| CR3, TC2 | 1 | code, test | `facts-project.mts` | A one-file folder with a journal was not a source | **fixed.** |
| CR5 | 1 | code | `facts-project.mts`, `facts-gather.mts` | Workspace cap and refusal not shown | **fixed.** Stale with a note; "Workspace list" row |
| CR6 | 1 | code | `facts-sql.mts` | `fieldsMax` per table, not a total | **fixed.** Total across tables |
| CR7, Q | 1, 2 | code | `facts-sql.mts` | A partial unique index counted as a unique key | **fixed.** Understood, no key; `INCLUDE` before `WHERE` handled |
| TC3 | 1 | test | `facts-project.mts` | `packages:` after another key not read | **fixed** (see SEC-6) |
| TC4 | 1 | test | `facts-project.test.mts` | The one-file exclusion test mutated nothing | **fixed.** Isolated test |
| C2, C3 (cross-pitch) | 1 | cross-pitch | docs | Index statements and "or a journal" wording | **fixed.** Contract and decision match the code |
| C2-SEC-1 | 2 | security | `facts-project.mts` | npm token in a migration name passed (no word boundary) | **fixed.** `credentialShaped` also tests every suffix after `_ - .` |
| C2-SEC-2 | 2 | security | `facts-project.mts` | `ghp_…` package name lost its shape before redaction | **fixed.** Checked on the raw name |
| C2-SEC-4 | 2 | security | `facts-project.mts` | An unreadable workspace file read as "unconfigured" | **fixed.** A link or oversized file is a refusal |
| A, B, E, U, G, J, M, N1 | 2 | code | `facts-sql.mts`, `facts-project.mts` | Unique and approximate names, IF NOT EXISTS case, ambiguous DROP, numeric order, duplicates, a missing 21st literal, credential words in migration names | **fixed.** `10_` follows `9_`; a word like "password" in a migration name is ordinary, a credential shape is not |
| C3-SEC-1, C3-CR-1 | 3 | security, code | `facts-project.mts` | Credential check saw only 200 characters | **fixed, not re-reviewed.** Whole text for the patterns, per-segment suffix scan, a segment over 256 characters is refused |
| C3-SEC-2 | 3 | security | `facts-project.mts` | A fullwidth key was checked before normalization | **fixed, not re-reviewed.** |
| C3-CR-2 | 3 | code | `facts-project.mts` | An invalid or oversized `package.json` was ignored | **fixed, not re-reviewed.** |
| C3-CR-3 | 3 | code | `facts-sql.mts` | DROP INDEX, CONSTRAINT and COLUMN compared names exactly | **fixed, not re-reviewed.** |
| C3-CR-4 | 3 | code | `facts-project.mts` | An unterminated flow list was read as complete | **fixed, not re-reviewed.** Counted as one unresolved pattern |

## Acknowledged

- **SEC-8, C3-SEC-3, C3-SEC-4 (nits):** directory names in `structure.nodes`, SQL identifiers and explainer `sources` paths are not credential-checked in the raw facts JSON. The draft is cleaned by `clean`. The structure part predates this pitch (2.53.0). Followup.
- **Cross-pitch C1:** 13 files overlap with branch commit `c997781` (PR #12). The branch is stacked on it; merge in order. No overlap with the other three active pitches.
- **Size:** about 10% over the 1500 LOC cap; `facts-sql.mts` is 454 lines after audit fixes (limit 450 was the S1 spike). Recorded in plan.md; the reader did not need splitting.
- **Identifier rule:** unquoted names fold to lower case (Postgres), quoted ones keep their case, and a unique case-insensitive match is the fallback, which suits SQLite, MySQL and SQL Server. Two tables that differ only in case are never guessed between.

## Evidence (author-run)

- **Tests:** `facts-sql` 25, `facts-project` 68, `facts-gather` 47 plus the touched `bundle-sync`, `workflow-doctor` and `graphify` files pass under Bun and Node. Full suite under Bun: 2068 pass, 3 skip, 2 fail (the two bundle-copy doctor tests that need an independent clone).
- **Checks:** doctor READY, setup validator READY, graph CLEAN.
- **Live:** drafts for LAH, RN, climbing-lab, comuna and lasallenorandi all pass a real `archify validate`.
- **Guard:** `review-bench guard check` after each cycle listed only the coordinator's own fixes made after the reports returned, so separation of reviewers from the code rests on timing, not on a clean diff.

## Review records
### Security review, cycles 1 to 3
independent: no
canary: none (Orca workers reviewing the repository read-only)
read-only: verified by review-bench guard snapshot/check around each cycle; the only changes found were the coordinator's own fixes, made after the reports returned. Reviewers wrote only to `audit-out/` (outside the guarded roots), later moved to the pitch's `audit-reports/`.
prompt-sha256: dfa8551884d38a330621705a4adc8a9227605cbf652b128b2b7c98109bac2b78 (c1), a23ec5ebfcad3a232ea05a086444ad44deeb7abc6aa2c84fff4da5419674ebce (c2), 9b032d498a94437f2c36062f848838075364ba0a40970a8e35726d4af519d93d (c3)
model: claude (c1), codex (c2), claude (c3), Orca worker vendor defaults
cross-file interactions: reviewed (SQL reader to project facts to the page cleaner, evidence to the draft's sources)
Checklist: security.md section 9 and the named patterns, walked item by item.

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | must-fix | facts-project.mts:326-341 | migration file names reach facts and draft | reproduced by the reviewer; fixed (SEC-1) |
| 2 | must-fix | facts-project.mts:32-35 | credential check misses `_`-joined names | reproduced; fixed (SEC-2) |
| 3 | must-fix | facts-sql.mts:112-117 | `render` quadratic (38 s) | reproduced by the coordinator (545 ms to 2456 ms on doubling); fixed (SEC-3) |
| 4 | should-fix | facts-project.mts | unbounded bytes, probes, glob listing, flow yaml, symlinked file | reproduced; fixed (SEC-4 to SEC-7, SEC-10) |
| 5 | must-fix | facts-project.mts:34, :96 | npm token and `ghp_` package name | reproduced; fixed (C2-SEC-1, C2-SEC-2) |
| 6 | should-fix | facts-project.mts | glob truncation and unreadable config shown as complete or absent | reproduced; fixed (C2-SEC-3, C2-SEC-4) |
| 7 | should-fix | facts-project.mts:51 | 200-character credential cutoff; fullwidth key | reproduced; fixed after the last review (C3-SEC-1, C3-SEC-2) |
| 8 | nit | facts-sql.mts, facts-gather.mts | raw SQL names and evidence in `--json` | confirmed; acknowledged |

### Code review, cycles 1 to 3
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check (as above)
prompt-sha256: ea5265a9510741ea104b96734c6d38e431da215bd11e187cbc6b2e54e816e1cd (c1), d96e67a763342da097b875f2bee5e9aba32cdb79522ebff33bdd0eec6f4aab05 (c2), 9345914dacc774584f7ee72b4fa43d8b5049d5749c178b200817bd161a622eed (c3)
model: codex (c1), claude (c2), codex (c3), Orca worker vendor defaults
cross-file interactions: reviewed (reader to detection to renderer; relationship names against `byName`; the shared credential patterns)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | must-fix | facts-sql.mts:172-184 | identifier identity (`"Foo"` vs `"foo"`, unquoted FK lost) | reproduced by the coordinator; fixed (CR1) |
| 2 | must-fix | facts-sql.mts:302 | `ADD COLUMN IF NOT EXISTS` replaced a column | reproduced; fixed (CR2) |
| 3 | must-fix | facts-project.mts:336 | `fieldsTotal` not a total for SQL | reproduced by test; fixed (CR6) |
| 4 | should-fix | several | journal one-file folder, yaml key order, workspace states, partial index | reproduced; fixed (CR3, CR4, CR5, CR7) |
| 5 | should-fix, nit | facts-sql.mts, facts-project.mts | unique and approximate names, numeric order, ambiguous DROP, duplicates, flow lists | reproduced; fixed (cycle 2 list) |
| 6 | must-fix | facts-project.mts:51 | credential cutoff at 200 characters | reproduced; fixed after the last review (C3-CR-1) |
| 7 | should-fix | facts-project.mts, facts-sql.mts | invalid `package.json`, DROP name matching, unterminated flow list | reproduced; fixed after the last review (C3-CR-2 to C3-CR-4) |

### Test coverage, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check; mutants ran in copies under /private/tmp
prompt-sha256: 419a120deae70c137abc4d4ab2d5b27696ffeb6e346d0884ee5eb5e43e97bf14
model: codex, Orca worker vendor default
cross-file interactions: reviewed (every exit criterion of S1, S2, S3 and C1 mapped to a named test)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | must-fix | facts-project.mts:327 | credential-shaped file name not covered | reproduced; fixed with tests (TC1) |
| 2 | must-fix | facts-project.mts:403 | journal exception untested and absent | reproduced; fixed (TC2) |
| 3 | must-fix | facts-project.mts:184 | yaml key order untested | reproduced; fixed (TC3) |
| 4 | should-fix | facts-project.test.mts:428 | a named guard test whose mutant survived | confirmed; fixed (TC4) |
| 5 | — | — | 10 mutants (3 per changed source file) caught, 1 survived (TC4) | author re-ran none; the surviving one is now caught by the isolated test |

### Cross-pitch, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check
prompt-sha256: ea24a94246e120255e419673022016a37369104899348afb5287b11f55a0dc3c
model: opencode (Kimi K2.7), Orca worker vendor default
cross-file interactions: reviewed (facts-gather to facts-project to facts-sql, and the docs against the code)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | must-fix (reclassified: acknowledged) | 13 files | overlap with commit c997781 on the branch | confirmed with `comm`; the branch is stacked on PR #12, not a concurrent contender |
| 2 | should-fix | state-report.md:91 | docs list a smaller statement set than the code | confirmed; fixed |
| 3 | nit | state-report.md:86 | "or a journal" ambiguous | confirmed; fixed |
| 4 | — | — | the three other active pitches are disjoint | consistent with their files |

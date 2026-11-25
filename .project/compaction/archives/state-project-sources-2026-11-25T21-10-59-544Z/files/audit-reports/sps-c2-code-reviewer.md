# Audit cycle 2, code-reviewer: pitch state-project-sources

- Model: Claude Sonnet 5.5 (worker default).
- Checklist: walked. I applied the code-reviewer checklist, `coding-standards.md` and `boundaries.md` to whole files: `facts-sql.mts`, `facts-project.mts`, `facts-gather.mts` (`projectPanels`) and their tests.
- Cross-file interactions: reviewed. This covers the relationship names that `facts-sql` emits against `byName` in `facts-gather`, the unique-key names against the ERD `uk` marker, and the workspace states in `facts-project` against the 'Workspace list' row.
- Tests: Bun gives 82 pass, 0 fail for `facts-sql` and `facts-project`, and 39 pass, 7 skip, 1 fail for `facts-gather`. Node 24.21 gives 121 pass, 1 fail, 7 skip across all three files. The single failure is the same test in both runs: "end to end with the real reset". It fails because my copy in `/private/tmp/sps-audit2-code-reviewer/s` lacks `../integrations/skill-vendors.json`. That is a probe artifact, not a repository defect. The 7 skips are Archify-not-installed.
- Probes: `/private/tmp/sps-audit2-code-reviewer/p1.mts`, `p2.mts`, `p3.mts`, run on a copy. No repository file was edited.

## Cycle 1 fixes: verified holding

| Fix | Result |
|---|---|
| SEC-1/TC1 file-name allow-list | Holds. Names go through `scrubPath` and `MIGRATION_NAME`, and a refused file is skipped and counted. Probe K: `0002_add_password_reset.sql` is skipped and the source goes stale with "1 migration file(s) not read". |
| SEC-2 separators and key shapes | Holds. See K-note in N1 for the cost. |
| SEC-3 `render` is linear | Holds. Code read only; the loop stops at 80 characters. |
| SEC-4 byte caps | Holds. `lstat` size is checked before the read, per source (8 MB) and per scan (16 MB). |
| SEC-5 enqueue cap | Holds. |
| SEC-6/CR4 pnpm parsing | Partly holds. `packages:` after other keys, flow lists on one line and a quoted `#` all work. Two shapes fail (H, I below). |
| SEC-7 glob cap | Capped, but silently (N below). |
| SEC-9 200-char name cut | Holds. |
| SEC-10 skipped file leaves the source stale, not unavailable | Holds when at least one file reads. If every file is skipped, probe L returns `unavailable` ("SQL migrations could not be read"). I think that is acceptable because there is no schema to show. |
| CR1 identifier identity | Mostly holds. Exact-then-unique-case-insensitive lookup works for tables, columns, drop, alter, foreign keys and primary keys. Probe T: dropping `users` removes `"Users"`. Probe V: `ADD PRIMARY KEY (id, B)` resolves to the real columns, and `DROP COLUMN ID` removes `"Id"`. Probe F: relationships are emitted as `Org` / `Id` (the real names), and `facts-gather` `byName` matches them. Gaps: A, B, E, U below. |
| CR2 `ADD COLUMN IF NOT EXISTS` | Holds. Not re-probed beyond a code read of `facts-sql.mts:323-326`. |
| CR3/TC2 one-file folder with a journal | Holds. Probe O: one file plus `meta/_journal.json` becomes a source with 1 file and status observed. |
| CR5 workspace cap and refusal | Holds. Probe M: 21 packages give stale with a note. The renderer pushes a 'Workspace list' row at `facts-gather.mts:361`. |
| CR6 `fieldsMax` is a total | Holds. Code read only. |
| CR7 partial unique index | Mostly holds. See Q. |
| TC4, C2/C3 | Not exercised beyond a read. Unverified. |

## Findings

| ID | Severity | file:line | defect | failure scenario | verified |
|---|---|---|---|---|---|
| H | should-fix | `facts-project.mts:77` | A block `packages:` list whose dashes sit at column 0 is valid YAML. The loop treats `^\S` as the next top-level key, so it stops before the first item. | `pnpm-workspace.yaml` is `packages:\n- 'apps/*'\n- 'libs/x'`. Probe `p2` case H returns `status=unconfigured`, `value=null`, note "no workspace configuration found", although the file exists. The file shows up in `evidence` while the panel says nothing is configured. Fix: break only when the line is not blank, not a comment and does not start with `-`. | yes |
| A | should-fix | `facts-sql.mts:441` | CR1 maps relationship and primary-key columns to real names, but `unique` is emitted as written. `facts-gather.mts:305,310` matches `single.has(raw)` against the real column name, so the ERD `uk` key is lost. | `CREATE TABLE t ("Email" text, id int); CREATE UNIQUE INDEX i ON t (email);` Probe p1 A prints `unique=[["email"],["email"]]` and columns `["Email","id"]`. The unique never matches column `Email`. Fix: map `unique` through `getC(t, n)?.name ?? n` as `actual()` does. | yes |
| N | should-fix | `facts-project.mts:199` | SEC-7 caps the workspace glob listing at `entriesPerDir` but sets no flag. The fact stays `observed` with no note, so a partial list looks complete. | `workspaces: ["p/*"]` with 8 package dirs and `entriesPerDir: 3`. Probe p2 case N returns `observed`, note undefined, 3 packages. Set `overflow` or `incomplete` when `readdirSync` returned more than the limit. | yes |
| G | should-fix | `facts-project.mts:469` | Files are replayed in lexical order, but the name pattern `^\d+_` accepts unpadded numbers. `10_c.sql` sorts before `1_a.sql`. The pitch says "sorted name order", so this matches the contract, but it silently reorders the replay. | Files `1_a.sql` (create), `2_b.sql` (add x) and `10_c.sql` (add y). Probe G gives table `a` with columns `[id, x]`; `y` is missing. Status is `stale` ("1 statement(s) not understood"), so the output is flagged, not hidden. Options: sort by numeric prefix, or document that it needs zero-padded names. | yes |
| U | nit | `facts-sql.mts:369-370` | `DROP TABLE` on an ambiguous name (two tables that differ only in case) is a no-op, but it returns understood. Nothing is counted, so status stays `observed`. | `CREATE TABLE "Users"(id int); CREATE TABLE "USERS"(id int); DROP TABLE users;` Probe p3 U leaves both entities with `notUnderstood=0`. A real database would have dropped one of them. | yes |
| B | nit | `facts-sql.mts:398`, `facts-gather.mts:315` | `approximate` holds the name as written in the statement, but the ERD looks it up by the entity's real name. | `CREATE TABLE "Users"(id int); ALTER TABLE users ALTER COLUMN id TYPE bigint;` Probe p1 B: `approximate=["users"]`, entity is `Users`, so the "(approx.)" suffix is never drawn (the `approximate table(s)` count still shows). Fix: store the real table name once the lookup resolves. | yes |
| Q | nit | `facts-sql.mts:298-304` | The partial-index check runs after the column list only. `INCLUDE (...) WHERE ...` puts `INCLUDE` first, so the partial index is added as a unique key. | `CREATE UNIQUE INDEX i ON t (a) INCLUDE (b) WHERE c > 0;` Probe p3 Q gives `unique=[["a"]]`. Fix: skip an optional `INCLUDE (...)` group before the `WHERE` test. | yes |
| M | nit | `facts-project.mts:223` | `add` sets `overflow` before it checks the path is a directory. A 21st literal that does not exist reads as "more than 20 packages". | `p/*` expands to exactly 20 dirs, plus the literal `missing-literal`. Probe p2 M returns stale "more than 20 workspace packages" with 20 listed. | yes |
| I | nit | `facts-project.mts:59-70` | A flow list that spans lines (`packages: [` then items on later lines) yields no items and no `unresolved` count, so it reads as unconfigured. | `packages: [\n 'apps/*',\n]` gives `unconfigured` (probe p2 I). | yes |
| J | nit | `facts-project.mts:238,256` | The same workspace listed in both `pnpm-workspace.yaml` and `package.json` is added twice. Duplicates use up the 20-package cap. | Probe p2 J gives `["apps/a","apps/a"]`. | yes |
| E | nit | `facts-sql.mts:274` | `CREATE TABLE IF NOT EXISTS` checks the exact key only, so a case-different name creates a second table. This is inconsistent with the case-folded lookups used everywhere else. After it, a non-exact lookup is ambiguous and returns no table. | `CREATE TABLE users(id int); CREATE TABLE IF NOT EXISTS "Users"(id int, x int);` Probe p1 E gives entities `["users","Users"]`. SQLite and MySQL would no-op here. | yes |
| N1 | nit | `facts-project.mts:386` | SEC-2 makes `_` a separator, so common migration names such as `0002_add_password_reset.sql` or `*_secret_*.sql` are skipped. Later migrations that alter those tables then become "not understood". The behaviour is honest (stale plus a count) but loses real schema. | Probe p2 K: table `pr` is missing, `1 migration file(s) not read; 1 statement(s) not understood`. The coordinator should accept this as a deliberate trade-off or narrow it (for example, refuse only key shapes in file names). | yes |

## Tried and did not break

- Performance of `fold` on misses: 3001 tables and 60000 foreign keys to missing targets took about 1.2 s (probe C). 900 `ALTER` on missing tables took 24 ms (probe D). I found no blow-up within the 8 MB byte cap.
- `DROP CONSTRAINT "Fk_X"` against an unquoted `Fk_X` stays unmatched (probe R) and is counted as not understood. That matches Postgres identifier rules, so I did not report it.
- The journal exception (probe O) and the relationship names against `byName` (probe F) both behaved correctly.

## Unverified

- I did not read `*.test.mts` line by line; I only ran them. I did not independently re-check the TC4 isolated one-file test, or the C2/C3 doc claims against the code.

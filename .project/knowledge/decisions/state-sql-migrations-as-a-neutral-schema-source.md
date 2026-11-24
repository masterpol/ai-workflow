---
id: state-sql-migrations-as-a-neutral-schema-source
type: decision
status: accepted
created: 2026-11-24
updated: 2026-11-24
tags: [state-report, archify, erd, sql, monorepo, untrusted-input]
related: [state-project-depth-for-installed-projects, a-real-schema-breaks-a-naive-erd, a-source-scanner-fails-closed-on-what-it-cannot-read, backtracking-regex-over-untrusted-text-is-quadratic, replace-a-library-with-a-fixture-table-from-the-library, archify-renders-the-state-report]
alternatives: [parse-orm-schemas, per-vendor-readers, live-database-introspection]
applies-to: [state]
source: state-project-sources
---

# Decision: `/state` reads SQL migrations as the vendor-neutral schema source, and reports what it found, not just what it drew

## Summary

[[state-project-depth-for-installed-projects]] limited the schema to a Drizzle snapshot at the project root and ruled out a parser over free text.
Five installed projects showed the cost: a schema was drawn for one of five, and "unconfigured" read as "no database" where there was one.
This decision narrows that rule instead of removing it: SQL DDL is read, with a closed statement set and fail-closed status. Everything else stays out.

## Decision

- **SQL migrations are a schema source** (`facts-sql.mts`), replayed in file-name order: `CREATE TABLE`, `ALTER TABLE` add/drop column, add foreign or
  primary key, `DROP TABLE`, `CREATE UNIQUE INDEX` and `DROP INDEX`. The reader is pure text in, schema out: no file access, no process, no network, no execution.
- **Fail closed.** `observed` only when every file was read in full and every statement touching a table was understood. A statement outside the set is
  counted and the tables it names are `approximate`; an unterminated quote, comment or dollar quote, a refused file or a budget hit is `stale`
  ([[a-source-scanner-fails-closed-on-what-it-cannot-read]]). "No schema source found" is said only when detection finished and found nothing.
- **One schema is drawn; the rest are named.** A Drizzle snapshot wins only for the same folder when its journal covers every migration; otherwise the
  source with the most tables wins. Alternatives and found-but-not-read sources (TypeScript, Prisma, Python) are listed by path.
- **Monorepos.** Workspaces come from the top-level `packages:` block of `pnpm-workspace.yaml` or `package.json` `workspaces`; discovery runs under each, depth ≤5.
- **Still out:** parsing any ORM schema, executing SQL, a database connection, a route map (a followup), service diagrams.

## Consequences

- **Pros:** LAH shows all 13 tables instead of 9 from a stale snapshot; a nested `apps/api/drizzle` and an RN-style `src/db/migrations` are found.
- **Cons:** a hand-written grammar over three dialects. The lexer is linear with a doubling-time test and two mutants, and fixtures come from real
  migrations ([[replace-a-library-with-a-fixture-table-from-the-library]], [[backtracking-regex-over-untrusted-text-is-quadratic]]).
- **Residual:** migrations that rename or retype columns leave tables approximate; the page says so rather than guessing.

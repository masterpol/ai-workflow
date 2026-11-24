# Pitch: state-project-sources

**Date**: 2026-11-24  •  **Appetite**: big-batch (≤15 files, ≤1500 LOC; cut line below)
**Stack**: backend (workflow scripts; no model behavior, so no eval case)

## Problem

`/state` at project depth shows a database schema only for a Drizzle snapshot at the project root. Run against five installed
projects (2026-11-24), it found a schema in one:

| Project | What it showed | What is really there |
|---|---|---|
| LAH | 9 tables, stale (snapshot covers 3 of 12) | 12 SQL migrations, 13 `CREATE TABLE` |
| RN | "unconfigured" | SQL migrations in `apps/guaca-app/src/db/migrations/` and `packages/data/src/drizzle/`; a TypeScript schema in `packages/data/src/schema.ts` |
| climbing-lab-monorepo | "unconfigured", no frameworks | `apps/api/drizzle/meta/` with 7 snapshots, pnpm workspaces `apps/*` + `packages/*`, two route trees |
| comuna, lasallenorandi | "unconfigured" | docs-only projects: nothing is missing |

A person reads "unconfigured" as "this project has no database". For three of five that is false. The page also draws no flow
or architecture diagram, and a monorepo shows one root `package.json`.

## Knowledge consulted

- [decisions/state-project-depth-for-installed-projects] — set "structured sources only, no parser over free text". This pitch
  reopens that for SQL DDL only (see the rabbit hole and the supersede step at /ship).
- [issues/a-real-schema-breaks-a-naive-erd] — a real schema broke Archify validation (self-FKs, hidden targets, name collisions).
  Every new source feeds the same ERD builder, so these guards already apply; new inputs must be tested against them.
- [patterns/pin-the-descriptor-you-hashed-before-removing-or-replacing] — reads are bounded and refuse links; new readers reuse the
  one `read` the collector already has.
- [patterns/parse-untrusted-values-and-re-emit-them] and [patterns/allow-list-untrusted-labels-at-ingest-and-at-render] — a SQL
  identifier or route path is an untrusted label: parse it against a grammar and re-emit it, never copy it into the draft.
- [patterns/a-source-scanner-fails-closed-on-what-it-cannot-read] — unreadable syntax must never read as "observed" or as "absent".
- [patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code] — a safe file reader does not guard directory listing: every new
  traversal checks containment before it lists, and one refused workspace must not erase its siblings.
- [issues/backtracking-regex-over-untrusted-text-is-quadratic] and [issues/counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys]
  — the SQL lexer is linear with cursor progress, and registries are `Map`s.
- [issues/snapshot-metadata-bypassed-output-scrubbing] — project paths in evidence and notes are scrubbed at ingest.
- [patterns/replace-a-library-with-a-fixture-table-from-the-library] — dialect fixtures come from real migrations, not hand-written.
- [patterns/warn-text-must-be-self-consistent-with-the-code-it-ships] — the state skill and contract still say "no database section".
- [decisions/archify-renders-the-state-report] — the draft holds only collector facts. Archify allows 4 diagrams; project depth uses
  2 now (erd, tree).

## Solution sketch (breadboard, NOT wireframe)

**Places**: `facts-project.mts` (detect, workspaces) · new `facts-sql.mts` (DDL reader) · `facts-gather.mts` (ERD, wording) · `state-report.md` and the state skill (contract).

**Affordances per place**

- **Detect** (`facts-project`): one pass that lists the sources a project has, each with a status: `observed`, `stale`,
  `unconfigured` (looked, nothing there), `unavailable` (found, not read, with the reason).
  - Workspace roots: `pnpm-workspace.yaml` `packages:` lines, `package.json` `workspaces` (array or `{packages}`); only literal paths
    and one trailing `/*`. Anything else is counted as unresolved.
  - Database candidates: a Drizzle `meta/` folder, or a folder holding SQL migration files (`NNNN_*.sql` or a timestamp prefix),
    found under the root and each workspace, depth ≤5, under the existing directory budget.
  - Found but not read: `schema.prisma`, `schema.ts` beside a drizzle config, `models.py`. Reported by path with "not read: <kind>".
- **Read SQL** (`facts-sql`): a string-, comment- and dollar-quote-aware statement splitter, then a closed set of statements:
  `CREATE TABLE` (columns, types, primary key, unique, foreign keys inline and as constraints), `ALTER TABLE` add column, drop
  column, add foreign key, add primary key, `DROP TABLE`. Files replay in sorted name order. Everything else is counted as
  "N statements not understood", never guessed and never executed.
- **Choose the source**: one schema is drawn. A Drizzle snapshot wins when its journal covers every migration. A stale snapshot loses
  to the SQL migrations replayed from the same project. Other sources are named in the note, not drawn.
- **Status rules** (fail closed): a schema is `observed` only when every file was read in full and every statement touching a table
  was understood. An un-understood statement marks the tables it names as approximate and the source `stale`; an unterminated quote,
  comment or dollar quote, a refused file, or a hit budget makes the source `stale` (known tables kept, "at least") or `unavailable`
  (no table could be built). An incomplete scan never says "no schema source found".
- **Hygiene**: migration folders need ≥2 sequentially named files or a `meta/_journal.json`; `node_modules`, `dist`, `build`, `.next`,
  `ios`, `android`, `fixtures` and test folders are skipped. Every directory is checked for containment and links before it is listed.
  Evidence paths are scrubbed at ingest; a path that changes when scrubbed is refused with a fixed reason code.
- **Wording** (`facts-gather`): the page says which source it used ("from 12 SQL migrations in `drizzle/`"), which it found and did not
  read, and "no schema source found" only when detection found none. Workspace packages get one stack row each (up to 20).

**Connections**: detect → pick source → reader → facts → the existing ERD builder (unchanged guards) → draft → Archify validate.
The collector still runs no project code, child process, database or network.

## Rabbit holes

**Resolved here** (with answer):
- Reopening "no parser over free text" → resolution: SQL DDL only, a closed statement set, string/comment-aware lexing, byte and
  statement budgets, unparsed statements counted and shown. It never executes, connects, or imports. The 2.53.0 decision is
  superseded by a new decision entry at /ship, not edited.
- Migration folders have no standard name (RN uses `src/db/migrations` and `src/drizzle`) → resolution: detect by file naming and
  content kind, not by folder name.
- Replay order → resolution: sorted file name. Drizzle `0000_`, Supabase and Prisma timestamps all sort in time order.
- SQL dialects (LAH is SQLite with backticks and `ALTER COLUMN ... TO`; RN is Postgres) → resolution: accept `"x"`, `` `x` `` and
  `[x]`; a statement the closed set does not match is counted, not an error.
- A monorepo with two databases → resolution: draw the source with the most tables (ties by path), list the rest.
- A table or column name is untrusted text (three quote styles, doubled quotes, dots, `__proto__`) → resolution: unquote, allow-list and
  re-emit as the existing builder does; registries are `Map`s; hostile names go through a real `archify validate`.
- The lexer on hostile input (repeated unterminated quotes, comments, dollar quotes) → resolution: one linear pass with a cursor that
  always advances, bounds before any regex, and a timing test whose time must scale linearly when the input doubles.
- `pnpm-workspace.yaml` has other top-level keys (`catalog:`, `overrides:`) → resolution: read only the top-level `packages:` block,
  strip quotes and comments, treat `!` lines and mid-path globs as unresolved.
- A snapshot is complete but hand-written SQL adds more (RN triggers and grants) → resolution: the note names the source used and what
  was ignored; a fixture covers it.

**Pushed to /plan as risk** (with named owner):
- Exact byte and statement budgets for the reader (coordinator proposes; the audit stress-tests with a 5 MB file and 10 000
  statements, valid and adversarial).
- The reader is the first /plan spike: if the splitter plus `CREATE TABLE` parser passes about 400 LOC, it becomes its own small-batch pitch
  and this one keeps detection, workspaces and wording.
- Dialect fixtures from real forms (LAH SQLite `ADD` without `COLUMN`, RN Postgres `ADD COLUMN`, backtick tables, `$$` bodies); expected
  results checked against an engine where one is installed (a development-only step; the collector stays offline).
- Whether the Drizzle-vs-SQL choice needs the journal count or just snapshot freshness (planner, with a LAH fixture).
- How a self-referencing or cross-schema key in SQL maps onto the existing ERD guards (planner; reuse the collision tests).

**Pushed to no-go** (deferred):
- Prisma, TypeScript-schema, Django/SQLAlchemy and other ORM sources: reported as "found, not read", not parsed.
- **Route map diagram** (generated TanStack `routeTree.gen.ts`, and other frameworks): cut at critique (over the LOC cap; climbing-lab has
  two route trees and no rule for which wins). A followup.
- OpenAPI, docker-compose and supabase service diagrams: none of the five projects had one; a followup when one does.
- Release coordination with `workflow-v3-rollout` (which release it syncs; regenerate `/state` after the final sync) is owned by that
  pitch and recorded as a followup here.

## No-gos (this pitch)

- ✗ No executing SQL, no database connection, no project code, no child process, no network (the 2.53.0 no-gos stay).
- ✗ No model-written text in the draft.
- ✗ No parsing of TypeScript, Prisma, Python or any ORM schema.
- ✗ No change to the simple-depth page (this bundle's own checkout): the golden comparison stays byte-identical.
- ✗ No Archify bump, vendoring or auto-install; at most 4 native diagrams.
- ✗ No new config key (detection, as in 2.53.0).
- ✗ No route map or any third native diagram in this pitch.

## Cut line

Critique projected about 1600 to 1700 LOC with tests, over the 1500 cap. The route map is cut now. What stays: detection and workspaces,
the SQL reader, source choice and status rules, wording, the contract and skill reconciliation, and tests (a separate
`facts-sql.test.mts`). If the reader spike passes about 400 LOC, it splits into its own pitch (see /plan risks).

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-11-24 as Orca workers (Run `run_05080422e84d`): knowledge-historian, skeptic, appetite-auditor, cross-pitch-projector.
`eval-regression-projector` does not apply (no model behavior). Raw reports: `critique/`.

| ID | Perspective | Severity | Type | Disposition |
|----|-------------|----------|------|-------------|
| K1, S1 | knowledge-historian, skeptic | high | incomplete replay reads as authoritative | **Addressed**: status rules; approximate tables; never "absent" on an incomplete scan |
| K2 | knowledge-historian | high | project paths bypass scrubbing | **Addressed**: scrub at ingest; refuse changed paths; fixed reason codes |
| K3 | knowledge-historian | high | directory listing not guarded by the file reader | **Addressed**: containment check before every listing; section isolation |
| K4, S3 | knowledge-historian, skeptic | high | quadratic lexer, prototype keys, quoting | **Addressed**: linear lexer, `Map`s, unquote then allow-list, adversarial timing test |
| S2 | skeptic | high | over-matching `.sql`, `node_modules` burning the budget | **Addressed**: ignore list, ≥2 sequential files or journal, budget hit is `stale` |
| K5 | knowledge-historian | medium | hand-written dialect fixtures | **Addressed** (plan risk): fixtures from real forms, engine-checked |
| K6 | knowledge-historian | medium | skill and contract still deny a database section | **Addressed**: reconcile in this pitch |
| S4 | skeptic | medium | `packages:` block boundary, negations, quotes | **Addressed**: top-level block only |
| S5, A1, A5 | skeptic, appetite-auditor | medium | route map: two trees, over the cap | **Addressed**: route map cut to a followup |
| S6 | skeptic | low | complete snapshot hides extra SQL | **Addressed**: note and fixture |
| A2 | appetite-auditor | medium | reader may pass 400 LOC | **Addressed**: first /plan spike; split rule |
| A3, A4, A6 | appetite-auditor | medium/low | workspace and source-choice cost; test size | **Addressed**: unresolved patterns counted; decision table per project; separate test file |
| X1 | cross-pitch-projector | medium | rollout syncs an older release | **Acknowledged**: followup owned by `workflow-v3-rollout` |
| X2, X3, X4 | cross-pitch-projector | low | shipped baseline; release bookkeeping; disjoint | **Acknowledged**: build on 2.53.0; serialize version bump after the Orca ship |

## Bet decision

☑ **Bet** (→ /plan) — 2026-11-24, approved by the owner after critique; the route map was cut and the critique dispositions above apply.  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/state-project-sources/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.

# Plan: state-project-sources

**Pitch**: pitch.md  •  **Appetite**: big-batch (cap 15 files / 1500 LOC)  •  **Hill**: hill.md  •  **Mode**: Orca, Run `run_05080422e84d`

Route map is cut (critique); this plan builds detection, the SQL reader, source choice with fail-closed status rules, and wording.

## Contracts fixed here (so scopes can run in parallel)

**`readSql` (S1 exports, pure: no fs, no child, no network).**

```ts
export interface SqlFile { path: string; text: string }            // path is the project-relative label; the reader never opens it
export interface SqlBudgets { filesMax?: number; bytesPerFile?: number; bytesTotal?: number; statementsMax?: number; entitiesMax?: number; fieldsMax?: number; relationshipsMax?: number }
export interface SqlSchema {
  dialect: string;                                                  // "sqlite" | "postgresql" | "mysql" | "" (guessed from quoting and keywords, never trusted)
  entities: { name: string; schema: string; columns: { name: string; type: string; pk: boolean; nullable: boolean }[]; unique: string[][] }[];
  relationships: { from: string; fromSchema: string; fromColumns: string[]; to: string; toSchema: string; toColumns: string[] }[];
  total: { entities: number; relationships: number };
  approximate: string[];                                            // raw names of tables an un-understood statement touched
  notUnderstood: number;                                            // statements outside the closed set (counted, never executed)
  incomplete: "none" | "lexical" | "budget";                        // unterminated quote/comment/dollar quote, or a budget was hit
}
export function readSql(files: readonly SqlFile[], budgets?: SqlBudgets): SqlSchema;
```

Same entity and relationship shape the Drizzle reader already emits, so the ERD builder in `facts-gather` is unchanged.

**Database fact value (S2 emits, S3 reads)** extends the existing value: `source: { kind: "drizzle-snapshot" | "sql-migrations"; path: string; files: number; ignored?: string }`,
`approximate: string[]`, `notUnderstood: number`, `alternatives: { kind: string; path: string; tables: number }[]`, `found: { kind: string; path: string }[]`
(found, not read: `schema.prisma`, `schema.ts` beside a drizzle config, `models.py`). Status: `observed` only when `incomplete === "none"`, `approximate` and
`notUnderstood` are 0 and every file was read; otherwise `stale`; `unavailable` when no table could be built from a source that exists; `unconfigured` only when
detection completed and found nothing.

**Workspaces fact (S2 emits, S3 reads)**: `project.workspaces: Fact` with value `{ packages: { path: string; name: string; frameworks: string[] }[]; unresolved: number }`.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | SQL DDL reader (`readSql`) | `facts-sql.mts`, `facts-sql.test.mts` | 400 + 350 | — (first spike) | S2 | yes: new files, contract above, self-contained tests | deep (lexer correctness) |
| S2 | Detection, workspaces, source choice | `facts-project.mts`, `facts-project.test.mts` | +250 + 250 | contract only; integrates S1 | S1 | yes: disjoint files, exit commands are tests | standard |
| S3 | Wording, workspace stack rows, approximate marking | `facts-gather.mts`, `facts-gather.test.mts` | +120 + 150 | S2 | — | yes: disjoint files; real `archify validate` tests | standard |
| C1 | Contract, skill and mirror, doctor list, decision, followups, 2.55.0 | `state-report.md`, `.claude/skills/state/SKILL.md`, `.cursor/skills/state/SKILL.md`, `workflow-doctor.mts`, `CHANGELOG.md`, `VERSION`, decision entry | docs | S1–S3 | — | no: coordinator, reconciles the others | — |

Files: 13 plus 1 knowledge entry = 14 of 15. Estimated source about 770 LOC and tests about 750; at the cap. **Spike rule:** if `facts-sql.mts` exceeds 450 lines
at S1 exit, stop: the reader becomes its own small-batch pitch and this plan keeps S2, S3 and C1 against a reader that supports `CREATE TABLE` only.

## Exit criteria per scope (machine-checkable)

### S1 — SQL DDL reader
- `bun test ai-framework/scripts/facts-sql.test.mts` exit 0, and the same file under `node --experimental-strip-types --disable-warning=ExperimentalWarning --test` exit 0.
- `test $(wc -l < ai-framework/scripts/facts-sql.mts) -le 450`.
- `! grep -nE "child|net\b|eval\(|new Function|import\(|require\(|from \"node:(child_process|net|fs)" ai-framework/scripts/facts-sql.mts` (pure: no process, network, fs or dynamic code).
- Real-form fixtures committed and sanitized: LAH SQLite (`ADD` without `COLUMN`, backticks, `ALTER COLUMN … TO`, `--> statement-breakpoint` glue), RN Postgres (`ADD COLUMN`, `$$` function body with `;` inside, grants), double-quoted and bracket identifiers, `DROP TABLE` then re-`CREATE`. Each expected schema is hand-checked against an engine where one is installed (`sqlite3` for the SQLite forms); provenance is recorded in the test file header.
- Un-understood statements: `RENAME`, `ALTER COLUMN … TYPE`, `CREATE FUNCTION`, `CREATE TRIGGER` counted in `notUnderstood`; tables an un-understood `ALTER`/`RENAME` names are in `approximate`; `incomplete` is `lexical` for an unterminated quote, comment or dollar quote and `budget` when a budget is hit.
- Hostile input: doubled quotes (`"a""b"`), identifiers with `.`, `~`, spaces, newlines, `__proto__`, `constructor`, a 5 MB file, 10 000 statements; repeated unterminated openers. A timing test doubles the input and asserts the time ratio stays under 3, with its own deadline.
- Mutant: removing the cursor-advance guard or the dollar-quote branch fails a named test.

### S2 — Detection, workspaces, source choice
- `bun test ai-framework/scripts/facts-project.test.mts` and the same under Node exit 0 (existing tests unchanged except the documented fact-shape additions).
- Workspaces: only the top-level `packages:` block of `pnpm-workspace.yaml` (a fixture copied from climbing-lab with `catalog:` and `overrides:` below it), `package.json` `workspaces` as array and `{packages}`; `!` lines and mid-path globs counted in `unresolved`; at most 20 packages; a linked or refused workspace dir leaves its siblings readable.
- Detection: climbing-lab shape finds `apps/api/drizzle/meta` snapshots; RN shape finds `apps/guaca-app/src/db/migrations` and `packages/data/src/drizzle` and lists `packages/data/src/schema.ts` under `found`; a lone `fixtures/*.sql` and a one-file folder are not migrations; `node_modules`, `dist`, `build`, `.next`, `ios`, `android` and `fixtures` are never entered.
- Source choice per project, one test each: LAH (stale snapshot loses to 12 SQL files), complete snapshot with extra SQL (snapshot wins, `ignored` names the SQL), RN (largest by tables wins, other listed in `alternatives`), climbing (snapshot at a nested path), comuna (docs only: `unconfigured`), a budget hit (`stale`, never `unconfigured`).
- Status rules: `incomplete`, `approximate`, `notUnderstood` or a refused file ⇒ not `observed`.
- Hygiene: every directory is checked for links and containment before it is listed (tests for an ancestor symlink, a leaf symlink and a non-regular file); an evidence path that changes when scrubbed is refused with a fixed reason code; credential-shaped folder and file names never appear in the facts JSON.
- Injected throwing `child` and `net` in the existing no-process test still pass for every new reader.

### S3 — Wording, workspace stack rows, approximate marking
- `bun test ai-framework/scripts/facts-gather.test.mts` and the same under Node exit 0, including the existing 4 real `archify validate` cases and the golden simple-depth draft byte-identical.
- New real `archify validate` cases (skipped when Archify is not installed, as the existing ones are): an ERD from SQL migrations with an approximate table, hostile names (`__proto__`, doubled quotes, dots), same table name in two schemas from SQL.
- The database note names the source ("from N SQL migrations in `<path>`"), the alternatives, the found-not-read paths and, for `stale`, why. "No schema source found" appears only when detection finished with nothing. Approximate tables carry a fixed marker in the label and the note counts them.
- Workspace packages produce one stack row each (≤20) through the existing label cleaner.
- `! grep -n "route" ai-framework/scripts/facts-gather.mts | grep -i "routeTree"` (no route map in this pitch).
- At most 2 native diagrams at project depth: an assertion in the tests.

### C1 — Contract, skill, mirror, doctor, release
- `node ai-framework/scripts/workflow-doctor.mts` READY; `facts-sql.mts` and its test are in the syntax-check list (a test asserts every `facts-*.mts` file is in it).
- `node ai-framework/scripts/docs-links.mts` and `setup-validator.mts` pass; `diff -q .claude/skills/state/SKILL.md .cursor/skills/state/SKILL.md` shows only the known mirror differences, none in the changed lines.
- The state skill Step 5 and the contract's "dropped" section no longer deny a database or structure section at project depth (K6); `state-report.md` documents the new sources table, status rules and budgets.
- A new decision entry supersedes the SQL half of `state-project-depth-for-installed-projects` with `related` links; `node ai-framework/scripts/graphify.mts --check` passes.
- Version 2.55.0 and the changelog entry written after `orca-balanced-role-pools` has shipped (serialize release bookkeeping; X3). `node ai-framework/scripts/changelog.mts --check` exit 0.
- Live check, evidence only (not in the suite): `facts-gather --depth project --json` against LAH, RN, climbing-lab-monorepo, comuna and lasallenorandi; LAH reports all 13 tables from SQL with `stale` or `observed` as the status rules say, climbing finds its nested schema, RN reports its SQL source and lists the TypeScript schema as found-not-read, and none of the three says "unconfigured".

## Risks (inherited from pitch)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Reader passes ~400 LOC | S1 | **yes: S1 is the spike** | 450-line exit check; split rule above |
| Incomplete replay reads as authoritative (K1, S1) | S1, S2, S3 | no | `approximate`, `notUnderstood`, `incomplete`; status rules tested at S2 and S3 |
| Lexer quadratic or looping on hostile input (K4, S3) | S1 | no | cursor-advance invariant, doubling timing test, mutant |
| Dialect fixtures copy the author's grammar (K5) | S1 | no | fixtures from real LAH/RN files, engine-checked, provenance recorded |
| Directory listing unguarded, one workspace erases siblings (K3) | S2 | no | containment check before every listing; sibling test |
| Paths leak credential-shaped names (K2) | S2, S3 | no | scrub at ingest, fixed reason code, facts-JSON test |
| Over-matching `.sql` and `node_modules` burning the budget (S2) | S2 | no | ignore list, ≥2 sequential files or journal, budget hit is `stale` |
| Contradictory docs (K6) | C1 | no | reconcile skill Step 5 and contract in the same scope |
| Interface drift between S1/S2/S3 | all | no | contracts fixed above; coordinator runs the integration test after each lands |

## Parallel dispatch plan

Orca Run `run_05080422e84d`; dispatch with `assign: { role: "implementation", planIndex }` and `runId`, so the pool balances load (planIndex S1=0, S2=1, S3=2).
S1 and S2 run in parallel (disjoint files, contract above). S2 integrates S1 once it lands: the coordinator runs the S1+S2 tests together and wires `readSql` if S2 used a stub.
S3 starts after S2 is collected. C1 is the coordinator's, after S3. After each scope: independently re-run the exit commands, check `git diff --stat` against the authorized paths, collect `worker_done`, release the worker, settle the ledger. OpenCode port freed before any OpenCode launch.

## Living-spec deviations log

- **S2 size**: `facts-project.mts` grew from 187 to 609 lines (+422, estimate +250) and its tests to 610; total with S1 (420 + 299) and S3 (+44/+112) is about 1650 LOC, about 10% over the 1500 cap. S1 stayed within its 450-line spike limit (420). Accepted; recorded for the audit.
- **S2 took about 2 hours** on the opencode vendor (the slowest model in the pool). The coordinator's live check on LAH, RN, climbing-lab and comuna found four defects (everything stale from a refused-entry bug, a docs-only project reporting stale, wrong source choice across folders, empty found list) and sent them to the worker, which fixed them.
- **Resurrected terminal**: the released opencode appetite-auditor terminal came back after a restart and received the S2 dispatch in its old session. It was redirected by message; its stray `critique-out/` file was removed.
- **S3 dispatched with `assign.skip: ["opencode"]`** (coordinator choice after the S2 cost); the pool picked codex.
- **C1**: version 2.55.0 and the CHANGELOG entry are deferred to /ship, after `orca-balanced-role-pools` ships (release bookkeeping is serialized, X3). The doctor's runtime-boundary check required the S1 mutant harness to use runtime deps instead of node:child_process/fs/os; fixed by the coordinator.
- **RN** is read from a complete Drizzle snapshot at `apps/guaca-app/src/db/migrations/meta` (3 tables, `observed`), not from the SQL files beside it.

- **Audit (3 cycles)**: 7 must-fix and about 20 should-fix findings were fixed (record: `.project/analysis/2026-11-24-state-project-sources-audit.md`). `facts-sql.mts` grew from 420 to 454 lines and `facts-project.mts` from 609 to about 740; the SECRET_PATTERNS list moved from `facts-gather.mts` to `facts-project.mts` (exported, imported back) so one list serves the cleaner and the name refusal. The cycle-3 fixes were not re-reviewed (cap).

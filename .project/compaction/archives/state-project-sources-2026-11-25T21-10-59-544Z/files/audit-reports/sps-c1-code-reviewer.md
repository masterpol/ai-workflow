# Audit cycle 1 — code-reviewer — state-project-sources

Model: GPT-6 / Codex worker default; the exact deployment identifier is not exposed to this session.

Checklist walked item by item: Yes. I applied the role checklist, coding-standards.md and boundaries.md to the assigned scope. Web/auth/CSRF/UI-reactivity items are not applicable to this offline collector; external dependency advisory checks remain unverified.

Cross-file interactions reviewed: Yes. I traced readSql → createProjectFacts → facts-gather projectPanels, including filesystem/renderer helpers, the three test files, pitch contracts, project-depth documentation, state skill and decision entry.

## Findings

All probes ran copied source. `P` below means `/private/tmp/sps-audit-code-reviewer`; scripts and complete outputs remain there. The report is the only repository file created by this worker.

| ID | Severity (must-fix/should-fix/nit) | file:line | rule violated or defect | failure scenario with the command you ran and its output | verified (yes/no) |
|---|---|---|---|---|---|
| CR1 | must-fix | ai-framework/scripts/facts-sql.mts:172; facts-sql.mts:184; facts-gather.mts:261 | Identifier identity loses quotation information. Table/column map keys lowercase quoted identifiers, while emitted unquoted entity/FK names retain inconsistent case. This violates SQL correctness and complete/observed exits. Preserve quoted case and canonicalize unquoted identities consistently through the renderer. | `node /private/tmp/sps-audit-code-reviewer/probes.mts`: `CREATE TABLE "Foo" ("ID" int PRIMARY KEY, "id" text); CREATE TABLE "foo" (id int);` produces only one entity, `foo`, with `notUnderstood:0,incomplete:"none"`; PostgreSQL allows both tables and differently quoted columns. The `case-fk-page` fixture creates `Users (Id int PRIMARY KEY)` then `posts (... REFERENCES users(id))`: the fact reports one relationship and `observed`, but the page emits `relationships:[]` and says `2 table(s), 0 relationship(s) shown ... [observed]`. | yes |
| CR2 | must-fix | ai-framework/scripts/facts-sql.mts:302 | ADD COLUMN IF NOT EXISTS discards its guard and replaces an existing column, changing its type, primary-key flag and nullability. This violates S1 replay and S2 observed-only-when-complete exits. | `node /private/tmp/sps-audit-code-reviewer/probes.mts`, `ifne`: `CREATE TABLE t (id integer PRIMARY KEY); ALTER TABLE t ADD COLUMN IF NOT EXISTS id text;` yields `columns:[{name:"id",type:"text",pk:false,nullable:true}]`, `notUnderstood:0,incomplete:"none"`. The integer primary key must remain intact. | yes |
| CR3 | should-fix | ai-framework/scripts/facts-project.mts:403 | Detection requires two SQL files even when a journal exists. The project-depth contract accepts two sequential files **or a journal**. Recognize journal-backed single-file folders, including sibling meta journals. | `node /private/tmp/sps-audit-code-reviewer/probes.mts`, `journal-one`: `_journal.json` with one entry and `0000_init.sql` containing `CREATE TABLE t(id int)` returns `value:null,status:"unconfigured"` and a no-snapshot note instead of reading the SQL table. | yes |
| CR4 | should-fix | ai-framework/scripts/facts-project.mts:113; facts-project.mts:184 | YAML parsing stops on another top-level block before reaching packages; comment stripping also runs before quote handling. Both reject valid declarations promised by the workspace contract. Detect block boundaries after locating packages, and comments outside quotes. | `node /private/tmp/sps-audit-code-reviewer/probes.mts`: `yaml-before` places `catalog:` before `packages:` and has an existing packages/good/package.json; output is `status:"unconfigured",value:null`. `yaml-hash` declares quoted literal `'packages/a#b'` with an existing manifest and also returns unconfigured. The quoted hash belongs to the path. | yes |
| CR5 | should-fix | ai-framework/scripts/facts-project.mts:165; facts-project.mts:600; facts-gather.mts:357 | Workspace truncation/refusal is not reliably represented. The 20-package cap does not set incomplete; entirely refused lists become unconfigured before incomplete is checked. The renderer ignores workspace status/note, so existing stale warnings never reach the page. This conflicts with fail-closed discovery and status-based wording. | `node /private/tmp/sps-audit-code-reviewer/probes.mts`: `cap` declares 21 existing packages and returns 20 with `status:"observed",unresolved:0`, no truncation note. `refused-only` declares missing literal packages/missing and returns `status:"unconfigured",note:"no workspace configuration found"`. Inspection of projectPanels confirms only workspace value is consumed, not its status/note. | yes |
| CR6 | must-fix | ai-framework/scripts/facts-project.mts:336 | Aggregate fieldsTotal is passed to the SQL reader's per-table fieldsMax. Unlike snapshot parsing, SQL can emit entities × fieldsTotal fields without reporting a budget hit. This violates the S2 independent field-budget exit and the contract that budget hits are stale. Enforce a shared aggregate counter. | `node /private/tmp/sps-audit-code-reviewer/extra.mts`, `fields-total-two`: createProjectFacts with `{fieldsTotal:2}` reads two SQL tables with two columns each. Output contains all four columns with `incomplete:"none",status:"observed"`. The snapshot branch uses an aggregate counter for the same setting. | yes |
| CR7 | should-fix | ai-framework/scripts/facts-sql.mts:284 | A partial unique index becomes an unconditional unique key because createIndex ignores the trailing predicate. The renderer labels the column uk, a stronger constraint than exists. Count unsupported partial indexes as not understood. | `node /private/tmp/sps-audit-code-reviewer/probes.mts`, `partial`: `CREATE TABLE t(id int, active boolean); CREATE UNIQUE INDEX u ON t(id) WHERE active = true;` returns `unique:[["id"]],notUnderstood:0,incomplete:"none"`. Duplicate id values in inactive rows are legal. | yes |

## Verification and unsuccessful attempts

From P, with `TMPDIR=P/temp` and `ARCHIFY_UPDATE_CHECK_DISABLED=1`, I ran:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/facts-sql.test.mts ai-framework/scripts/facts-project.test.mts ai-framework/scripts/facts-gather.test.mts
bun test ai-framework/scripts/facts-sql.test.mts ai-framework/scripts/facts-project.test.mts ai-framework/scripts/facts-gather.test.mts
```

Final results: **both exit 0; 114 passed, 0 failed, 0 skipped**, including seven real Archify validations, golden simple draft, timing tests and both lexer mutants. Logs are P/node-tests-final.log and P/bun-tests-final.log. Each shell command stayed below approximately 20 seconds.

Initial isolated runs failed one test because I had not copied integrations/skill-vendors.json and skipped seven validations because Archify was not copied. After copying that JSON and the installed package, excluding secret-shaped files and symlinks, both complete reruns passed. These initial failures were review-environment omissions. My first report write also failed because audit-out did not exist; creating its parent and writing this report resolved it.

Independent probes confirmed correct CREATE → DROP → CREATE replay, missing-table ALTER counting, later-defined FK target primary-key resolution, and stale status when an alternative has a refused source. Those attempts did not uncover defects. Existing tests cover inline/composite keys, schema names, same-folder snapshot preference, unrelated source competition, table-count/path ties, alternatives, ignored sources and negations.

PostgreSQL engine comparison, external dependency advisories and a full static type check remain **unverified**. I did not regenerate graphs, run workflow phases, run excluded doctor scenarios, or launch helpers.

## Organization observations

The accepted LOC deviation is not reported again. Workspace parsing/discovery, snapshot interpretation and candidate selection are separable responsibilities within facts-project. Workspace discovery is a reasonable extraction because both database detection and workspace reporting use it. Snapshot freshness is computed in readDrizzleCandidate but freshnessNote is discarded by `readError: freshnessNote ? undefined : undefined`; database rereads the journal and repeats that logic. Carry the computed reason on the candidate to remove duplicate reads and possible inconsistent observations. This is a refactoring observation, not another blocking finding.

SqlEntity, SqlRelationship and SqlColumn annotations have no definitions/imports in facts-project. The injected clean helper is unused, and scrubLabel duplicates a subset of facts-gather cleaning. Node/Bun strip types, so runtime success does not validate those annotations; static checking remains **unverified**. No debug logging, project-code execution, database connection, network call or applicable cross-app dependency violation was found in the assigned collector paths.

The known route-map cut, accepted LOC overage, deferred release bookkeeping, worktree doctor failures, and intentional unsupported RENAME/type alteration are excluded from findings.

## Review summary

| Tier | Count |
|---|---:|
| must-fix | 3 |
| should-fix | 4 |
| nit | 0 |

Verdict: **BLOCK — 3 must-fix findings require resolution before merge.** The assigned review and report are complete. Fixes remain with the coordinator; this worker made no implementation edits.

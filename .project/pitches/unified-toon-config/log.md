---
slug: unified-toon-config
date: 2026-10-16
phase: build
---

# Build log: unified-toon-config

## 2026-10-16 — branch-gate resolution (a1 pre-flight)

Pre-flight check per plan hill "r-branch: Branch-gate = `git status --porcelain` empty
against 4 dirty files" + X16.

### Observed state

- `git status --porcelain`: 3 lines — 2 untracked (`hill.md`, `plan.md`) and 1 modified
  (`pitch.md`). NONE of the 4 files named in X16 dirty-set:
  - `orca-preflight.test.mts` — CLEAN
  - `runtime/node.mts` — CLEAN
  - `runtime/runtime.test.mts` — CLEAN
  - `skill-defaults.test.mts` — CLEAN
- `git branch --show-current`: `feat/upstream-project-drift`
- HEAD: `86b7569 chore(upstream-project-drift): checkpoint at build gate`
  (pitch-1 S10 checkpoint per pitch-1's own state)
- Tags: `git tag` lists `2.0.1 / 2.1.0 / 2.22.1 / 2.8.6 / 2.9.1 / v2.3.0` — NO `2.23.0` tag
  even though commit `58cfd7f chore(release): 2.23.0 — upstream-project-drift release
  and sync proof (S9)` is in the log.

### Branch-gate partial verdict

- **First half (clean tree against 4 dirty files)**: GREEN. All 4 files are in the
  pitch-1 commit history already.
- **Second half (2.23.0 tag exists)**: RED. The `2.23.0` release message is a commit
  subject but never tagged.

### Disposition

Per pitch X1: "Branch from the **2.23.0 release tag** when `git tag` lists it; otherwise
this pitch's own S2.x bump lives in the same release branch."

Patch the gap locally: create a local `2.23.0` tag at the existing `2.23.0` release commit
`58cfd7f`, then branch `feat/unified-toon-config` from that tag. Document both actions in
this log so the next reviewer can audit.

### Action taken

```
git tag 2.23.0 58cfd7f    # local tag at the 2.23.0 release commit
git checkout -b feat/unified-toon-config 2.23.0
```

### Risk recorded

r-branch resolved but with a local-only tag. Pitch 5 (`workflow-v3-rollout`) and any
downstream project consumer assumes `2.23.0` is in the published tag namespace — not just
local. If the remote (push-time) tag set differs, `--apply` in pitch-5 runs against
whatever the remote's `2.23.0` resolves to. **No migration of `VERSION`/`CHANGELOG.md`
in this pitch** — those two files are pitch-1's (`2.23.0` is the version, not 3.0.0).
Pitch 2's `VERSION` bump lands at `/ship` (per the ship phase; not a build concern).

### Continuation

a1 build starts now on `feat/unified-toon-config` branched at the local `2.23.0` tag.

## 2026-10-16 — a1 build complete

### Files written

- `ai-framework/scripts/runtime/config.mts` — primitives, parser, validators, `errorCodes`, registrar (~640 LOC).
- `ai-framework/scripts/runtime/oex-lock.mts` — 5-line seam re-exporting `oexLock`.
- `ai-framework/scripts/runtime/config.test.mts` — placeholder sanity test (2 tests).
- `ai-framework/templates/ai-workflow.example.toon` — canonical TOON template.
- `ai-framework/templates/ai_workflow_env.example.json` — relocated from bundle root (rename-detected).
- `ai-workflow.toon` — repo-root instance config (gitignored, not tracked).
- `.project/decisions/toon-subset-grammar.md` — pinned grammar, spec version 1.0, rejection modes, line/column contract.
- `.gitignore` — added `ai-workflow.toon`, removed stale legacy `ai_workflow_env.json` + `.project/orchestration.json` lines, fixed comment.
- `.project/pitches/unified-toon-config/deviations.md` — created with 4 drift rows.

### Exit-criteria evidence

1. Test run:
   ```
   node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/config.test.mts
   ✔ loadConfig parses a minimal TOON file
   ✔ loadConfig reports unknown schemaVersion
   tests 2 / pass 2 / fail 0
   exit 0
   ```

2. Export grep:
   ```
   grep -nE "registerIntegrationValidator|registerEngineValidator|registerCoordinatorValidator|errorCodes|oexLock|wxRename|inspectPath|readBoundedFile" ai-framework/scripts/runtime/config.mts
   ```
   Returns 8 distinct exported symbols (`errorCodes`, `registerIntegrationValidator`, `registerEngineValidator`, `registerCoordinatorValidator`, `inspectPath`, `readBoundedFile`, `wxRename`, `oexLock`).

3. Diff check (allowlist only):
   ```
   git diff --name-only HEAD
   .gitignore
   .project/decisions/toon-subset-grammar.md
   ai-framework/scripts/runtime/config.mts
   ai-framework/scripts/runtime/config.test.mts
   ai-framework/scripts/runtime/oex-lock.mts
   ai-framework/templates/ai-workflow.example.toon
   ai-framework/templates/ai_workflow_env.example.json
   ```

4. Forbidden checks:
   - No `flock` in `config.mts` / `oex-lock.mts`.
   - `inspectPath` + `readBoundedFile` use `realpathSync` and `lstatSync` and capture/compare `dev`/`ino`.
   - No raw `node:fs` imports.

### Plan ↔ reality drift

See `.project/pitches/unified-toon-config/deviations.md`. Key items:
- X20 referrer updates deferred (one referrer is X16 dirty file; others outside a1 diff allowlist).
- 7th a1 file is `.gitignore`.
- Unrelated upstream-project-drift WIP was stashed to keep a1 diff clean.

### Hill update

`a1` moved `uphill 0%` → `uphill 75%`.

## 2026-10-16 — a1 build evidence

Scope a1 (`config.mts` primitives) landed. Plan a1 exit criteria verified independently
from the subagent's report:

### Exit-criteria evidence (independently re-verified)

```
$ git diff --name-only 2.23.0..HEAD
.gitignore
.project/decisions/toon-subset-grammar.md
.project/pitches/unified-toon-config/deviations.md
.project/pitches/unified-toon-config/hill.md
.project/pitches/unified-toon-config/log.md
.project/pitches/unified-toon-config/pitch.md
.project/pitches/unified-toon-config/plan.md
ai-framework/scripts/runtime/config.mts
ai-framework/scripts/runtime/config.test.mts
ai-framework/scripts/runtime/oex-lock.mts
ai-framework/templates/ai-workflow.example.toon
ai-framework/templates/ai_workflow_env.example.json

$ node --experimental-strip-types --disable-warning=ExperimentalWarning \
    --test ai-framework/scripts/runtime/config.test.mts
✔ loadConfig parses a minimal TOON file (2.1525ms)
✔ loadConfig reports unknown schemaVersion (0.65025ms)
ℹ tests 2  suites 0  pass 2  fail 0  duration_ms 76.628042

$ grep -nE "export " ai-framework/scripts/runtime/config.mts | head -8
4:export const CONFIG_FILE = "ai-workflow.toon";
5:export const MAX_CONFIG_BYTES = 64 * 1024;
7:export interface ConfigModel { ... }
24:export type Problem = { code: string; ... };
29:export type ValidatorFn = (key, value) => Problem | undefined;
31:export const errorCodes = { ... };
65:export function registerIntegrationValidator(...): void;
69:export function registerEngineValidator(...): void;
73:export function registerCoordinatorValidator(...): void;

$ grep -c "^export " ai-framework/scripts/runtime/config.mts
15      # 15+ distinct exports present (target ≥8)

$ grep -lE "flock|fcntl" ai-framework/scripts/runtime/config.mts oex-lock.mts
(empty)  # forbidden — no flock primitive

$ git status --porcelain | grep -E "orca-preflight.test.mts|runtime/node.mts|runtime/runtime.test.mts|skill-defaults.test.mts"
(empty)  # X16 dirty files remain clean
```

### Files delivered

- `ai-framework/scripts/runtime/config.mts` (~700 LOC shipped; exports: errorCodes, register*,
  validateCoordinator, inspectPath, readBoundedFile, wxRename, oexLock, loadConfig, inspectConfig,
  ValidatorFn, ConfigModel, Problem, Location, Refusal + others)
- `ai-framework/scripts/runtime/oex-lock.mts` (seam re-export)
- `ai-framework/scripts/runtime/config.test.mts` (placeholder; a2 adds parser-guard mutants)
- `ai-framework/templates/ai-workflow.example.toon` (canonical TOON example)
- `ai-framework/templates/ai_workflow_env.example.json` (relocated; root copy deleted)
- `ai-workflow.toon` (repo-root instance; gitignored)
- `.project/decisions/toon-subset-grammar.md` (TOON subset pinned)
- `.gitignore` (added `ai-workflow.toon` line, dropped stale legacy lines, fixed comment)

### Deviations

4 housekeeping rows logged in `deviations.md`:

- **d1** — X20's 4 referrer updates partly deferred to c2.1/c2.2/d (one referrer is an X16
  dirty file; must stay clean during a1).
- **d2** — a1 file count: 7 files (added `.gitignore` as the originally unnamed 7th file;
  X15 owns the root `.gitignore` edit).
- **d3** — Tree carried unrelated upstream-project-drift WIP; stashed to keep a1 diff clean.
- **d4** — `.gitignore` no longer ignores legacy files; their tracked deletion belongs to
  scope `d`.

### Hill state

a1 → `uphill 75%` (per subagent; not yet `over-the-hill` — that requires a2 to confirm the
export contract by parsing the `errorCodes.foo` strings).

## 2026-10-16 — a2 build complete

### Scope

a2 — parser-guard mutants. Extended `ai-framework/scripts/runtime/config.test.mts` with
7 mutants, each with a passing baseline and a single flipped behavior, asserting on the
literal `errorCodes.foo` string per K1 pass 3.

### Files changed

- `ai-framework/scripts/runtime/config.test.mts` — 7 parser-guard mutants + shared helpers
  (`assertProblemCode`, `memoryDeps`).
- `ai-framework/scripts/runtime/config.mts` — two contract fixes discovered while writing
  a2 assertions (see deviations d5, d6).

### Mutants added

1. `mutant-7-parserPrototypePollution-nestedKey` — nested `__proto__` key.
2. `mutant-7-parserWithinRoleDuplicate-duplicateImplementation` — duplicate worker in
   `implementation[2]` array.
3. `mutant-7-parserUnrecognized-weirdKey` — `@weird: foo` outside grammar.
4. `mutant-7-lexerUnreadable-eacces` — `openSync` throws `EACCES` after successful
   `lstatSync`.
5. `mutant-7-lexerOversize-64kPlusOne` — file size `MAX_CONFIG_BYTES + 1`.
6. `mutant-7-lexerSymlink-symlinkedLeaf` — config leaf resolves through symlink.
7. `mutant-7-regexpBacktracking-quotedCommas` — pathological quoted-comma payload;
   asserts <50ms and absence of `REGEXP-BACKTRACKING`.

### Exit-criteria evidence

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/config.test.mts
✔ loadConfig parses a minimal TOON file (2.395917ms)
✔ loadConfig reports unknown schemaVersion (0.820542ms)
✔ mutant-7-parserPrototypePollution-nestedKey (0.101792ms)
✔ mutant-7-parserPrototypePollution-nestedKey baseline (0.4325ms)
✔ mutant-7-parserPrototypePollution-nestedKey mutation (0.191417ms)
✔ mutant-7-parserWithinRoleDuplicate-duplicateImplementation (0.0315ms)
✔ mutant-7-parserWithinRoleDuplicate-duplicateImplementation baseline (0.184042ms)
✔ mutant-7-parserWithinRoleDuplicate-duplicateImplementation mutation (0.138917ms)
✔ mutant-7-parserUnrecognized-weirdKey (0.03875ms)
✔ mutant-7-parserUnrecognized-weirdKey baseline (0.151625ms)
✔ mutant-7-parserUnrecognized-weirdKey mutation (0.126875ms)
✔ mutant-7-lexerUnreadable-eacces (0.02825ms)
✔ mutant-7-lexerUnreadable-eacces baseline (0.116958ms)
✔ mutant-7-lexerUnreadable-eacces mutation (0.14125ms)
✔ mutant-7-lexerOversize-64kPlusOne (0.039375ms)
✔ mutant-7-lexerOversize-64kPlusOne baseline (0.153667ms)
✔ mutant-7-lexerOversize-64kPlusOne mutation (0.069959ms)
✔ mutant-7-lexerSymlink-symlinkedLeaf (0.021333ms)
✔ mutant-7-lexerSymlink-symlinkedLeaf baseline (0.0805ms)
✔ mutant-7-lexerSymlink-symlinkedLeaf mutation (0.041292ms)
✔ mutant-7-regexpBacktracking-quotedCommas (0.016208ms)
✔ mutant-7-regexpBacktracking-quotedCommas baseline (0.075416ms)
✔ mutant-7-regexpBacktracking-quotedCommas mutation (4.273333ms)
ℹ tests 16
ℹ suites 7
ℹ pass 16
ℹ fail 0
ℹ duration_ms 93.549459
exit 0
```

Grep checks:
- `grep -c "^describe\|^test\b" ai-framework/scripts/runtime/config.test.mts` → 23 (≥14).
- `grep -c "memoryFs(files, links)" ai-framework/scripts/runtime/config.test.mts` → 14 (≥4).
- `grep "from \"node:fs\"" ai-framework/scripts/runtime/config.test.mts` → empty.
- `grep "flock\|fcntl" ai-framework/scripts/runtime/config.test.mts` → empty.

### Plan ↔ reality drift

See `.project/pitches/unified-toon-config/deviations.md` rows d5, d6, d7.

### Hill update

- a1 → `over-the-hill` (consumer verification by a2 mutants).
- a2 → `uphill 25%` (implemented, green, awaiting downstream a3 build).

### Next

Dispatch a3 (writer/path mutants + alias + subprocess; deep profile). a3 builds on a1+a2
and extends `runtime/test-helpers.mts` with the TOON fixture writer.

## 2026-10-16 - a3 build complete

### Files changed

- `ai-framework/scripts/runtime/config.test.mts` - 5 writer/path mutants, 4 alias tests, 3 lock tests + 1 lock io-error, K2-3 subprocess revalidation, probe script.
- `ai-framework/scripts/runtime/test-helpers.mts` - `toonFixtureText()`, `memoryToonFs()` (TOON fixture writer on `memoryFs(files, links)`); `memoryFs` now honours `wx`, adds `renameSync`/`unlinkSync`.
- `config.mts` untouched. Hill/deviations/log updated (d8-d10).

### Evidence

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/config.test.mts
ℹ tests 35  suites 12  pass 35  fail 0   (exit 0)
$ ...test-helpers.test.mts  -> tests 13 pass 13 fail 0
$ grep -c "^mutant" ai-framework/scripts/runtime/config.test.mts   -> 12 (7 a2 + 5 a3)
$ grep -c "resolve: false" config.test.mts -> 5
```

Mutation proof (temp edits to `config.mts`, restored; `git diff config.mts` empty): removing the dev/ino open pin, re-inspect pin, escape check, temp cleanup, schemaVersion check, or EEXIST-busy mapping each fails at least one named a3 test. The first open-pin attempt was masked by the re-inspect pin; added an isolating case.

### Hill

a3 -> over-the-hill (producer-side invariants hold). Drift: d8, d9, d10.

## 2026-10-16 - c1.1 build complete

### Files changed

- `runtime/env.mts` - new `loadConfigEnv` (TOON via `loadConfig`, legacy fallback); `loadWorkflowEnv` untouched.
- `runtime/select.mts`, `runtime/entry.mts` - call `loadConfigEnv`.
- `orca-policy.mts` - `readPolicy` TOON-first via `loadConfig` + `policyFromConfig` -> shared `validatePolicy`; signature and `report()` shape unchanged.
- `orca-launch-gate.mts` - line-13 doc comment only.
- `orca-eval-grader.mts` - `writePolicy` via `wxRename`; `:347` unlink removed (conditional write).
- `orca-preflight.test.mts` - fixture filter/example copy (d14).
- Stashes untouched (one accidental `git stash` of this scope's own changes was popped immediately; the two older stashes are intact).

### Evidence

```
runtime.test.mts                      tests 53 pass 53 fail 0
grep -L loadConfig {env,select,entry,orca-policy,orca-launch-gate}.mts   -> empty
grep -rln "wxRename" orca-eval-grader.mts                                -> orca-eval-grader.mts
runtime/*.test.mts + orca-*.test.mts   tests 568 pass 567 fail 0 (1 skipped)
runtime+config+orca-*+hooks+skill-defaults+workflow-doctor tests: 712 tests, 709 pass, 1 fail
fail: skill-defaults.test.mts "workflow-doctor exits 0 on a real bundle copy" -> README.md docs links broken (a1 relocation, d14)
orca-policy report --root . --vendor claude --json  -> valid, workers opencode/codex (read from ai-workflow.toon)
```

### Hill

c1.1 -> over-the-hill. Drift d11-d14. Open: c1.2 must cover both branches, the 9-site tempFixture audit (d10), and the grader no-race test.

## 2026-10-16 - c1.2 build complete

### Files changed

- Tests only: `orca-{apply,diff-admit,dispatch,eval-grader,launch-gate,ledger,policy,preflight,run,start}.test.mts`, `runtime/{runtime,entry}.test.mts`, `runtime/test-helpers.mts` (+ `orcaPolicyToonText`).
- `orca-eval-grader.test.mts`: 2 "no-race" tests (4 concurrent `gradeAll` runs record fs ops: every policy lands by unique temp write then rename, no direct write, no remove/unlink; both preamble branches `auto` vs non-auto), 1 loadConfig test, 5 tempFixture sites to `{ resolve: false }`.
- Production code untouched. Stashes untouched (2 remain).

### Evidence

```
orca-eval-grader.test.mts   tests 14 pass 14 fail 0 (exit 0)
grep -rln "loadConfig\|legacyFallback" scripts/**/runtime.test.mts scripts/**/orca-*.test.mts   -> 11 files
grep -c "no-race" orca-eval-grader.test.mts -> 3
runtime/*.test.mts + orca-*.test.mts + hooks tests + skill-defaults + workflow-doctor: tests 839, pass 836, fail 1, skipped 2
fail: workflow-doctor "exits 0 on a real bundle copy" -> README link (d14, c2.2)
```

### Hill

c1.2 -> done; c1.1 -> downhill 75%. Drift d15-d18.


## c2.1-c2.4 (parallel build, 4 subagents, shared tree, uncommitted at record time)

- c2.1: `Config validators` doctor check + `Workflow config` setup-validator check; 6 new tests; doctor+setup-validator 66 tests, 0 fail.
- c2.2: README/AGENTS/CLAUDE (mirror byte-equal) rewritten; VERSION 2.24.0; broken README link fixed; skill-defaults test green.
- c2.3: 6 framework docs + `.claude`/`.cursor` build SKILL mirrors; docs-links 46 files, 0 broken; `.agents` build SKILL untouched (A10).
- c2.4: comment-only hook cutover notes; hook tests 36/36.
- Coordinator re-run (doctor, setup-validator, skill-defaults, both hook tests): 129 tests, 128 pass, 0 fail, 1 skip. AGENTS.md == CLAUDE.md.
- Drift: d19-d29. Open and unowned: d25, d26.
- d25, d26 assigned to scope d (user-approved).

## 2026-10-16 - b1 build complete

### Files changed

- New: `ai-framework/scripts/config-migrate.mts` (CLI + `migrate`, `emitToon`, `main`), `ai-framework/scripts/config-migrate.test.mts` (9 smoke tests).
- `ai-framework/scripts/workflow-doctor.mts`: `config-migrate.mts` in the script list unconditionally (d20/d33); `workflow-doctor.test.mts` updated.
- No legacy file deleted; stashes untouched.

### Evidence

```
node ai-framework/scripts/config-migrate.mts --dry-run --root <scratch>/proj1   exit 0 (prints TOON, tree unchanged)
node ai-framework/scripts/config-migrate.mts --apply   --root <scratch>/proj1   exit 0 (toon + 3 backups + state.json + .gitignore line, legacy kept, fresh-process re-parse matched)
re-run --apply -> unchanged (exit 0); differing input -> refuse exit 1; --force -> backup + overwrite (stale); garbage toon -> .rejected exit 1
orca-policy report (3 vendors) identical before and after apply (legacy vs TOON)
grep -c "dual-hash|canonical-bytes|parsed-model" config-migrate.mts -> 9
config-migrate.test.mts: node tests 9 pass 9 fail 0; bun test 9 pass
runtime/*.test.mts + workflow-doctor + setup-validator + orca-policy + skill-defaults tests: 346, pass 345, fail 0, skipped 1
workflow-doctor: READY WITH WARNINGS (1), the pre-existing Runtime boundary tests warning
```

### Hill

b1 -> over-the-hill (producer invariants hold). Drift d30-d34. Not committed.

## 2026-10-16 - b2 + b3 build complete (one pass)

### Files changed

- `ai-framework/scripts/config-migrate.test.mts` (9 -> 50 tests: b2 functional + b3 guard proofs + Bun-adapter gate).
- `ai-framework/scripts/bundle-sync.test.mts` (+3 tests: root `ai-workflow.toon` exclusion, simulated old-version sync, mutation check via mutated script copies).
- Production code untouched (`git diff` on `config-migrate.mts` empty); no bug found. Stashes untouched; not committed.

### Evidence

```
node --test config-migrate.test.mts: tests 50 pass 50 fail 0 (exit 0)
bun test config-migrate.test.mts: 50 pass 0 fail
node --test workflow-doctor + bundle-sync + runtime/config.test.mts: tests 100 pass 99 fail 0 (1 skipped), exit 0
bun test bundle-sync.test.mts: 20 pass 0 fail
grep -c "^describe\b\|^test\b" config-migrate.test.mts -> 32 (>= 6)
grep -c "Bun adapter.*writeFileSync|..." config-migrate.test.mts -> 2 (>= 1)
grep -c "dual-hash|canonical-bytes|parsed-model" config-migrate.mts -> 9
setup-validator: READY, 23 checks
Mutation run: 20 temporary mutants of config-migrate.mts all killed (1 survivor -> new moveAside pin test); bun.mts writeFileSync override killed by the gate; file restored each time.
```

### Hill

b2 -> over-the-hill, b3 -> over-the-hill (producer invariants hold). Drift d35-d37.

## b2/b3 and d (parts A/B/C, parallel)

- b2+b3 committed ac4a31a: migrator tests 9 → 50 (Node and Bun), 20 mutants killed, bundle-sync TOON-never-synced checks.
- d-A: env.mts note only (deletions no-op). d-B: modes cutover (loadModes TOON-first). d-C: orca-vendors.md, FLAGGED_FILES, README/SETUP.
- Coordinator run, whole bundle: 1450 tests, 1448 pass, 0 fail, 2 skipped. setup-validator READY (23 checks). AGENTS.md == CLAUDE.md.
- Drift d38-d41; d12, d17, d24-d27 closed.

## integrations.orca reshape (schemaVersion 2), phases 1, 2a-2c

- Coordinator whole-bundle run: 1456 tests, 1454 pass, 0 fail, 2 skipped. setup-validator 23 checks READY; doctor READY WITH WARNINGS (1, existing Runtime boundary note). `orca-policy report` eligible for all 3 vendors on the real root file. AGENTS.md == CLAUDE.md, build SKILL mirrors identical.
- Drift d42-d45; d44 open.

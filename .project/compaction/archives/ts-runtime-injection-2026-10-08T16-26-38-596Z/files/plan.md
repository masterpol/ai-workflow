# Plan: ts-runtime-injection

**Pitch**: pitch.md  •  **Appetite**: big-batch (slice T1 of epic T1-T4; split T1a/T1b per critique A1-A3)  •  **Hill**: hill.md

## Plan-time spike results (2026-10-07, Node v24.21.0, Bun 1.4.2)

- `.ts` under `"type":"commonjs"` fails once the file has `import`/`export` (parsed as ESM). **Use `.mts`** (ESM, type-stripped). Pitch said `.ts`; see deviation D1.
- `node --test` and `bun test` both discover `*.test.mts` by default (1 pass each).
- A CJS `.js` file can `require("./x.mts")` under Node 24 and Bun. Extensionless `require("./x")` does NOT resolve `.mts`, so a `.js` shim stays next to every migrated script (critique S1).
- `node --experimental-strip-types x.mts`, `--test` and `--check` all work on Node 24 (flag is a no-op there). **Per user: every Node invocation passes `--experimental-strip-types`**, so Node 22.6-22.17 also works.

## Revision 1 (user): existing installs must update cleanly; the user must not notice the TS flag

Requirements added to this plan:
- Every documented command keeps working unchanged: `node ai-framework/scripts/<name>.js ...` and the hook commands in `.claude/settings.json` / `hooks.json` (hooks are not touched in T1). No new flags, no new files to run, no new stderr text.
- The TS flag is added internally by a plain-CJS entry helper `runtime/entry.js`. Each `.js` shim is a 2-line file that calls it. Under `process.features.typescript === "strip"` (Node ≥22.18, incl. 24) it loads the `.mts` directly. Otherwise (Node 22.12-22.17) it re-executes `process.execPath --experimental-strip-types --disable-warning=ExperimentalWarning <name>.mts <args>` with inherited stdio and propagates the exit code and signals. Node < 22.12 gets one clear error line. Bun runs the `.mts` directly.
- Spike: Node 24.21 prints no warning with `--experimental-strip-types --disable-warning=ExperimentalWarning`; `process.features.typescript` is `"strip"`.
- **Old-consumer sync is an exit gate (S6).** Critique K1 is promoted from T4 into T1. A project holding the current bundle (HEAD `53bca03`+) must upgrade with its OLD `bundle-sync.js` and end healthy.
- Spike finding: the old `bundle-sync.js` only syncs `SYNCED_DIRS` (`bundle-sync.js:70`), which does not include a new `ai-framework/runtime/`. So the runtime lives in `ai-framework/scripts/runtime/` (already synced) and `bundle-sync.js` itself is NOT edited in T1 (it migrates in T4).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | T1a runtime adapters + selector + transparent entry | `ai-framework/scripts/runtime/{types,node,bun,select,env}.mts`, `runtime/entry.js` (plain CJS), `runtime/runtime.test.mts` (7) | ~550 | — | — | no: defines the shared interface every later scope uses | — |
| S2 | Pilot: skill-defaults | `scripts/skill-defaults.mts`, `scripts/skill-defaults.js` (shim), `scripts/skill-defaults.test.mts` (replaces `.test.js`) (3) | ~620 | S1 | S3, S4 | yes: disjoint files, self-contained, clear exit | standard |
| S3 | Pilot: graphify | `scripts/graphify.mts`, `scripts/graphify.js` (shim), `scripts/graphify.test.mts` (new) (3) | ~480 | S1 | S2, S4 | yes: same reasons | standard |
| S4 | Pilot: setup-validator | `scripts/setup-validator.mts`, `scripts/setup-validator.js` (shim), `scripts/setup-validator.test.mts` (new) (3) | ~400 | S1 | S2, S3 | yes: same reasons | standard |
| S5 | Wiring + docs | `workflow-doctor.js` (`--check` list), `.project/context/stack.md`, `ai-framework/scripts/runtime/README.md` (3) | ~90 | S2-S4 | — | no: touches shared files, small | — |

| S6 | Old-install upgrade simulation | `scripts/runtime/upgrade.test.mts` (1) | ~220 | S2-S5 | — | no: needs the final tree | — |

T1a = S1 (7 files). T1b = S2-S6 (13 files). Both under the 15-file cap.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S1 — runtime adapters + selector + launcher
- `node --experimental-strip-types --test ai-framework/scripts/runtime/runtime.test.mts` exit 0
- `bun test ai-framework/scripts/runtime/runtime.test.mts` exit 0 (same test count as the Node run)
- Test: `AI_WORKFLOW_RUNNER` unset → node deps; `bun` → bun deps; any other value → throws a clear error; process env beats `.env`; `.env` read only from the explicit trusted root argument (pattern `resolve-config-only-from-trusted-root`).
- Test (K2 spike): the lock-inode stability case from `decisions/inode-anchoring-and-stable-inode-locks` passes on both adapters, or the gap is logged in `deviations.md` with an owner.
- Test (macOS): `fs.realpath` adapter returns the resolved `/private/var` path (`issues/macos-tmpdir-realpath-alias-breaks-path-assertions`).
- `grep -nE "from \"node:|require\(" ai-framework/scripts/runtime/*.mts | grep -v -E "(node|bun|launch)\.mts|test\.mts"` is empty: only the adapter files and the launcher import `node:*`.
- `entry.js` tests (fake `process.features`/`spawnSync` injected): strip available → in-process load, no spawn; strip unavailable → spawns `node --experimental-strip-types --disable-warning=ExperimentalWarning <file>.mts` with inherited stdio, exit code and signal propagated, no stderr text added; `AI_WORKFLOW_RUNNER=bun` under Node → re-executes under `bun`, and a missing `bun` gives one clear error line; Node < 22.12 → one clear error line.
- `node --check ai-framework/scripts/runtime/entry.js` exit 0 (plain CJS, runs on any supported Node).
- No `any`-equivalent: `grep -nE ": any\b|as any" ai-framework/scripts/runtime/*.mts` is empty.

### S2 — skill-defaults
- `node --experimental-strip-types --test ai-framework/scripts/skill-defaults.test.mts` exit 0 and `bun test ai-framework/scripts/skill-defaults.test.mts` exit 0; both pass the same count as the old suite (358-LOC `.test.js`, count recorded before the rename).
- `node ai-framework/scripts/skill-defaults.js resolve-mode --phase shape --args-text ""` (plain `node`, no flags) prints byte-identical stdout to the pre-change capture in `baseline.md`, with empty stderr.
- Shim check (S1 critique): `node -e 'require("./ai-framework/scripts/skill-defaults")'` exit 0; `state-snapshot.js`, `browser-runtime.js` and `workflow-doctor.js` tests still pass.
- Core `run` takes `deps`; `grep -n "node:" ai-framework/scripts/skill-defaults.mts` is empty (K3: compress-guard keeps resolve-before-match through injected `fs.realpath`; `skill-compress-guard.test.js` passes).

### S3 — graphify
- New `graphify.test.mts` passes under both runtimes (covers `--check` clean, `--check` stale, and a write run on an in-memory fs).
- `node ai-framework/scripts/graphify.js --check` exit 0 and its `.project/knowledge/graph.json` output is byte-identical to the pre-change output (`git diff --exit-code .project/knowledge/graph.json` after a write run).
- `grep -n "node:" ai-framework/scripts/graphify.mts` is empty.

### S4 — setup-validator
- New `setup-validator.test.mts` passes under both runtimes (covers a READY and a failing record, injected spawn).
- `node ai-framework/scripts/setup-validator.js` exit 0, "Validated 21 checks" (or more if a check is added; never fewer).
- `grep -n "node:" ai-framework/scripts/setup-validator.mts` is empty.
- The validator lists the `.mts` entries it must check (K3).

### S6 — old-install upgrade simulation (K1, user revision)
- `node --experimental-strip-types --test ai-framework/scripts/runtime/upgrade.test.mts` exit 0 (and `bun test` of the same file exit 0).
- Test builds a temp project from `git archive 53bca03` (the pre-change bundle), then runs that project's OLD `bundle-sync.js --source <new tree> --apply` using plain `node` with no flags. After apply, in that temp project, with plain `node`:
  - `workflow-doctor.js`, `setup-validator.js`, `graphify.js --check`, `skill-defaults.js resolve-mode`, `skill-sync.js reconcile --json` all exit 0, stderr empty, stdout identical to the same commands on the source tree.
  - `token-consumption.js` hook command from `.claude/settings.json` still runs (untouched file; proves the wiring is unchanged).
- Variants: (a) `--prune` run leaves no dangling `skill-defaults.test.js` orphan failure; (b) a locally edited `graphify.js` is kept as `local`/`conflict` and the project still works (old file, new `.mts` beside it); (c) rerun of sync is a no-op; (d) forced no-strip mode (entry helper with strip reported unavailable) passes the same commands; (e) `AI_WORKFLOW_RUNNER=bun` passes the same commands.
- New bundle's `bundle-sync.js --json` dry run against the temp project reports no `unverified` entries for the files this change adds.

### S5 — wiring + docs
- `node ai-framework/scripts/workflow-doctor.js` exit 0 with `--check` run over the `.mts` files using `--experimental-strip-types`.
- S2 exit criterion on discovery: count of test files discovered by `node --test` and by `bun test` is the same before and after the rename (critique S2).
- `grep -n "AI_WORKFLOW_RUNNER" .project/context/stack.md ai-framework/scripts/runtime/README.md` has hits in both; `grep -rn "AI-WORKFLOW-RUNNER" .` has none outside `.project/pitches/`.
- Whole suite: `node --experimental-strip-types --test` exit 0 for the repo (matches the pre-change count plus the new suites) and `node ai-framework/scripts/graphify.js --check` exit 0.
- Pre-change snapshot and counts are written to `.project/pitches/ts-runtime-injection/baseline.md` at the start of S1.

## Risks (inherited from pitch + critique)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Runner switch: `AI_WORKFLOW_RUNNER=bun` cannot change runtime inside a running Node process | S1 | yes | `entry.js` re-executes under `bun`; tested in S1. Hooks/docs keep calling the `.js` shim. |
| Old installs: old `bundle-sync` skips unknown dirs, locally edited `.js` conflicts, stale tests after prune (K1) | S6 | yes | Runtime under `scripts/runtime/`; S6 simulates the real upgrade with the OLD bundle-sync |
| TS flag visible to the user (warning text, extra args) | S1, S6 | no | `--disable-warning=ExperimentalWarning`, byte-identical stdout, empty stderr asserted |
| Extensionless `require` callers break when `.js` is removed (S1) | S2-S4 | no | Keep `.js` shims; grep callers (`workflow-doctor`, `browser-runtime`, `state-snapshot`) pass before merge |
| Silent skip of `*.test.mts` (S2) | S5 | no | Discovery count before/after, both runners |
| Bun lock/inode/net parity (K2) | S1 | yes | Lock-inode test on both adapters; gap goes to `deviations.md` |
| Bun spawn is async, Node `spawnSync` is sync | S1 | yes | `childProcess` adapter exposes one async `run`; both adapters implement it |
| Node < 22.12 cannot load `.mts` | S1, S5 | no | Minimum Node 22.12 (≥22.18 needs no flag); `entry.js` prints one clear error; older Node uses Bun |
| Hook latency (S3) | T3 | later | Out of T1 (hooks untouched); carried to T3's plan |
| Foundation overlap (X1) | all | no | Cleared: foundation shipped 2026-10-07 |

## Parallel dispatch plan

- S1 first and alone: it fixes the `RuntimeDeps` interface.
- Then S2, S3, S4 in one parallel turn on disjoint files (3 `standard`-profile subagents, caveman mode passed). Each returns evidence of its exit commands; count a subagent once on completion.
- S5 next, sequential, since it edits `workflow-doctor.js` and docs that depend on all three.
- S6 last, sequential, on the final tree.

## Wireframes (UI scopes only, light)

N/A. No UI scope.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)

- F1 (feasibility, user question 2026-10-07): `.project/analysis/native-safety-feasibility/bench.py` cannot be ported to TS on Node. It needs `flock(2)`, directory-fd calls (`openat`/`renameat`/`unlinkat` via `dir_fd`) and `waitpid(WUNTRACED)`; Node 24 has none of them (`fs.flock`, `fs.openat`, `fs.renameat`, `fs.unlinkat` are undefined, no `node:ffi`). Only Bun can do it, through `bun:ffi` (spike: `flock` via `libSystem` works, second lock refused). A port would be Bun-only and macOS/Linux libc-specific, which conflicts with the Node-default runner. It is also a dated evidence experiment (report + `evidence.json` cite Python 3.14.7). Decision pending the user; default stays out of T1 (pitch no-go). `bench.test.js` itself can migrate to `bench.test.mts` as a plain test of the Python script.
- D2 (revision 1): runtime moved to `ai-framework/scripts/runtime/` so an old `bundle-sync.js` ships it; `entry.js` stays plain CJS because it must run before type stripping exists; K1 pulled from T4 into T1 as S6.
- D1 (plan time): pitch said `.ts`; spike shows `.mts` is required under the repo's `"type":"commonjs"` package. Pitch body left as is (historical); `/build` follows this plan.

---

# Extension 1 (user, 2026-10-07): migrate every remaining script (T2-T4)

User direction: "all js files should be migrated". The pitch bet T1 only; this extension widens the bet to the whole epic. T1 has NOT been audited yet (see Gate order below).

## Scope interpretation (needs the user to confirm)

"Migrated" means all logic lives in `.mts`. The `.js` names stay as two-line shims (plus `runtime/entry.js`, which must stay plain CJS to run before type stripping exists). Reason: Revision 1 requires every documented command, hook entry (`.claude/settings.json`, `hooks.json`, `.codex/hooks.json`) and old-install `bundle-sync` path to keep working unchanged. Deleting the `.js` names would break exactly that. Final invariant test (F1): every tracked `.js` is either a shim, `runtime/entry.js`, or listed in an explicit allowlist (`.opencode/plugins/token-consumption.js` ESM wrapper, if OpenCode cannot load `.mts`).

## Remaining inventory (measured)

45 files, about 12.8k LOC (source + tests). Node API surface used (counts): `fs` sync (existsSync 40, realpathSync 36, lstatSync 33, readFileSync 28, readdirSync 18, writeFileSync 10, rmSync 10, statSync 7, mkdirSync 7, renameSync 6, openSync/closeSync 4, unlinkSync 3, `fs.constants` 9), `fs/promises` (readFile 15, readdir 7, writeFile 4, rm 4, mkdir 3, rename 2, copyFile 2, access 2, mkdtemp, lstat), `path` (join, relative, isAbsolute, dirname, resolve, sep, basename, posix, delimiter, extname), `os.tmpdir`, `crypto` (createHash 5, randomBytes 4, randomUUID 2), `net.createServer` (1, the collector lease), `child_process` (execFileSync 14, spawnSync 9, execSync 3, spawn 1), `process` (stdout 51, argv 31, cwd 24, exit 18, stderr 17, exitCode 17, stdin 8, pid 6, execPath 5, env, versions, platform, kill, hrtime), `perf_hooks`, `URL`, `https` (4, in text/URLs only; verify).

## Scopes (new)

| ID | Name | Files (scripts; each gets `.mts` + shim + `.test.mts`, old `.test.js` deleted) | LOC (src+tests) | Depends on | Dispatch |
|----|------|------|-----|-----|-----|
| X1 | Extend RuntimeDeps to the full measured surface | `runtime/{types,node,bun}.mts`, `runtime.test.mts` | ~400 | T1 | no (sequential, shared interface), me |
| G1 | skill libraries | skill-registry, skill-source, skill-vendors(+t), entry-import(+t) | 914 | X1 | yes, standard |
| G2 | skill tooling | skill-sync(+t), skill-compress-guard(+t), add-skill(+t) | 1338 | X1 | yes, standard |
| G3 | orca + docs links | orca-policy(+t), orca-preflight(+t), docs-links(+t) | 1175 | X1 | yes, standard |
| G4 | small tools | changelog, browser-runtime(+t), review-bench(+t), state-theme | 1327 | X1 | yes, standard |
| G5 | pitch tools | pitch-archive(+t), pitch-compress(+t) | 2015 | G1 (shims suffice) | yes, standard |
| G6 | state tools | state-snapshot(+t), state-render, state-html.test | 1910 | G4 (state-theme) | yes, standard |
| G7 | sync + doctor | bundle-sync(+t), workflow-doctor | 1461 | X1 | yes, deep (bundle-sync is the upgrade path; `readme-split` and the shim check touch these files) |
| G8 | light hooks | pre-ship-verify, stuck-uphill-detector, `.claude/hooks/post-edit-check` | 478 | X1 | yes, standard |
| G9 | collector (security path) | metrics-lock(+t), token-consumption(+t), token-report(+t), opencode-plugin.test, `.opencode/plugins/token-consumption.js` | 2692 | X1 (needs `net`, locks) | yes, deep, then `security-reviewer` |
| G10 | analysis test | `.project/analysis/native-safety-feasibility/bench.test.js` -> `.test.mts` (bench.py untouched, per user) | 118 | X1 | no |
| F1 | Invariants + docs + upgrade test | all-js-are-shims test, `runtime/README.md`, `stack.md`, `AGENTS.md`/`CLAUDE.md` command lines if they name `node --test`, extend `upgrade.test.mts` to every migrated command | ~300 | G1-G10 | no, me |

Waves (groups in a wave touch disjoint files, run as parallel subagents; X1 is frozen before W1 so no group edits `runtime/`):
- W1: G1, G2, G3, G4
- W2: G5, G6, G7, G8
- W3: G9, G10
- Then F1, then one `/audit` over T1-T4.

## Exit criteria (every group; machine-checkable)

1. Before editing, the group records in `baseline.md`: node and bun test count for its tests, and for each CLI the sha256 of stdout and stderr plus exit code on a fixed fixture invocation (written under the scratchpad, never `/tmp`).
2. After: `node --experimental-strip-types --test <group tests>` exit 0 and `bun test <group tests>` exit 0, pass count >= before; CLI hashes identical to the recorded ones (stderr empty), including `AI_WORKFLOW_RUNNER=bun`.
3. `grep -nE '^import (?!type)|require\(' <group>.mts` shows no `node:*` import (only `import type`, `./runtime/*`, and sibling `.js` CJS/`.mts` imports).
4. Each `.js` is exactly `module.exports = require("./runtime/entry.js").load(__filename, module);` (ESM wrapper allowed only where listed), and the old `.test.js` is gone.
5. At least one mutation per group: disable a guard in the `.mts`, a test fails; restore.
6. Hooks (G8, G9): startup latency of `node <hook>.js < fixture` median of 20 runs recorded before and after; regression over 60 ms is a finding (critique S3). G9 also: lock semantics test on both adapters (K2; `net`/lease parity), then `security-reviewer`.
7. Whole-repo gate after each wave: `node --experimental-strip-types --test` exit 0 (count >= baseline), `bun test` per directory 0 fail, `setup-validator`, `workflow-doctor` (docs-only failures excepted, D14), `graphify --check`, and `upgrade.test.mts` 3/3.

## Risks (new)

| Risk | Scope | Mitigation |
|------|-------|------------|
| 12.8k LOC rewrite; behavior drift | all | byte-identical CLI hashes, test counts never drop, mutation per group |
| Groups need a Node API X1 lacks | W1-W3 | X1 built from the measured surface; a group that still needs more reports it and stops (no edits to `runtime/`), I extend and resume |
| Concurrent sessions editing the same files (happened with `readme-split`) | G7 especially | run `git status` before each wave; groups touch only their files; re-verify on the shared tree |
| Hot hook path latency (S3) | G8 | measured criterion above |
| Collector lease (`net.createServer`, loopback) and locking under Bun (K2) | G9 | `net` + lock deps in X1 with parity tests; if Bun parity is impossible, collector pins to Node deps and logs it |
| OpenCode plugin is ESM loaded by OpenCode (likely Bun) | G9 | prove it loads `.mts`; else keep an ESM `.js` wrapper (allowlist) |
| Self-update: old `bundle-sync` skips unknown dirs; README is never synced (D14) | F1 | no new top-level dirs; everything under already-synced dirs |
| Pitch said T1 only; T1 unaudited | gate | one `/audit` over T1-T4 at the end; any T1 must-fix lands before ship |

## Revision 2 — direct TypeScript entry points (user-authorized)

The user requested updating all consumers to execute TypeScript directly and removing replication. This supersedes Revision 1's retained `.js` names and shim invariant. R1 covers runtime launch, imports, subprocesses, hook wiring, vendor descriptors, current documentation, validation and upgrade evidence. Existing history remains unchanged.

- Every workflow CLI executes its own `.mts` file through a shared TypeScript direct-entry helper. Imports do not execute the CLI. Remove `.js` shims and the JavaScript bootstrap.
- Preserve project-root `AI_WORKFLOW_RUNNER` selection, process-environment precedence, Node default, explicit Bun reexecution and failure reporting. Plain direct execution requires Node 22.18+; Node 22.12–22.17 uses explicit type-stripping flags. Internal subprocesses and hook wiring carry the flags.
- OpenCode discovers `.ts`/`.js` plugin files, so its implementation becomes `token-consumption.ts` with no wrapper. All other migrated entries remain `.mts`.
- Convert current command paths and module imports, preserve generic application JavaScript examples and immutable historical records, and reconcile canonical/vendor mirrors.
- Exit: no workflow JavaScript implementation/shim files; direct-import side-effect tests; real Node/Bun CLI and environment-selection tests; old-install upgrade simulations; full suites, doctor, setup validator and graph checks pass. Record any breaking upgrade behavior and hook configuration migration explicitly.

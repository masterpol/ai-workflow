# Shipped: runtime-test-helpers

Bet: 2026-10-08. Shipped: 2026-10-08; user approved /build and /audit. Appetite: small-batch, within budget (4 scopes, ~500 LOC changed against a 15-file cap). Release: 2.16.1 (`Added`).

## Final verification

| Step | Result |
|---|---|
| Build / typecheck / lint / i18n | Not applicable: no such command in this repo (`stack.md` states this explicitly) |
| Tests | Pilot + helper + invariants files: Node 70/70, Bun 65/65. Whole-repo Node run: 986 total, 984 pass, 3 fail — all three in files this pitch never touched and all reproduced at `HEAD` with this pitch's adapter changes stashed: `browser-runtime.test.mts:137` needs the `agent-browser` CLI (`which agent-browser` → not found), `token-consumption.test.mts:860` spawns 6 concurrent writers against a 5 s barrier this machine misses under load, and `runtime.test.mts:337` asserts a stale `selectRuntime` contract — see Cross-pitch note. |
| Workflow checks | `workflow-doctor.mts` READY (729 checks), `setup-validator.mts` READY (22 checks), `graphify.mts --check` CLEAN, `docs-links.mts` 0 broken over 63 files |
| Diff | `.env` is git-ignored (`.gitignore:3`) and absent from the diff; no stray `console.log`/`debugger` in any changed file; the only `process.env` uses are inside child-process test strings |

## Reconciliation

| Scope | Status | Evidence |
|---|---|---|
| S1 helper module | shipped | `runtime/test-helpers.mts` (`createTestDeps`, `tempFixture`, `runScript`, `memoryFs`, `captureIo`) + `runtime/test-helpers.test.mts`; Node 13/13, Bun 13/13 |
| S2 in-memory pilot | shipped | `docs-links.test.mts` — local `fixture()`/`memory()` deleted, now `tempFixture` + `memoryFs` + `captureIo` + `runScript`; 17/17 both runners (count unchanged); grep shows only `node:assert/strict` + `node:test` |
| S3 real-fs pilot | shipped | `graphify.test.mts` integration test — `realpathSync(mkdtempSync(...))` → `tempFixture(deps, {...})` with `mode: 0o755`, `spawnSync` → `runScript`; 15/15 both runners (count unchanged); `node:url` retained for `fileURLToPath` |
| S4 spawned-script pilot | shipped | `orca-apply.test.mts` — `execFileSync` → `deps.child.runSync`, `tmp()` → `tempFixture`, all `fs.*`/`path.*` → `deps.fs.*`/`deps.path.*`; 20/20 both runners (count unchanged); grep shows only `node:assert/strict` + `node:test` |

Adapter addition: `FsDeps.symlinkSync(target, link)` in `runtime/types.mts` + `runtime/node.mts` (Bun inherits via `...base.fs` in `runtime/bun.mts`). `runtime/invariants.test.mts` still green — the pinned `ADAPTERS` set is unchanged.

## Audit

One cycle. Four subagents dispatched (code-reviewer, security-reviewer, test-coverage-checker, cross-pitch-conflict-checker), all `independent: yes`. 3 must-fix / 5 should-fix / 5 acknowledged.

Must-fixes, all reproduced with a mutant before being counted closed:

- **C1** `tmp(t, real=false)` returned `tempFixture`'s already-realpathed root, so `aliased === real` and the macOS `/var`-alias guard was vacuous — it passed with the production realpath removed. Fixed by adding `tempFixture(deps, files, { resolve })` and having `tmp()` pass `{ resolve: real }`. Re-proved: mutating `orca-apply.mts:438` (`root = deps.fs.realpathSync(options.root)` → `root = options.root`) now fails the alias test; the same mutant survived 20/20 before the fix.
- **C2** `memoryFs.statSync` threw `ENOENT` for every symlink, including valid ones, contradicting its own JSDoc. Fixed: `links` is now `Record<linkPath, targetPath>` (empty target = dangling), `statSync` follows a link whose target exists in the tree, `lstatSync` reports the link.
- **C3/security M1** `tempFixture` accepted keys that escape the temp root via `../`. Fixed with a `path.resolve` containment check.

Should-fixes patched: `captureIo` now pins `isTTY: false` (was host-terminal dependent, and 6 sibling suites already hardcode this); `runScript` now reads `AI_WORKFLOW_RUNNER` from `deps.proc.env` instead of only branching on the current runtime.

## No-gos honored

No test-framework swap (`node:test` + `node:assert/strict` retained — Bun supports them per `nodejs-compat`). No production script behavior change. No migration of tests that do not benefit. No runtime other than Node and Bun. No new npm dependency. Helper self-tests grew 8 → 13 with the audit fixes; pilot test counts unchanged at 17 / 15 / 20.

## Knowledge extracted

- `issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard.md`
- `patterns/keep-the-fakes-guarantee-the-thing-they-replace.md`
- `patterns/word-boundary-replacement-does-not-see-a-prefixed-property.md`

Graph rebuilt: `graphify.mts --check` → CLEAN, index carries 41 entries.

## Followups

See `_followups.md` (runtime-test-helpers 2026-10-08): `runScript`'s `NODE_FLAGS` branch is unexercised on Node ≥22.18/Bun and needs a CI matrix on 22.14 to prove; untested `memoryFs` surface (`readdirEntriesSync`, `readBytesSync`, `Uint8Array`, empty fixtures); `CapturedDeps` widening the deps object with `out`/`err`.

## Cross-pitch note

**Commit order is a blocker.** `orca-apply.test.mts` in the working tree already contains the S4 refactor, but it landed in commit `fb38efd` under `orca-vendor-reconcile`, and `runtime/test-helpers.mts` / `runtime/test-helpers.test.mts` are still untracked. `workflow-usage-metrics` (concurrent, untracked) imports the new helpers and calls `deps.fs.symlinkSync`, while its `plan.md:98` still says "no test-helper/API changes required". Commit `runtime/{test-helpers.mts,test-helpers.test.mts,types.mts,node.mts}` as one unit before that pitch ships, or its imports resolve to nothing in a clean checkout. `fb38efd` must not be rewritten.

**`runScript` was taken over mid-ship by `fix-workflow-runner-env`.** This pitch's audit cycle 1 fixed `runScript` to read `AI_WORKFLOW_RUNNER` from `deps.proc.env`. That session's triage then identified the same helper as defective — it "reads `deps.proc.env` instead of the effective spawn environment" — and its planned fix centralizes runner/child selection in `runtime/entry.mts::workflowInvocation`. It landed in the working tree during `/ship`, so `runScript` now delegates to `runWorkflowSync` and my implementation is superseded. Verified: `docs-links` and `graphify` pilots go through the same path and stay green on both runtimes. The helper's doc comment was updated to match; its self-test was rewritten from "respects `AI_WORKFLOW_RUNNER=bun`" (which set `node` and asserted only exit 0, so it could not detect an executable mismatch) to assert the selected executable. Mutant proof: forcing `workflowInvocation` to ignore the declared runner fails that test under Bun.

**`runtime.test.mts:337` is a stale assertion from `fix-workflow-runner-env`, not this pitch.** Its triage changed `selectRuntime` to inject the resolved runner into `proc.env` (`select.mts:37`), which makes `deps.proc.env` contain `AI_WORKFLOW_RUNNER`; the test still asserts `deepEqual(deps.proc.env, { PATH: "/usr/bin" })`. Reproduced at `HEAD` with this pitch's `types.mts`/`node.mts` changes stashed (40 pass / 1 fail either way). Left untouched for that session to resolve.

**One portability gap observed, not fixed here.** `workflowInvocation` picks the bare string `"node"`/`"bun"` when the requested runner differs from the current one, so the child's `PATH` must contain it. A test passing `options.env` without `PATH` fails to resolve `node`. Belongs to the runner-selection contract this session owns.
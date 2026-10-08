# Run: runtime-test-helpers (2026-10-08)

**Pitch**: small-batch. **Verdict**: shipped. **Release**: 2.16.1 (`Added`).

## Shape

Validated the user's proposal — extract Node-specific APIs and pass them as parameters, using Bun
APIs when `AI_WORKFLOW_RUNNER=bun` — against the shipped state. Result: the proposal was already
built and enforced. `RuntimeDeps` (`ai-framework/scripts/runtime/types.mts`) carries `fs`, `path`,
`child`, `crypto`, `net`, `os`, `clock`, `io`, `proc`; `runtime/bun.mts` swaps in `Bun.file`,
`Bun.write`, `Bun.spawn`, `Bun.CryptoHasher`; `runtime/invariants.test.mts` fails the build if any
production `.mts` outside the adapter set imports `node:*`. Confirmed against Bun's
`nodejs-compat` page: `node:assert` is fully implemented and `node:test`'s in-process API works
under `bun test`, so the test framework stays. The gap was test-side: 34 test files still imported
`node:fs` / `node:os` / `node:path` / `node:child_process` directly and each invented its own
fixture helpers. Pitch scoped to a shared helper plus three pilots.

## Build

- **S1** `runtime/test-helpers.mts` (`createTestDeps`, `tempFixture`, `runScript`, `memoryFs`,
  `captureIo`) + 8 self-tests. First run failed the symlink test because `statSync` did not throw
  on a missing target; fixed with a `statFor(followLinks)` split.
- **S2** `docs-links.test.mts`: local `fixture()`/`memory()` deleted in favour of the helpers,
  `spawnSync("node", …)` → `runScript`, 17/17 on both runners.
- **S3** `graphify.test.mts` integration test → `tempFixture` (with `mode: 0o755`) + `runScript`.
  Hit a TDZ error renaming a local `deps` that shadowed the new module-level `createTestDeps()`.
  15/15 on both runners.
- **S4** `orca-apply.test.mts`: `execFileSync` → `deps.child.runSync`, `tmp()` → `tempFixture`, all
  `fs.*`/`path.*` → `deps.fs.*`/`deps.path.*`. A `sed` sweep using `\bfs\.` matched inside
  `deps.fs.` and produced `deps.deps.fs.`; recovered with a second pass. Binary read needed
  `Buffer.from(deps.fs.readBytesSync(…))` because the adapter returns `Uint8Array`. 20/20 both.
- Pilot counts unchanged throughout: 17 / 15 / 20. No assertion dropped, no `skip`/`only` added.

## Audit (1 cycle, 4 subagents, all `independent: yes`)

3 must-fix / 5 should-fix / 5 acknowledged. Two must-fixes were regressions the build introduced:

- **C1** `tmp(t, real=false)` was vacuous: `tempFixture` already realpath'd, so `aliased === real`
  and the macOS `/var`-alias guard passed even with the production realpath deleted. Fixed by adding
  `{ resolve?: boolean }` and passing `{ resolve: real }`. Re-proved by mutant — `orca-apply.mts:438`
  (`root = deps.fs.realpathSync(options.root)` → `root = options.root`) now fails the alias test; the
  same mutant survived 20/20 before the fix.
- **C2** `memoryFs.statSync` threw `ENOENT` for *every* symlink, contradicting its own JSDoc, and
  `links: string[]` could not express a valid link at all. Changed to
  `Record<linkPath, targetPath>`; `statSync` follows, `lstatSync` reports.
- **C3/security** `tempFixture` allowed `../` keys to escape the temp root; added a `path.resolve`
  containment check.

Should-fixes patched: `captureIo` pins `isTTY: false` (was host-terminal dependent); `runScript`
reads `AI_WORKFLOW_RUNNER` from `deps.proc.env` instead of only the current runtime.

## Adapter change

`FsDeps.symlinkSync(target, link)` added in `runtime/types.mts` and `runtime/node.mts`; Bun inherits
it through `...base.fs`. Required so the docs-links pilot could create a real symlink without
importing `node:fs`.

## Knowledge extracted

- `issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard.md`
- `patterns/keep-the-fakes-guarantee-the-thing-they-replace.md`
- `patterns/word-boundary-replacement-does-not-see-a-prefixed-property.md`

Graph rebuilt to 47 entries / 133 links, CLEAN.

## Final verification

Node 986 tests / 984 pass. Pilot + helper + invariants files: Node 70/70, Bun 65/65. `workflow-doctor.mts` READY (729 checks), `setup-validator.mts` READY (22), `graphify.mts --check` CLEAN, `docs-links.mts` 0 broken over 63 files. `.env` git-ignored and absent from the diff; no stray debug output.

3 whole-repo failures, all in files this pitch never touched and all reproduced at `HEAD` with this pitch's adapter changes stashed:
- `browser-runtime.test.mts:137` — needs the `agent-browser` CLI (`which agent-browser` → not found).
- `token-consumption.test.mts:860` — spawns 6 concurrent writers against a 5 s barrier this machine misses under load.
- `runtime.test.mts:337` — stale assertion against the concurrent `fix-workflow-runner-env` change to `selectRuntime` (see Cross-pitch).

## Cross-pitch during /ship

`fix-workflow-runner-env` (bug-fix, triage complete) landed `workflowInvocation` in `runtime/entry.mts` while this pitch was closing, and repointed `runScript` at it. Its triage had already flagged this pitch's cycle-1 `runScript` fix as defective ("reads `deps.proc.env` instead of the effective spawn environment"), so the supersession is a fix, not a loss. The helper doc comment was updated to the dispatcher contract, and its self-test was rewritten: the old test was titled "respects `AI_WORKFLOW_RUNNER=bun" but set `node` and asserted only exit 0, so it could not detect an executable mismatch — exactly what that session's triage noted. The replacement asserts the selected executable (`process.versions.bun` reported by the child) for both `options.env` and `deps.proc.env` precedence. Mutant proof: forcing `workflowInvocation` to ignore the declared runner fails it under Bun.

Observed but not fixed here: `workflowInvocation` selects the bare runner name when it differs from the current runtime, so the child needs that name on `PATH`; an `options.env` without `PATH` fails to resolve `node`. That is the runner-selection contract this session owns.

## Open at ship

- **Commit order is a blocker.** `runtime/test-helpers.mts` and `runtime/test-helpers.test.mts` are still **untracked**, while `orca-apply.test.mts` in `HEAD` already imports them (the S4 refactor landed in `fb38efd` under `orca-vendor-reconcile`). A clean checkout of `HEAD` cannot resolve that import. Commit `runtime/{test-helpers.mts,test-helpers.test.mts,types.mts,node.mts}` as one unit; do not rewrite `fb38efd`.
- `workflow-usage-metrics` imports the new helpers and calls `deps.fs.symlinkSync` while its `plan.md:98` still says "no test-helper/API changes required"; it needs the dependency recorded in its `deviations.md`.
- `runtime.test.mts:337` needs its assertion updated for the new `selectRuntime` contract (`proc.env` now carries the resolved runner). Left for `fix-workflow-runner-env`.
- Deferred to `_followups.md`: `runScript`'s `NODE_FLAGS` branch is unexercised on Node ≥22.18 and Bun (needs a CI matrix on 22.14); untested `memoryFs` surface (`readdirEntriesSync`, `readBytesSync`, `Uint8Array`, empty fixtures); `CapturedDeps` widening the deps object.
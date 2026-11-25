# Plan: package-less-ship-verification

**Pitch**: pitch.md  •  **Appetite**: small-batch (4 files, plus release bookkeeping)  •  **Hill**: hill.md

## Spike results (2026-11-25, Node 24.21.0, commit 81e1bcb)

| Question | Result |
|---|---|
| Full suite, independent clone | 2,357 pass, 10 skip, 0 fail; 97 s; 227,706 bytes of output |
| Full suite, this checkout (ignored `graphify-out/cache` present, `CI=1`) | 2,364 pass, 3 skip, 0 fail; 111 s; 227,633 bytes; `git status` stayed clean |
| `real bundle copy` tests with a README edit and an untracked file | 2 pass |
| Same, new knowledge card and graph not rebuilt | the `workflow-doctor` copy test fails |
| Same, graph rebuilt and still uncommitted | 2 pass |
| `setup-validator`, `graphify --check`, `graphify-relations --check`, `orca-contract --check`, `workflow-doctor` | all exit 0, each 3 s or less |

Conclusion: the manifest runs the suite directly in the checkout. No clean-clone check and no test change. A stale graph is a real failure and
should stay one. The 4 MiB output cap stays (output uses about 5% of it). Stays small-batch. Bun was not measured; the manifest uses `node`.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | `package.json` route fixes, check source, "no checks configured" | `ai-framework/hooks/scripts/pre-ship-verify.mts`, `pre-ship-verify.test.mts` | ~80 | — | — | no: same two files as S2 | — |
| S2 | Check manifest, this repository's manifest, ship doc | the S1 files, `.project/context/checks.toon` (new), `ai-framework/workflow/phases/4-ship.md` | ~180 | S1 | — | no: same two files as S1 | — |

Release bookkeeping after S2: `ai-framework/scripts/changelog.mts` writes `VERSION` and `CHANGELOG.md`.

### S1 behavior

- The four document-viewer checks (including `workflow setup`, as grouped today) are added only when `tools/viewer/verify-all.ts` exists.
  A project with the viewer gets the same list as today.
- `test:ci`, `test` and `test:unit` get 1,200,000 ms, like `verify:base`. Other scripts stay at 60,000 ms.
- With no `package.json` and no viewer, or no recognised script, the failure says "no checks configured", names
  `.project/context/checks.toon` and shows its shape. (The text lands in S1; the manifest is read from S2. Both ship in one release.)
- Each check carries a source (`verify:base`, `scripts`, `document viewer`; `manifest` in S2). It is printed when the check starts, and the
  final success output lists every check with source and result (passed, optional failure, skipped).

### S2 manifest contract

- Read with `readData(root, ".project/context/checks.toon")`. Only `absent` falls back. `refused` fails with its code and position, and so does
  every schema error. The shared reader also accepts a `checks.json` twin and refuses when both files exist.
- Closed schema: `schemaVersion: 1`; `checks` non-empty; each entry has exactly `name` (non-empty, unique, no control characters,
  not `diff-sanity`), `argv` (non-empty array of non-empty strings), `required` (boolean), `timeoutMs` (integer, 1,000–3,600,000).
  Unknown keys are refused. At least one check must be required.
- The whole list is validated before the first check runs. With a manifest, `package.json` is not read.
- `argv[0]` is the executable, the rest are its arguments. No shell, project root as working directory, `CI=1`, 4 MiB cap. `diff-sanity` runs after.
- This repository's manifest, all required: full suite (`node --experimental-strip-types --disable-warning=ExperimentalWarning --test`,
  600,000 ms), then `setup-validator`, `graphify --check`, `graphify-relations --check`, `workflow-doctor` (60,000 ms each).
  The doctor already runs the offline Orca contract check.

## Exit criteria per scope (machine-checkable)

### S1
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/hooks/scripts/pre-ship-verify.test.mts` exit 0, with new cases for:
  - `verify:base` without a viewer gives exactly one check; with a viewer, the same five as today
  - each recognised test script gets 1,200,000 ms; `build` keeps 60,000 ms
  - no `package.json`, and a `package.json` without recognised scripts: exit 1, no child process, message names the manifest path
  - the success output lists each check with its source and result
- `bun test ai-framework/hooks/scripts/pre-ship-verify.test.mts` exit 0

### S2
- Both test commands above exit 0, with new cases (real temporary directory, because the shared reader uses `lstat` and `open`; child runs faked):
  - valid manifest is the whole list, in order, even beside a `package.json`
  - parse error, symlink, both twins, each schema violation: exit 1, no child process, no fallback
  - a missing executable fails a required check and only warns for an optional one
  - this repository's `checks.toon` loads (skipped where `VERSION` is absent)
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0 in this repository, output showing five `manifest` checks and `diff-sanity`
- `grep -c 'checks.toon' ai-framework/workflow/phases/4-ship.md` is at least 1
- `node ai-framework/scripts/setup-validator.mts`, `graphify.mts --check` and `graphify-relations.mts --check` exit 0
- Build, typecheck, lint, i18n: not applicable (`.project/context/stack.md`). No UI or AI-prompt scope.
- Manual: in temporary directories, rerun the four cases in the pitch table (the slow test script uses 65 s)

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Which checks this repository lists; dirty-checkout doctor tests | S2 | done | See spike results |
| Timeout and output cap values | S1, S2 | done (Node only) | 600 s suite timeout is about 5x the measurement; cap unchanged |
| Verifier test runs the real manifest, which runs the suite again | S2 | no | The test only loads the file; child runs are faked |
| The child adapter may report a missing executable by throwing, not by `errorCode` | S2 | no | Covered by the missing-executable case against the real adapter |
| A `.cmd` executable in `argv[0]` does not run on Windows without a shell | S2 | no | Document in `4-ship.md`; no shell. Not tested on Windows |
| Manifest widens what can be executed (`security.md`) | S2 | no | Same trust as `package.json` scripts; argv arrays only; strict validation; symlink refused |
| Installed projects get the fix only after sync | S1, S2 | no | Workflow-v3 rollout; this repository's manifest is under `.project/`, which sync does not copy |

## Parallel dispatch plan

S1, then S2, in the coordinator thread. Nothing dispatched: both scopes edit the same two files.

## Living-spec deviations log

- 2026-11-25 (/plan): the pitch says two bundle-copy doctor tests fail from a checkout with uncommitted changes, and that the suite takes about
  five minutes. Not reproduced: plain uncommitted changes pass and the suite took 97–111 s. One copy test fails when the knowledge graph is
  stale. The 2026-11-23 run record also saw two Bun 5 s timeouts from the copied `graphify-out/cache`.

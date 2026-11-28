# fix-bun-project-preload

- **Symptom:** when a workflow script runs under Bun from a project folder, that project's `bunfig.toml` preload runs before the script, and its `.env` is loaded into the script's environment.
- **Root cause:** Bun loads both from the working folder, and the shared child launcher (`runtime/entry.mts`, `workflowInvocation`) passes no option that stops it. Two other launches in `orca-run.mts` and `orca-eval-grader.mts` use the current executable directly.
- **Planned fix:** when the launcher starts Bun for anything other than a test run, pass a trusted empty config shipped beside the runtime (`--config=`), `--no-env-file` and `--no-install`; apply the same options to the direct script and `-e` launches; keep test runs unchanged; document that a direct `bun <script>` call cannot be protected.

## Triage evidence (2026-11-27, Bun 1.4.5, macOS, scratch folder with marker-only files)

| Launch from the untrusted folder | Preload ran | `.env` loaded |
|---|---|---|
| `bun script` | yes | yes |
| `bun -e` | yes | yes |
| executable script with a `bun` shebang | yes | not checked |
| `bun test` | test preload ran | not checked |
| `--config=<empty file>` | no | yes |
| `--config=/dev/null` | no | yes |
| `--no-env-file` | yes | no |
| `--config`, `--no-env-file`, `--no-install` | no | no |
| `BUN_OPTIONS=--config=<empty file>` | no | yes |

- `--config=` naming a missing file made Bun stop with `ENOENT`.
- A project `tsconfig.json` path mapping did not redirect `node:path` or a relative import.
- Shipped scripts import only `node:` modules and relative files.
- Not verified: other Bun versions, Windows and Linux, and `bunfig.toml` keys other than the two preloads.

## Single implicit scope (S1)

**Expected behavior:** a Bun process that the workflow starts, other than a test run, loads no `bunfig.toml` preload and no `.env` file from its working folder. Node launches and test runs are unchanged.

**Files:** `ai-framework/scripts/runtime/entry.mts` and `entry.test.mts`; new `ai-framework/scripts/runtime/bun-isolated.toml`; `ai-framework/scripts/orca-run.mts`, `orca-eval-grader.mts` and their tests; `ai-framework/templates/shipped-files.txt`; `README.md`; `ai-framework/scripts/runtime/README.md`. The coordinator makes every `.project/` change.

**Boundaries:** no change to which runner is selected, to test-run arguments or to project check commands. A direct `bun <script>` call stays unprotected and is documented.

**Exit criteria:**
- New tests start real Bun in a scratch project that has a marker preload and a marker `.env`, through the shared launcher and through a Node launch with `AI_WORKFLOW_RUNNER=bun`. Both markers appear before the fix and neither after it. The failing run is recorded.
- Tests pin the three options on script, `-e` and `build` launches, and their absence on Node and test launches.
- The direct launches in `orca-run.mts` and `orca-eval-grader.mts` use the same options.
- The changed test files pass on Node and on Bun with Bun tests not skipped; runtime invariants and the shipped-list test pass.
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exits 0.

## Build (2026-11-27)

Orca Run `run_1603d83fac93`. Worker `gk-bunfix-1`, Codex `gpt-6.2-sol` medium, named instead of `assign` so the model could be set. Collected, then released.

- The worker asked about two older tests outside its paths. The coordinator made both edits: `runtime.test.mts` copies the new config into its fixture, and `setup-validator.test.mts` now requires the options before the Bun `build` launch.
- Worker figures, not rechecked: failing run before the change (4 pass, 6 fail); `bundle-sync` installed the config byte-identical and its Bun upgrade test passed. A full Bun run of the sync tests timed out repeatedly and was stopped; the worker reports the same timeout on the unchanged code.

### Coordinator evidence
- Isolation removed in a scratch copy: `entry.test.mts` 4 pass, 6 fail, 0 skipped.
- Real detector, `AI_WORKFLOW_RUNNER=bun` through Node, from a scratch project with a marker preload: the `HEAD` copy ran the preload; the fixed copy did not. The fixed copy ran from a path containing a space.
- Eight changed or related test files on Node: 251 pass, 0 skipped. On Bun: `entry.test.mts` 10 pass; the Orca run, grader and setup validator tests 97 pass.
- `pre-ship-verify` exit 0: 2,543 tests, 2,540 pass, 3 skipped, 0 fail. `git diff --check` clean.
- A first comparison run was invalid because the coordinator's marker script had a syntax error; it was rewritten and rerun.
- No independent review yet (`/audit`).

## Audit (2026-11-27)
- Two cycles, the bug-fix cap; see [audit.md](audit.md). Cycle 1 found a TypeScript path-mapping bypass of the first fix; the coordinator fixed it.
- Cycle 2 found that Bun macros run project code in the two parse checks. Confirmed and left open for the owner. The fix is not committed.
- The triage probe was too narrow twice: it missed wildcard path mappings and did not consider macros.

## Re-shape (2026-11-27)
- Owner approved `/shape` at the audit gate. Pitch: [pitch.md](pitch.md). No code changed.
- Coordinator probes: under `bun run`, a project's `node_modules/.bin/node` replaced bare `node`; a repository doctor run under Node over a scratch project ran that project's `graphify.mts` (the first attempt stopped earlier for lack of templates).
- Critique: four Orca workers, Run `run_1603d83fac93`, collected and released; OpenCode port free; guard clean.

## Plan probe (2026-11-27): the doctor's OpenCode step runs project plugins
- OpenCode v2.4.2, macOS. Scratch Git project with marker plugins in `.opencode/plugins/` and `.opencode/plugin/`, temporary `HOME`, empty environment apart from `PATH`; port free beforehand.
- `opencode debug config` exited 0 and left a background service running. No marker existed immediately after the command; both existed after `opencode-service.mts free` stopped that service (one process signalled). Inference: the service that the command started loads project plugins.
- The doctor itself was not run in this probe. It starts this command only when it runs on Node.
- The pitch requires bringing this back to the owner before changing scope. Planning is paused.
- Owner chose A (live OpenCode step opt-in, about 22 files). Follow-up probe: `uv --version` and `git rev-parse --git-path hooks` ran no marker in a scratch repository with hostile Git and uv settings; the `git status` control ran its fsmonitor marker.
- Plan written: S1, then S2.

## Build of the re-shaped fix (2026-11-27)
- Owner chose to keep the earlier change uncommitted. Before S1: patch, copies of the two new files and SHA-256 of all 15 files saved outside the repository; the patch applied to a copy of `HEAD` reproduced every hash.
- S1: Orca worker `gk-bunre-s1`, Codex `gpt-6.2-sol` medium, brief `build/s1-reshape-brief.md`.

### S1 result (2026-11-27)
- Worker collected and released. Of the 15 earlier files only `setup-validator.test.mts` changed, which S1 allowed; `critique-out/`, the other untracked pitch and `HEAD` unchanged.
- Gap found by the coordinator: no test used macros. Added one per command; each first proves the fixture macros run when Bun gets the source. First version failed on old code only for the missing warning; markers are now asserted first, and on the pre-S1 source both tests report `relative, absolute, package` as run.
- Coordinator probe through the real commands under Bun, outside the suite: pre-S1 code left markers (validator: all three; doctor: absolute and package, the relative path did not resolve in that fixture); new code left none. Under Node: none.
- Both files: Node 132 pass, 0 skipped; Bun 132 pass, no skips reported. Invariants and launcher: 22 pass. Banned-parser grep empty; `git diff --check` clean.
- Deliberately broken copies, compared with an unchanged copy (14 failures there because only `ai-framework/` was copied): old source, no Bun skip, and no Node pin each caused extra failures in the new tests.
- `pre-ship-verify` exit 0: 2,556 tests, 2,554 pass, 2 skipped, 0 fail. OpenCode service stopped afterwards. The real validator on this repository with the Bun runner: READY, 166 files reported not parse-checked.

- Owner approved S1. S2: Orca worker `gk-bunre-s2`, Codex `gpt-6.2-sol` medium, brief `build/s2-reshape-brief.md`, after a second backup that restores every non-record file.

### S2 result (2026-11-27)
- Worker collected and released. Of the earlier files, only four that S2 allowed changed; `critique-out/`, the other untracked pitch and `HEAD` unchanged. Worker-only claim, not rechecked: failing run before the change (1 pass, 5 fails).
- Coordinator: validator and doctor tests, Node 138 pass, 0 skipped; Bun 138 pass, no skips reported. Invariants 8 pass. Old Graphify launch grep empty; skill mirror equal; both documents name the flag; no code outside the doctor and its test passes it. `git diff --check` clean.
- Reverting each half in a scratch copy failed its tests: Graphify 3, opt-in 2.
- Smoke test, real doctor and validator with real OpenCode, temporary `HOME`, marker Graphify and marker plugins: without the flag, under Node and Bun, no marker and no service afterwards. Control with `--live-opencode` on Node: both plugin markers and one service stopped. No Graphify marker in any run.
- `pre-ship-verify` exit 0: 2,562 tests, 2,560 pass, 2 skipped, 0 fail. Setup validator READY; relations check passed. 21 files besides records.
- An OpenCode service was running after the verifier. A second run with a stand-in `opencode` on `PATH` (the stand-in exits 1; the verifier still exited 0) recorded 6 `debug config` calls, all from the upgrade-simulation tests running an earlier release's `workflow-doctor.js` in temporary copies; none from the new doctor.

## Audit of the re-shaped fix (2026-11-27)
- Cycle 1: see [audit-reshape.md](audit-reshape.md). All review workers collected or settled and released; OpenCode port free; repository guard clean.

- Owner asked to update all READMEs, then to open stacked pull requests. Only two READMEs describe the changed behavior; those and the setup-validator guide were updated. The fix goes up as a draft: the behavior evaluation has not run and nothing is shipped.
- Owner answered `Fix`. Both behavior cases ran through Orca and passed (Claude, one run each); results and limits in `audit-reshape.md`. All 21 workers of the Run are released; OpenCode port free; guard clean.

## Ship (2026-11-27)
- Owner chose 1: shipped as v2.62.0, committed locally. The owner then asked to commit everything to the current branch, including the two untracked folders, which go in their own commit. Nothing pushed in this step.

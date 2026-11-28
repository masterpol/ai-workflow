# S1 brief: stop workflow-started Bun loading project settings

Read first: `.project/pitches/fix-bun-project-preload/log.md` (cause, probe results, scope and exit criteria), `ai-framework/scripts/runtime/entry.mts`, `cli.mts`, `entry.test.mts`, `invariants.test.mts`, `test-helpers.mts`, the `checkCatalog` function in `ai-framework/scripts/orca-run.mts`, the `catalog` function in `orca-eval-grader.mts`, `ai-framework/rules/security.md` and `ai-framework/rules/testing.md`.

This is a defensive fix. The tests use harmless marker files in temporary folders only. A preload or env file in a test only prints or writes a marker.

## Behavior
- One exported helper in `runtime/entry.mts` gives the isolating Bun options, in this order: `--config=<absolute path of bun-isolated.toml beside entry.mts>`, `--no-env-file`, `--no-install`. Resolve the path from the module's own location, never from the working folder or an environment value.
- New `ai-framework/scripts/runtime/bun-isolated.toml`: comments only, saying why it must stay without settings.
- `workflowInvocation` puts the options before the other arguments when the selected runner is Bun, for scripts, `-e` and `build`. Test runs (`--test` or `test` as the first argument after the Node flags are removed) and Node launches are unchanged. Check how `run-tests.mts` probes with `--test` so it keeps working.
- A missing config file must stay a failure. Do not fall back to launching without the options.
- `checkCatalog` in `orca-run.mts` and `catalog` in `orca-eval-grader.mts`: their non-test Bun launches use the same helper. The Bun test entry `["test", "ai-framework/"]` is unchanged. Node arguments are unchanged.
- Check whether `node -e` style argument handling still works when the options come first under Bun.

## Tests (write first, record the failing run)
- Real Bun, scratch project holding `bunfig.toml` with a marker preload and a `.env` with a marker variable, used as the child's working folder:
  - through `runWorkflowSync` (or `runWorkflow`) with the runner `bun`: a script, an `-e` launch and a `build --no-bundle` launch show neither marker;
  - through a real Node launch of a small script that calls `runDirect`, or of an existing read-only workflow script, with `AI_WORKFLOW_RUNNER=bun`: neither marker. `cli.mts` is the respawn route.
  - a control launch without the options shows both markers, so the fixture is proven able to detect them.
- Real-Bun tests may skip only when no `bun` executable exists. Report the skip count; on this machine it must be 0.
- Pin the exact arguments for Bun script, `-e` and `build` launches, and their absence for Node and test launches. Update the existing tests that pin launch arguments deliberately and list each change.

## Docs and list
- `README.md` and `ai-framework/scripts/runtime/README.md`: state what the workflow-started Bun launches no longer load; that a direct `bun <script>` command still loads the working folder's preload and `.env` before any workflow code, so in a checkout you do not trust run the script with Node and `AI_WORKFLOW_RUNNER=bun` (or use Node only); that Bun scripts no longer receive `.env` values from the project; that this was checked with Bun 1.4.5 on macOS only. Replace the README's current "Known issue with Bun" paragraph. Remove or qualify every instruction there that recommends a direct `bun` run. Note that the Node route respawn still reads Node's own settings (for example `NODE_OPTIONS`); do not claim more than was tested.
- Regenerate `ai-framework/templates/shipped-files.txt` with `UPDATE_SHIPPED_FILES=1` and the manifest test in `project-state.test.mts`. Do not edit that test file.

## Exit commands (all must exit 0)
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test` on `runtime/entry.test.mts`, `runtime/invariants.test.mts`, `runtime/runtime.test.mts`, `orca-run.test.mts`, `orca-eval-grader.test.mts`, `run-tests.test.mts` (those that exist) and `project-state.test.mts`
- `bun test` on `runtime/entry.test.mts`
- `node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/hooks/scripts/pre-ship-verify.mts`

Estimate: under 50 lines of non-test code and under 200 lines in total. Report if you will exceed 300.

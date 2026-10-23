# Audit review record: coverage

independent: not-completed
canary: caught
read-only: verified by review-bench guard-cycle1-check.json
prompt-sha256: 27ce4e43704c23b21b6ee0d78c9ec6a8a84776c1790aa64e3df88c64027992d5
model: claude-haiku-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-coverage.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-coverage-ox_clega.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# Test-coverage audit: token-time-report (scratch copy, whole-file review)

Verdict: BLOCK. The S2 publication ownership guard does not work for the Markdown and HTML outputs, so `--apply` overwrites a user's existing `flow-report.md` (and `flow-report.html`) instead of refusing it. Two scoped test files fail on this, so the plan's S1 and S2 exit commands do not exit 0 in this scratch copy. I ran the scoped tests; I did not run the full repository suite, and the coordinator's full-suite figure is not my evidence.

## Scope and method

- Read the agent role (`.claude/agents/test-coverage-checker.md`) and the contract (`.project/pitches/token-time-report/plan.md`, S1 through S3 exits and the test strategy table). I also read `deviations.md` headings and `ai-framework/rules/testing.md` headings. I did not re-read the full testing rule body, so the testing.md walk is partial: I checked the headings only.
- Whole-file review of `flow-join.mts` (322 lines), `flow-report.mts` (223), `flow-render.mts` (121), `review-bench.mts` (276), and the four test files `flow-join.test.mts` (239), `flow-report.test.mts` (384), `flow-render.test.mts` (71), `review-bench.test.mts` (553).
- `state-pages.mts` and `state-html.test.mts`: only the flow-report link and its tests, by grep (`state-pages.mts:132`, `state-html.test.mts:661-685`).
- Not read: `workflow-metrics-state.mts`, `runtime/*`, `workflow-metrics.md`, `S1-S3-evidence.md`. These were used only through their public names as the scoped files call them.
- Node v24.21.0 used for all test runs. Commands ran with an explicit scratch `cd` and a 20-second `perl alarm` cap.

## Commands and results

| Command (cwd = scratch) | Result |
|---|---|
| `node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap ai-framework/scripts/flow-join.test.mts` | 15 tests, 15 pass, 0 fail. exit 0 |
| same, `flow-render.test.mts` | 4 tests, 3 pass, 1 fail (test 3, `generator ownership needs the exact format marker`), exit 1. Failing assertion at `flow-render.test.mts:63` (see F1) |
| same, `flow-report.test.mts` | 22 tests, 21 pass, 1 fail (test 15, `existing unowned, linked, directory and FIFO targets are refused before anything is written`), exit 1. The failure shows `--apply` exit 0 and "published flow-report.json, flow-report.md, flow-report.html" where the test expected exit 1 and no output (see F1) |
| same, `review-bench.test.mts` | 34 tests, 34 pass, 0 fail, exit 0 |
| Grep of `state-pages.mts` and `state-html.test.mts` for `flow-report` | Link present at `state-pages.mts:132`; tests cover present, absent, and symlinked targets (`state-html.test.mts:661-685`). Test file not executed |
| `orca orchestration check` (mailbox poll, once) | 0 messages |

Not run: the full repository suite (`run-tests.mts --runtime node`), the Bun run, `state-html.test.mts`, `state-snapshot.test.mts`, the setup validator, and the graphify check. The full-suite result claimed in `plan.md` ("2469 pass, 0 fail") is coordinator evidence, not a result I executed. It is probably stale: the two failing scoped files would make it fail.

What did not work: my first attempt used `${PIPESTATUS[0]}` and a default reporter with no output captured. The shell is zsh, so the variable was empty, and the default reporter's summary lines did not match my grep. Rerunning with `--test-reporter=tap` and writing output to a file fixed both. A second grep chain failed because `=====` is parsed by zsh; I reran it without that.

## Checklist walk (role steps 1-4 and testing.md)

1. Run the project test command: partial. Scoped Node runs executed (table above). Full suite: unverified by me.
2. Changed source files have sibling tests: checked for `flow-join.mts`, `flow-report.mts`, `flow-render.mts`, `review-bench.mts`. `state-pages.mts` has coverage only through `state-html.test.mts`, which I did not run: unverified.
3. Auth or access-gate logic needs authorized and unauthorized tests: no auth. The analogous gate is the publication ownership check. Its tests exist but fail for the Markdown and HTML paths (F1).
4. Skip type-only and docs files: `flow-join.mts` and `flow-render.mts` export types next to logic; not treated as type-only. Checked.
5. Every exported function or plan exit matched to an assertion:
   - `flow-join.mts`: `FLOW_LIMITS`, `REASONS`, `projectTokens`, `projectUsage`, `projectHistory`, `joinFlowReport`. All covered by `flow-join.test.mts`; all pass.
   - `flow-report.mts`: `parseArgs`, `collectSources`, `main`, `publishFiles` (exercised through `main --apply`). Covered by `flow-report.test.mts`, with failure at test 15 (F1).
   - `flow-render.mts`: `FORMATS`, `ownsFormat`, `render`, `renderFormats`, `renderHtml`, `renderMarkdown`, `renderJson`. `ownsFormat` has a test (test 3) that fails for markdown and html (F1).
   - `review-bench.mts`: `prepare`, `guard`, `safeRelative`, `readGuarded`, `count`, `canaryCheck`, `recordCheck`, `printable`, `main`. All covered and passing.
6. Walk of plan exits:
   - S1 (`flow-join` + `flow-report` tests exit 0): fails, because flow-report test 15 fails.
   - S2 (`flow-render` + `flow-report` + `flow-join` tests exit 0): fails (flow-render test 3 and flow-report test 15).
   - S3 (`state-html` + `state-snapshot` + `flow-report` + `flow-render` tests): not run; the two failing files are in this list, so the command cannot pass as written.
   - Setup validator and graphify check: not run.
   - Guard mutant requirement (plan S2): a mutant test exists at `flow-report.test.mts:378-384`, but it was not executed (see F2).
7. Review of `review-bench.mts` and its test, per the brief:
   - Round-trip of a snapshot above the report cap: `review-bench.test.mts` "guard round-trips snapshots above the report cap" (2500 entries, asserts snapshot > 256 KiB, clean check, then detects an edit). Passes.
   - Oversize writer refusal: "guard refuses an oversized snapshot before publishing it" (16 MiB+ status string). Passes; asserts no filesystem call.
   - Edit detection: covered by the check tests and the round-trip test. Passes.
   - Symlink and FIFO protection on the guard checker: "main: guard check refuses a symlink, a FIFO and an oversize snapshot" (in-memory fake). Passes. The real-FS symlink refusal for `guard snapshot` also passes.
   - Report and manifest readers at 256 KiB: `MAX_RECORD_BYTES` is the default in `readGuardedAbsolute`; `big.md` at 300 KiB is refused in "record-check refuses a symlink and an oversize record". Passes.
   - The 16 MiB cap applies only to snapshot read and write (`MAX_SNAPSHOT_BYTES`, `review-bench.mts:22`). Confirmed in source.
   - Mutants: none run for `review-bench.mts`.

## Cross-file interactions

- Reviewed: `flow-report.mts` calls `renderFormats` and `ownsFormat` (`flow-report.mts:120-125`, `flow-report.mts:202`). `flow-report.mts` calls `joinFlowReport` and `projectTokens/Usage/History` (`flow-join.mts`). `flow-report` and `flow-render` both import the same `FLOW_LIMITS` constants. The renderer and joiner interface matches the test fixtures.
- Reviewed: `flow-report.test.mts` uses `createTestDeps`, `tempFixture`, `captureIo` from the runtime test helpers. I did not open the helper file; the tests pass, so the helpers behave as the tests assume.
- Not reviewed in depth: `workflow-metrics-state.mts` (`withMetricsLease`, `readWorkflowState`, `blankState`, `metricsDirectory`). These are imported by `flow-report.mts` and `flow-join.test.mts`. Their semantics are not checked by me.
- Not reviewed: `state-pages.mts` link rendering and its interaction with `flow-report.html` beyond the grep above.
- The known accepted limits from the brief (non-atomic publication set, path recheck race, multi-table static report with neutral styling) are not repeated as findings.

## Findings

Verified column: "run" means I executed the failing test or command; "static" means I read the code and did not execute a POC.

| Severity | File:line | Rule or check | Concrete inputs -> wrong outcome | Verified | Suggested fix |
|---|---|---|---|---|---|
| must-fix | `ai-framework/scripts/flow-render.mts:23` (`ownsFormat`) | S2 exit: unmarked files, symlinks, FIFOs and directories are refused and preserved; test-coverage role step 2-3 | `ownsFormat("markdown", anyText)` and `ownsFormat("html", anyText)` return `true` because the early return `if (format !== "json") return true;` skips the marker check. `inspectOwned` (`flow-report.mts:120-125`) then accepts an existing user file `flow-report.md` containing `# my own notes`, so `--apply` publishes over it, exit 0. Confirmed by `flow-report.test.mts` test 15 (actual exit 0 and publish message, expected 1 with no output) and `flow-render.test.mts` test 3 (assertion at line 63 fails). | run | Remove the early return. Check each format against its marker: `MARKER_START.markdown` and `MARKER_START.html` already exist (`flow-render.mts:16-19`) but are unused. For json keep the existing parse-and-marker check. Re-run flow-render test 3 and flow-report test 15. |
| should-fix | `ai-framework/scripts/flow-report.test.mts:378-384` (guard mutants) | testing.md "Prove the Test Can Fail"; plan S2 mutant requirement | The mutant assertions use `assert.rejects(..., /flow-report\.(?:json|md|html)/)` and `/\.project\/metrics dir/`. Those regexes also match the scenario label passed as the assertion message (`unownedScenario` passes `name`; `swapScenario` passes `` `${which} ${kind}` ``). A mutant that fails for an unrelated reason would still pass. Because F1 already makes the ownership test fail, the mutant check cannot prove anything right now. | static | After F1 is fixed, assert the specific error text (for example `publication refused: ... exists and is not a report this tool wrote`) and that the mutant's file list matches expectation, instead of matching on label strings. |
| acknowledged (plausible, below 85%) | `ai-framework/scripts/flow-join.mts:289-290` | test-coverage role step 2 (counts reported in `details`) | A usage pitch with an exact name and no phases is a path of length 1. `exact` requires length 3, so the pitch is counted in `unjoinableLeafRows` although its label is exact. I did not write a POC. Its effect is a mislabelled count in `sources.usage.details`, not a wrong total. | static | Count only leaves whose `identity` is source-specific as unjoinable, and treat exact one-level rows separately. Add a test with a pitch that has no phases. |
| acknowledged | `ai-framework/scripts/review-bench.mts:51-58` (`inside`) | path containment | `rel.startsWith("..")` also rejects a legitimate child named `..x`. This refuses a valid scratch path; it does not let a path escape. Not tested. | static | Check `rel === ".." || rel.startsWith("../")`. Add one test. |

No findings for `review-bench.mts` round-trip, oversize refusal, edit detection, symlink/FIFO protection, or the 256 KiB record cap. All of those are covered and passing (34/34).

## Unfinished or unverified items

- Full repository suite: not run by me. Coordinator evidence only (`plan.md` build rollup). Likely stale given F1.
- Bun run for the four changed modules: not run.
- `state-html.test.mts` and `state-snapshot.test.mts`: not run. Only the link grep was done.
- Guard mutants (`flow-report.test.mts:378-384`): not executed as POCs. F2 is from reading the assertion matchers.
- `workflow-metrics-state.mts` and runtime helpers: not reviewed beyond their use.
- `testing.md`: headings read; the body (Guards and Fixes, Verification Discipline, Coverage Targets) not read.
- Coverage numbers (`--coverage`, ≥90% / ≥80% targets in `plan.md`): not measured.
- The plan's S1-S3 exit commands: S1 and S2 failing; S3 not run.

## Verdict

BLOCK on F1. Fix the ownership guard for markdown and HTML, then re-run `flow-render.test.mts` and `flow-report.test.mts`; then run the S1, S2 and S3 scoped commands and the Bun run, and the full Node suite as coordinator evidence. F2 should be fixed in the same pass. F3 and F4 are minor and can follow.

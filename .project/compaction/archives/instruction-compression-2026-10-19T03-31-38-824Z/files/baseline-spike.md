# S1 baseline experiment — 2026-10-18

**State:** S1 completed under the user-approved bounded baseline disposition; scope approval pending. The original full behavioral baseline remains incomplete. See build-evidence.md.

## Existing-suite baseline

Ran the approved command across `scripts/*.test.mts`, `scripts/runtime/*.test.mts` and `hooks/scripts/*.test.mts`, with Node type stripping enabled. Exit 0: **1,674 tests, 1,672 passed, 0 failed, 2 skipped**, duration 93,854 ms. The existing skips are the Windows alternate-object-path case and the Bun-only syntax-check case. No assertion was changed or skipped for this pitch.

Output: ignored `.project/metrics/instruction-compression/build-baseline/node-tests.log`. Before the experiment, 23 non-secret instruction/adapter/dataset files were copied and hashed into `manifest.json`. Their hashes remain unchanged. A separate guard over 1,045 non-secret tracked/untracked files was clean after the initial probes; secret filenames were excluded before reading. The broader guard began after the first launch, so the pre-launch 23-file snapshot is the stronger evidence for that first probe. No claim of a fully pre-dispatch whole-tree guard is made for it.

## Native probes and resource outcomes

| Probe | Attempt / dispatch | Observation | Acceptance / cleanup |
|-------|--------------------|-------------|----------------------|
| Claude native build loading and small-batch decision | `ic-native-claude-20261018-a1` / `ctx_aa150503ecdf` | Native `Skill(skill=build)` and overview read visible in provider trace; correct small-batch flow to audit. The initial trace did not establish the phase-owner read. | Own completion accepted; terminal retained with runtime reason `user_takeover`; local attempt settled. |
| Initial OpenCode launch | `ic-native-opencode-20261018-a1` / `ctx_9d8dafd75b00` | Failed at `agent_readiness` after 60 seconds. Runtime subsequently proved exact terminal exited and authorized release. No subject result. | Failed terminal released; local attempt settled as failed. |
| OpenCode retry, authorized by the user's “when you can try opencode again” | `ic-native-opencode-20261018-a2` / `ctx_fbf12fe1bc93`, retry of the same Task `task_88a64d5acc08` | Native worker completed and reported skill/phase-owner reads and the correct small-batch decision. Effective terminal footer: Kimi K2.7 Code. Orca supplied terminal fallback output rather than a complete provider tool trace, so loading verification remains partial. | Own completion accepted; terminal released; local attempt settled. |
| Focused Claude phase-owner observation | `ic-native-claude-owner-20261018-a1` / `ctx_c7958556b109` | Provider trace shows native Skill activation, full `2-build.md` read and overview gate-section read. The worker also wrote an ignored report despite its read-only brief and included that path in `filesModified`. | `orca-run collect` rejected the original completion with `accepted:false, reason:invalid-files`; no completion acceptance or full baseline pass claimed. Runtime-settled terminal release returned retained / `user_takeover`. Local attempt settled as failed because its report was inadmissible. |

Every received delivery was processed before acknowledgment. Final `worker-list --run run_fda64cf7e993 --terminal-state reclaimable --json` returned no rows. Preserved user-taken-over terminals were not closed or reused.

## Current blocker and concrete repair

The final collection exited 3 with **`invalid-files`** because its own `worker_done` listed `.project/metrics/instruction-compression/build-baseline/claude-owner-probe-report.md` in `filesModified`. The collector deliberately disallows `.project` paths in that field. The original message was not rewritten or sanitized to make it pass, and the collector was not weakened.

A corrected, undispatched brief is ready at ignored `.project/metrics/instruction-compression/build-baseline/proposed-owner-correction.input.json`. It explicitly forbids all file creation, including ignored reports, and requires the native observations only in the worker's own completion body, without `--files-modified` or `--report-path`. A fresh read-only task can repair this result without changing workflow code or the approved pilot boundary.

The build skill requires stopping and asking after an Orca refusal. Further dispatches stopped at the collection rejection. Pending user choice: repair the reporting and resume S1, or explicitly re-invoke with `orca=normal`. The user's earlier OpenCode retry authorization was honored; that retry succeeded.

This experiment proves the existing test baseline and some native loading/decision observations. It does not prove all golden cases, vendor parity, hook activation, candidate behavior or context savings. All 31 golden scenarios remain unexecuted as a complete scored dataset. Do not shorten prompts until the approved behavioral-baseline prerequisite is satisfied or explicitly revised.


## Authorized recovery and baseline expansion — 2026-10-18

The user instructed “continue with what we need,” authorizing the prepared reporting correction. Fresh attempt `ic-native-owner-correction-20261018-a1` / `ctx_a7b208f7b3c4` supplied its own accepted completion without file writes. Native Skill activation, build owner and overview reads are observed. The original rejected report remains rejected; no collector code or payload was relaxed. The correction's runtime release returned retained / `user_takeover`; its local attempt is settled. The earlier refusal-recovery choice is resolved.

Both vendors then answered all 31 frozen inputs. First-run independent scoring found response omissions and experiment limitations. Those artifacts remain intact. A second run supplied full phase, reviewer and rule context, still withholding all scoring expectations: Claude `ctx_4522b9d087fb`, OpenCode `ctx_b8895a2cbb15`. Both supplied accepted completions. Claude's trace shows native Skill(build/audit/ship) calls and reads of all three phase owners, the overview and supporting contracts before its answer. Its payload is clipped; OpenCode has only a clipped terminal fallback. OpenCode's observed effective model is Kimi K2.7 Code; no unsupported model override was claimed. These are decision-response/loading experiments in this checkout, not controlled runtime-effect executions or native activation in an installed fixture.

A fresh independent observer (`ctx_788e1af94d54`) is scoring only the second-run responses and unchanged criteria. The dataset hash remains `cbed726e3995b48607de258523eec66b1d7106bac72475515b2d4430473898b6`. All 23 frozen source hashes remain unchanged. No prompt or phase owner has been edited.

Evidence remains under ignored `.project/metrics/instruction-compression/build-baseline/`: original `*.delivery.json`, `*.trace.json`, normalized `*-complete-responses.json`, compact `*-complete-tools.json`, source manifest and safe guard snapshots. `spike-measurements.json` separates observed calls from unavailable metrics. There is no valid paired routine/off versus enabled loaded-context measurement and no context-savings claim. Claude exposes 17 tool calls in the retained second-run trace (a lower bound); OpenCode's total is unavailable.

The current broad guard differs in authorized instruction-compression records and the new test, generated graph files, and independently changed toon-machine-data records. Those unrelated records were preserved. This broad shared-checkout comparison does not establish a per-subject unchanged guard for the reviewer scenarios. A default-test disposable installed layout now passes without `.project`, registry or external packages; this is structural evidence, not native installed-project activation.


## Independent result and stopping point — 2026-10-18

The fresh observer completed with `readyForCompression: false`. Claude: 116 satisfied / 4 failed / 4 unverified criteria; OpenCode: 82 / 20 / 22, each across 31 cases and 124 criteria. The coordinator verified score completeness and inspected the failed responses. The honest `baseline-incomplete.json` is rejected by required-mode validation (exit 1), as intended. No accepted baseline or candidate result exists.

All accepted attempts have settled local ledgers and processed deliveries. Claude's second-run terminal was released; OpenCode's and the scorer's terminals were retained on runtime `user_takeover`, without closing or reusing them. The next decision is the concrete baseline disposition in [baseline-review.md](baseline-review.md). Further prompt editing is stopped under the approved plan's explicit baseline prerequisite.


## Approved S1 baseline — 2026-10-18

The user approved the explicit disposition in `baseline-review.md`. The first unprompted full-activity pair had correct decisions but omitted owner reads; it remains incomplete evidence. The clarified matched brief follows the native entry's full-activities and applicable integration links without naming/preloading owner files. Baseline off `ctx_c8bff884afb0` and enabled `ctx_beb07782382f` both show native Skill activation, full build-owner read and overview gate read before decisions; enabled additionally reads the CLI/refusal section of the integration owner before its refusal decision. Off proceeds to audit without a build-end gate; enabled stops on authorized-paths-overlap and asks fix or per-call bypass. No actual coordinator operation is implied. All 23 frozen source files remain unchanged at baseline capture.

The explicit approved policy validates the honest frozen incomplete score vector; default strict mode still rejects it. Known failures and partial rows are not relabeled passes. The new policy does not extend to audit or ship. This establishes the amended baseline prerequisite for beginning S1, with the coverage limits in the approved disposition still in force.


## S1 result — 2026-10-18

The user approved the bounded disposition; matched native baseline/final pairs and both independent 31-case comparisons now satisfy that amended contract. S1 is complete pending its scope gate. The complete original baseline is still not a universal pass: known failures and unverified coverage remain visible. Final evidence and current limitations are in [build-evidence.md](build-evidence.md).

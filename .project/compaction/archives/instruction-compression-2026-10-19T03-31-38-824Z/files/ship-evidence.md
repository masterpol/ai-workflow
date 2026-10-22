# S3 evidence — 2026-10-18

**State:** S3 implementation and focused checks are ready; full-suite exit remains failed (three historical upgrade simulations). Final independent scoring rejects S3; see s3-review.md. No ship phase, pitch closure, commit or publication is authorized here.

## Approved test strategy and boundary

The S3 test plan is already part of the approved [plan.md](plan.md). `/test-strategy` calls for actual behavior and negative cases; these are instruction contracts, not UI rendering tests.

| Surface | Behavior | Check |
|---------|----------|-------|
| Ship entry and owner | Named sections load before dependent verification/closure; owner is required | Existing owner-loading unit checks plus missing-pointer mutation |
| Final verification | Real pre-ship command remains required; failure prevents shipping | Owner contract and omitted-command / ship-on-failure mutants |
| Failed-check routing | Retry only within appetite cap; stop at cap | Non-vacuous contract N replacement and removed-cap mutant |
| Cursor and installed layout | Copy exists and matches; no local eval/registry dependency | Existing parity and physical disposable-layout tests |
| Native decisions | Human closure, refusal stop, failed verification at cap | Separate native observed baseline/candidate probes, independently reviewed |
| Frozen 31-case responses | No newly failed or lost criterion | Fresh Claude/OpenCode subjects and graders under the explicitly approved remaining policy |

Pre-S3 implementation churn: 1,286 / 1,500 lines, 10 of 14 permitted paths. Remaining: 214 lines. Initial S3 estimate: 180. Implementation worker owns only canonical ship, Cursor ship and the two existing test files; phase4 is read-only because all removed obligations already have owners. The coordinator owns version/evidence records and the final independent reruns. The initial artificial 100-line worker allowance was corrected to the plan's 180-line estimate before completion; the hard cumulative cap is unchanged.

## Native baseline before prompt edits

Orca startup reports ready for coordinator Codex. Bound Run `run_fda64cf7e993` has the same pitch objective and coordinator `term_1cd102e9-b416-461a-a317-96c7aa8c742c`. A seven-file byte snapshot and manifest are retained under ignored `.project/metrics/instruction-compression/s3-preparation/source/`.

Three fresh Claude Sonnet standard-profile read-only attempts completed on unchanged ship sources:

- Routine off `ctx_fd2d716805d8`: native Skill(ship), full phase4 read, closure message waits for human [1] ship / [2] hold. No integration detail read. Overview gate was not read; that omission remains unverified.
- Already-refused enabled `ctx_2c0053f3b2c0`: native Skill(ship), full phase4 and integration owner reads, stops on exit3 authorized-paths-overlap and asks fix versus explicit per-call bypass. No retry, release or closure.
- Failed verification at cap `ctx_a94c0cbdd5be`: native Skill(ship), shell reads of phase4 verification and phase3 loop contract before the decision; refuses another audit cycle and shipping at small-batch cycle2/2. It did not read phase3 Adaptive gate body. No real tests or ship actions ran.

Exact provider transcript capture occurs at a neutral checkpoint after reads and before decisions. The coordinator response authorizes only the hypothetical response. Original asks, completions, traces and release receipts are preserved. Native activation and ordered reads are observed; clipped Skill contents are not proof of complete delivery. Failure probe supplements the frozen dataset without altering any input or criterion.


## Candidate implementation and clause mapping

Canonical ship is **635→380 words**, with a byte-identical Cursor copy and unchanged caveman banner. The phase4 owner retains its baseline SHA-256. No unique removed obligation needed transfer. The mechanical worker's focused tests passed, but its 494-word draft retained local Output/Confirmation/Transition duplicates contrary to the requested extraction. The coordinator removed these duplicates after processing its own completion, and independently reran the corrected tests. The worker's statement that those sections were immutable was incorrect: only the caveman banner was fixed. Original worker report and edits remain in the trace.

| Removed detail | Existing owner and load point |
|----------------|-------------------------------|
| Actual final verification, applicability, failed-check abort | 4-ship.md Activities (in order), 1. Final verification (mandatory), before verification |
| Failed-check retry and escalation | 3-audit.md Loop discipline and Adaptive gate, before choosing a retry |
| Scope statuses, no-gos, rabbit holes, reconciliation | 4-ship.md activity2, before reconciliation |
| Real id/tags/related links, incident/pattern extraction, graph/index rebuild | Activity3, before extraction |
| Status cap and run/hill archives, followup backlog, conditional docs | Activities4–6, before each action |
| Output, human [1] ship/[2] hold and conditional cooldown | Output, Confirmation gate and Transition; overview /ship row before closure |
| Startup, exact vendor/raw arguments, off/bypass/worker/refusal | Short wrapper bootstrap retained before phase work |
| Pre-verification reconcile, fixed checks, independent integrated verification and cleanup | Phase Optional Orca multi-agent plus integration Reconcile core and CLI/refusal owner, only on enabled applicable steps |

Contract N now follows a validated, timed ship pointer to the substantive owner while retaining the local conflicting-cycle guard. All 14 contracts remain. New ship assertions and mutants cover the final-verification heading, actual pre-ship command, ship-on-failure permission, removed cycle cap and broken owner pointer. Existing installed-layout/Cursor checks remain. No default evidence policy or frozen dataset changed.

## Candidate observation and measured limit

Fresh candidate attempts: routine off ctx_046ddd092c61; enabled refusal ctx_e9f8bcf8bf22; failed verification at cap ctx_79648fc259b6. Exact native Skill(ship) and owner reads precede decisions. Routine also reads the governing overview gate and waits for human ship/hold; enabled reads CLI refusal and stops; failed-check probe reads audit loop/cap and blocks ship plus excess retry. Actual runtime operations and closure remain hypothetical.

| Scenario | Baseline/candidate source words | Tool calls | Observed interval |
|----------|---------------------------------|------------|-------------------|
| Routine off | 1,623 / 1,622 | 5 / 7 | 44,043 / 38,421ms |
| Already-refused enabled | 6,573 / 3,180 | 6 / 11 | 45,227 / 49,846ms |

Routine context is effectively flat: wrapper savings of 255 words are offset by 254 words of governing gate reads omitted by the old baseline. **No material routine context reduction is demonstrated.** Enabled counts depend on full integration-owner versus model-selected ranges and an extra audit read, so the difference does not isolate wrapper compression. Counts are unique requested source lines, excluding system/hook/tool framing and grep duplicates; clipped payloads and n=1 limit interpretation. Timing includes observation asks and coordinator waits. No token, cost or latency improvement is claimed. Baseline omitted reads remain unverified.

## Current verification and unresolved full-suite exit

Shared five-file Node structural command exits 0: 85 total, 84 passed, 0 failed, 1 explicit live skip; duration 27,383.827916 ms. Focused Node/Bun contracts/loading:25 passed, 0 failed, 1 explicit live skip each. Workflow doctor READY, 751 checks. Setup validator READY, 23 checks, 125 TypeScript entries parse. Graph CLEAN, 84 entries / 240 links. Changelog 2.31.7 and git diff --check pass.

Full Node wave-end command exits 1:

```text
ℹ tests 1687
ℹ suites 32
ℹ pass 1681
ℹ fail 3
ℹ cancelled 0
ℹ skipped 3
ℹ todo 0
ℹ duration_ms 89772.97825
```

All three failures are in runtime/upgrade.test.mts. Current pre-existing dirty workflow-doctor.mts requires eval runs/cache ignore rules; untouched historical fixtures retain their older project-owned .gitignore. The old README omission appears too but already has separate docs-only handling. S3 changed neither doctor nor upgrade tests.

Attribution proof, exit 0: a safely filtered disposable copy of current bundle sources, replacing only the copied doctor with HEAD, passes all 3 upgrade tests (0 failed / 0 skipped, 236,029.01525 ms). No real file was reverted. A separate six-line fixture repair models SETUP.md's required post-sync ignore merge, keeping doctor enforcement. It is prepared outside the approved paths and is not applied. The first repair preview had an invalid nested-root git archive harness and failed before exercising the repair; rerun anchors the disposable harness to the actual checkout. Both logs are preserved.

Cumulative current implementation is 12 paths, **1,405/1,500 added+deleted lines**, including the 478-line dataset, mirrors and version records. The 14 named-path boundary remains. The proposed upgrade-test repair is outside that path set and needs a scope decision; it does not change any shipped runtime behavior.


## Disposable repair verification

The rooted disposable repair run exits 0: all three upgrade simulations pass, with no skip (235,472.117917 ms). This tests the current bundle and six-line fixture merge; only its temporary harness root is adapted for execution outside the real test path. The real checkout remains unchanged and its full-suite failure remains open. [upgrade-repair.md](upgrade-repair.md) gives the exact proposed boundary, patch and approval gate.

## Independent Claude grading

Fresh subject ctx_afefd6ac0e8d completed all 31 inputs. Independent grader ctx_013116d92226 returned all 124 criterion scores in its own completion: 117 satisfied, 3 failed, 4 unverified; no new loss versus baseline 116/4/4. The one improvement is single-trial review wording, not proof of repaired reviewer effects. The scorer accepted all three native paired decisions, while calling routine context effectively flat and enabled ranges non-comparable.

The grader's incidental claim that the inputs-only file hash equals cbed72... is inaccurate: cbed72... identifies the full frozen dataset. Actual inputs are the unchanged input-only artifact, and report validation computes each frozen input's hash directly. Original grader notes remain unchanged; no score correction follows.


## Final S3 result: rejected

OpenCode completed the requested retry and all31cases. Fresh independent grader ctx_27046076bd2b reports85satisfied/15failed/24unverified. Its actual response emits PASS with missing test evidence; review-nonsecurity-evidence expected:1 and forbidden:0 regress1→0. Two owner-loading known0cells are returned as null; raw scores remain unchanged and fail the approved disposition. Required Node evidence mode exits1:12tests,11pass,1fail,0skip, with exactly these four criterion losses. No failed criterion is waived or averaged away.

The unchanged code-reviewer source contains conflicting PASS criteria. That role file is outside this pilot; no causal claim against S3 is established. All S3 attempts are processed and settled. Orca reports0reclaimable resources,27retained and32released; retained/user-owned terminals are preserved. The candidate remains rejected, and the full-suite fixture failure remains open. Recommended scoped disposition and reviewable patches: [s3-review.md](s3-review.md).


## Approved revision completed — 2026-10-18

The recommended revision is approved, applied and verified. S3 remains rejected/deferred and its four source/test files are restored exactly. The actual six-line fixture repair passes all three upgrade simulations; the complete Node suite passes 1,683 tests with zero failures and three existing skips. Current delivery and its R1/build-end approval gate: [build-completion.md](build-completion.md). Earlier trial and proposal statements above remain historical observations, not current unresolved application work.

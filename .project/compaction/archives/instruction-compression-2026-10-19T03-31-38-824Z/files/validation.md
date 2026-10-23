# Shaping validation — 2026-10-18

- `node --test ai-framework/scripts/workflow-contracts.test.mts`: exit 0, 14 passed, 0 failed, 0 skipped. Existing instruction owners remain unchanged.
- `node ai-framework/scripts/setup-validator.mts`: exit 0, READY, 23 checks passed; includes workflow doctor contracts and parsing 124 TypeScript entries.
- `node ai-framework/scripts/graphify.mts --check`: exit 0, CLEAN, 81 knowledge entries / 227 links.
- `git diff --check`: exit 0.
- Parsed the golden JSON and asserted 31 unique IDs, nonempty input/expected/forbidden arrays, and live-only/not-run status on every case. Revision Markdown links resolve.
- Resolver probe with the full free-form invocation returned `lite`. A deliberately invalid `caveman=offish` invocation reported the expected invalid-mode error; the dataset preserves that behavior rather than assuming a fallback.
- All five critique perspectives supplied their own successful completion reports, accepted by `orca-run collect`. All six local ledger attempts (including the refused initial launch) are settled. Every delivery was processed before acknowledgment. `worker-list --run run_fda64cf7e993 --terminal-state reclaimable --json` returned no rows: 2 released / 3 retained with runtime reason `user_takeover`.
- Knowledge traversal refreshed the generated graph/report to the current checkout revision. No knowledge entry was edited.

These are structural and workflow-record checks. They are not behavioral baseline or candidate results. All 31 live golden scenarios remain not-run on all four vendors. This session observed critique-worker operation, not vendor-native phase activation or loading equivalence.

Current gate: user Bet on `shape-revision.md` is pending. No `plan.md`, `hill.md`, compressed prompt, runtime patch, version change or commit was created.


## Planning validation — 2026-10-18

The user approved the bounded Bet; its record now selects Bet in `shape-revision.md` and appends the approval to `pitch.md`. The full sweep remains deferred.

Created a complete draft `plan.md`, `impact.md` and `hill.md`. All three scopes are `uphill 0%`. The implementation projection counts the existing golden fixture: 14 paths / 1,378 changed lines, with one optional integration-owner path inside the remaining 122-line budget. No implementation file or live result was created.

- Existing `workflow-contracts.test.mts`: exit 0, 14 passed / 0 failed / 0 skipped in this planning session.
- Setup validator: exit 0, READY, 23 checks passed, including workflow doctor and parsing 124 TypeScript entries.
- Graph check: exit 0, CLEAN, 81 entries / 227 links.
- `git diff --check`: exit 0.
- Content checks verified all three scope sections and explicit live exit commands, their matching hill rows, local Markdown links, current existing test paths, the absent planned implementation test, and the status line cap.

The native loading/baseline experiment is explicitly the first build activity; its result is not assumed. No planning worker was dispatched. The existing same-pitch Orca Run was inspected; historical lifecycle IDs were not reused.

The impact skill requires user acknowledgment before finalizing the plan. Plan approval is pending and will acknowledge the impact. This gate does not auto-start big-batch implementation.


## Plan approval and build preparation — 2026-10-18

User reply “Appove” was recorded as plan approval and impact acknowledgment. Current plan/impact metadata and the status index now reflect that decision. Created `build-start.md` with the concrete S1 baseline-first brief and existing stop conditions.

Build startup returned ready with explicit vendor codex. The current Run belongs to this same pitch and coordinator; no worker was dispatched. Compared every scoped existing implementation file with its saved planning SHA-256 and confirmed all hashes unchanged; the planned owner-loading test remains absent. Local links, status line cap and `git diff --check` passed. No source change justified rerunning the previously green implementation checks.

The separate big-batch build-start gate remains pending. All hill rows remain uphill 0%; no native behavioral baseline or implementation completion is claimed.


## S1 baseline experiment — 2026-10-18

Build start was approved. The complete existing Node suite (including nested runtime and hooks) exited 0: 1,672 passed, 0 failed, 2 pre-existing platform/runtime skips, 1,674 total. Source manifest hashes remained unchanged. Native loading probes and user-authorized OpenCode retry are recorded in `baseline-spike.md`.

A later Claude completion was rejected by `orca-run collect` with `invalid-files`; the original payload was preserved, no validator weakened, and no completion acceptance claimed. Its runtime-settled terminal was retained on `user_takeover`, its local attempt settled as failed, and its delivery processed and acknowledged. No reclaimable terminals remain. Further dispatches are stopped pending the required recovery choice. The full golden baseline and S1 implementation remain incomplete.


## S1 tests-only preparation and recovered reporting — 2026-10-18

The user authorized continuing the prepared no-write correction. Its own completion was accepted, without modifying the collector or the original rejected payload. Both vendors completed two 31-response decision experiments; the first independent score did not establish a valid baseline. The second independent score is being collected. No compressed prompt or owner transfer exists.

Added `ai-framework/scripts/instruction-loading.test.mts` and independently corrected its typed input validation, source-hash checks, negative fixtures, mixed legacy/compressed fixture and actual disposable layout. It validates declared evidence integrity; it cannot establish the truth of independent scores. This is partial S1 proof infrastructure, not completion of all planned exits.

- Shared Node structural command across the five planned test files: exit 0, 82 total / 81 passed / 0 failed / 1 explicit live-mode skip.
- Shared Bun command across workflow contracts and instruction loading: exit 0, 23 total / 22 passed / 0 failed / 1 explicit live-mode skip.
- New test alone: Node and Bun each 8 passed / 0 failed / 1 explicit live-mode skip. Missing required reports are proven to fail in a child process. Default skips are not live passes.
- Setup validator: exit 0, READY; all 125 TypeScript entries parse. Its workflow-doctor checks also pass.
- Graph check: exit 0, CLEAN, 81 entries / 227 links.
- `git diff --check`: exit 0.
- All 23 baseline snapshot files remain byte-identical, including the frozen dataset. Current scoped implementation churn is 809 lines (478 dataset + 331 new test), leaving 691 of the approved 1,500-line allowance. Planning/evidence records are separate.

The earlier experimental Node coverage command included no file rows. Its aggregate percentage is vacuous and is not accepted as coverage evidence. The existing full-suite baseline remains 1,672 passed / 0 failed / 2 existing skips; the new shared checks above were run after test edits. No full live-evidence gate or candidate equivalence has passed.


## Final baseline assessment — 2026-10-18

Independent second-run scores cover all 31 case IDs and every criterion for both subjects. Claude has 4 failed and 4 unverified criteria; OpenCode has 20 failed and 22 unverified criteria. These are not full live passes. The honest incomplete report fails the explicit required-mode command with exit 1, without a skip or altered dataset. The coordinator inspected the key failed responses; no source defect is asserted solely from response omissions. See [baseline-review.md](baseline-review.md) for the proposed disposition and exact coverage limits.

All accepted attempts' local ledgers are settled. Their resource decisions and deliveries were processed; user-owned retained terminals remain untouched. S1 is not complete, S2/S3 have not started, and the source snapshot is unchanged.


## S1 completed under approved amendment — 2026-10-18

The user approved `baseline-review.md`. Native matched baseline and final candidate observations satisfy the amended read-order/decision requirements; the off and enabled source-word proxies both fall. Independent scoring covers every criterion of all 31 cases for each subject: Claude 118 satisfied / 2 known failures / 4 unverified; OpenCode 86 / 16 / 22. There are no new failures or lost previously verified criteria. The approved evidence-policy command passes on Node and Bun; default strict behavior is unchanged. These are bounded pilot results, not all-vendor behavioral equivalence.

Final shared Node checks: 82 passed / 0 failed / 1 explicit live skip. Bun default contracts/loading: 23 passed / 0 failed / 1 explicit live skip. Full Node suite: 1,684 total / 1,681 passed / 0 failed / 3 skips (two existing plus explicit live mode), exit 0. Later report-read hardening and test-only refinements pass focused checks; required mode passes 10/0/0 on Node and 24/0/0 for Bun contracts/loading. Setup READY (23 checks), graph CLEAN, changelog 2.31.5 check and diff whitespace check pass.

Eight implementation paths, 1,074 added+deleted lines including the dataset; 426 lines remain. All Orca attempts are settled, all deliveries processed, no reclaimable workers remain. Detailed clause mapping, measurements, source/evidence paths, command tails, limitations and scope gate are in [build-evidence.md](build-evidence.md). S1 is done pending approval; S2/S3 remain unstarted.


## S2 preparation only — 2026-10-18

S1 evidence was approved. Scratch audit wrapper 941→445 words, Cursor parity retained; the focused Node 24.21.0 and Bun contract/loading suites each pass 24/0 with one explicit live-mode skip. Missing required reports fail with exit 1. No live candidate or source change is claimed. All eight preparation-manifest hashes are unchanged in the real checkout. S2 own completions were accepted but their traces are `session_not_reported` terminal fallbacks without readable content; native loading is unverified. See [remaining-scopes.md](remaining-scopes.md) for the exact patch, budget, proof extension and bounded recovery condition.


## S2 verification — 2026-10-18

Corrected audit wrapper 941→468 words, banner unchanged, Cursor byte-identical; phase3/overview/integration/native adapters retain snapshot hashes. Shared Node five-file command: 84 total,83 pass,0 fail,1 explicit live skip. Focused Bun:24 pass,0 fail,1 explicit live skip. Required amended audit evidence mode: Node11 pass/0 fail/0 skip; Bun plus contracts25 pass/0 fail/0 skip. Setup READY23 checks,125 TypeScript entries parse; doctor passed. Graph CLEAN84 entries/240 links; changelog2.31.6 and diff checks pass. Full suite remains due at S3 wave end. All31cases/124criteria per executable vendor independently scored: Claude116/4/4, OpenCode86/16/22 satisfied/failed/unverified; no new loss. Details and preserved rejected candidate: [audit-evidence.md](audit-evidence.md).


## Final two-phase delivery verification — 2026-10-18

The user-approved S3 deferral restores all four exact pre-S3 files. The six-line upgrade-fixture repair is applied. Current source manifest matches accepted S2 evidence. Actual upgrade tests3/3 pass; full Node1,683 pass/0fail/3existing skips of1,686 tests; required evidence Node11/Bun25 pass with0skips; shared Node83 pass/1explicit live skip; default Bun24 pass/1explicit live skip. Setup READY23checks,doctor READY751checks,125TypeScript entries parse,graph CLEAN84entries/240links,changelog2.31.8 and diff checks pass. Actual cumulative churn1,308/1,500lines across11paths. Full outputs and limits: [build-completion.md](build-completion.md). Actual audit/ship have not run.

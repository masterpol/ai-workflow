# Build-start proposal: token-time-report

Plan and impact approved by owner on 2026-10-21. Build startup returned ready for Codex with configured Claude/OpenCode workers. Owner approved build start on 2026-10-21 (“Approve”). Build Run: `run_3de93fe9dd4a`, coordinator `term_1cbc70ba-633b-4237-a76c-881b1335ba38`; earlier shape Run retained.

## First action after build-start approval

Bind a build Run for this same pitch; retain the earlier shape Run evidence. Dispatch S1 to Claude Sonnet (`claude-sonnet-5-5`) using the existing supervised dispatch library. OpenCode model selection remains unsupported on the inspected runtime; no retry of that route.

S1 exclusively owns four new files under ai-framework/scripts/: flow-join.mts, flow-join.test.mts, flow-report.mts, flow-report.test.mts. It delivers the read-only joined JSON preview, source validation and guarded snapshot behavior. Estimated 700 changed lines. No collector, hook, schema, renderer, state page or release metadata changes in S1.

The worker reads the approved plan, pitch, relevant rules and test strategy. It shares this checkout and must not revert other work or edit workflow records. Completion requires its own worker_done, independent diff inspection, and coordinator rerun of the S1 tests. The scope remains incomplete until evidence passes.

Required exit: `node ai-framework/scripts/run-tests.mts --runtime node ai-framework/scripts/flow-join.test.mts ai-framework/scripts/flow-report.test.mts`. Follow the approved behavior cases and test-strategy coverage evidence. S1 completion returns to the big-batch per-scope confirmation gate before S2.

## Gate

Approve starts S1; Revise changes the proposal; Back returns to planning; Stop leaves the work unstarted. Source: workflow overview /build start row is gated for big-batch; build phase says “Big-batch, bug-fix and hotfix confirm at /build start”.

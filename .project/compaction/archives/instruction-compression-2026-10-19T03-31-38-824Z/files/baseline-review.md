# S1 baseline decision — 2026-10-18

**State:** approved by the user on 2026-10-18. S1 continues under the bounded revision below; prompt changes still require the fresh matched-loading baseline.

## Result

The complete-context experiment produced 31 responses per vendor, scored independently by Orca attempt `ic-context-scorer-20261018-a1` / `ctx_788e1af94d54`. The coordinator checked row/criterion completeness and inspected the disputed responses. The scorer returned `readyForCompression: false`.

| Vendor | Satisfied criteria | Failed criteria | Unverified criteria | Rows with every criterion scored 1 |
|--------|--------------------|-----------------|---------------------|------------------------------------|
| Claude | 116 | 4 | 4 | 25 / 31 |
| OpenCode | 82 | 20 | 22 | 14 / 31 |

These are criterion scores for decision responses and limited loading observations, not counts of passing end-to-end executions. Codex remains unverified; Cursor CLI is unavailable. The frozen dataset has 124 expected/forbidden criteria per vendor. A forbidden criterion scores 1 when the forbidden behavior is avoided.

Claude's four failures concern independent command reruns, cited-code checks and the depth of replacement-validator proof (`review-independent-evidence`, `review-nonsecurity-evidence`, `validator-replacement`). OpenCode also omits mode inheritance/raw-text details, some Orca recovery/Run-recording steps, golden-case requirements and missing-owner handling. Its phase-loading statements are not backed by a provider tool trace. Neither experiment establishes reviewer-specific guard snapshots or native installed-project behavior. These are observed response omissions and fixture limitations; no source defect has been demonstrated from them.

Native Claude Skill(build/audit/ship) calls and reads of all three phase owners, overview and Orca contract precede the answers. However, the brief requested those reads up front, so this does not prove that an ordinary invocation discovers the applicable owners on its own or reduces loaded context. OpenCode completed successfully with Kimi K2.7 Code, but its clipped terminal fallback cannot prove its reported reads. Additional identical batches would not resolve these design gaps.

## Evidence and verification

Ignored evidence directory: `.project/metrics/instruction-compression/build-baseline/`.

- Original second-run completions/traces: `claude-complete-context.*.json`, `opencode-complete-context.*.json`.
- Independent original completion and parsed scores: `independent-score-complete.delivery.json`, `independent-score-complete.json`; completeness/count check: `score-summary.json`.
- Honest incomplete machine report: `baseline-incomplete.json`. Required-mode validation exits **1**, as intended, with failures and unverified executed criteria; output: `baseline-required-rejected.log`. It is not installed as an accepted `baseline.json`.
- All 23 frozen source hashes, including the dataset, remain unchanged. Dataset SHA-256: `cbed726e3995b48607de258523eec66b1d7106bac72475515b2d4430473898b6`.
- Shared structural checks: Node 81 passed / 0 failed / 1 explicit live skip; Bun 22 passed / 0 failed / 1 explicit live skip. Existing full-suite baseline: 1,672 passed / 0 failed / 2 existing skips. Setup validator READY (23 checks), graph CLEAN and diff whitespace check passed.
- New test-only preparation is 331 lines. Together with the 478-line dataset, current implementation churn is 809 / 1,500 lines. No version bump or compression completion is claimed.

## Recommended bounded revision: S1 only, with explicit evidence limits

Approve this disposition only if a narrower, partly observed pilot is acceptable. It changes the approved evaluation contract; it does not change workflow permission, confirmation, completion or ownership rules.

1. Keep the 31 frozen inputs, criteria and original baseline artifacts. Record the listed baseline failures as pre-existing response behavior, not fixed behavior. Require independent scoring of all 31 after S1 and **no new failure or loss of previously verified criteria** against the same-vendor baseline. Never average away a regression. Do not describe retained failures or unverified criteria as passes.
2. Make Claude the required native-loading target for this S1 pilot. Keep OpenCode as an explicitly limited decision-response target, retaining its failed/unverified criteria. Codex, Cursor and OpenCode owner-loading coverage remain visible limitations. This is an explicit reduction from the original available-target proof requirement.
3. Before editing prompts, capture a fresh matched Claude build-loading pair for routine/off and enabled scenarios, using native Skill activation and scenario state without preloading all owner documents. Preserve actual ordered read events, source hashes and bounded measurements. Repeat the identical pair after the change. The build owner and applicable gate/Orca sections must be observed before dependent decisions. Missing observations still block this narrowed S1.
4. Require all build gate/refusal/ownership decisions exercised by the changed slice to pass. Retain structural proof of required sections, absent-owner failure, Cursor presence/parity, lite-card handling, refusal semantics and the disposable installed layout. Reviewer command execution and installed-project native activation remain unverified; structural tests do not replace them.
5. Update the explicit evidence checker only after this revision is approved, so it distinguishes the approved required slice, known baseline failures and unverified coverage. Preserve all negative evidence-integrity tests. Do not simply disable the failing command or turn missing evidence into success.
6. Keep the implementation file/line boundary, unchanged banners and all existing workflow contracts. Report actual context measurements separately from wrapper words; no savings claim if measurements are unavailable or do not fall. S2 and S3 stay unstarted until S1's evidence gate, where their feasibility and remaining budget are reconsidered.

This revision would support a limited S1 comparison. It would not establish lossless behavior across all vendors, repair the baseline reviewer omissions, or satisfy the original full behavioral-proof contract.

## Choice

**Approve** the bounded revision above; **Revise** the evidence/scope tradeoff; **Back** to planning with the original complete baseline requirement intact; **Stop** and preserve this checkpoint.

Why approval is required: approved [plan.md](plan.md), “S1 — Build and shared proof,” says “Stop for a scoped revision if native activation or observation cannot be demonstrated”; its result protocol says baseline failures require resolution or explicit disposition before compression. The [build skill](../../../.claude/skills/build/SKILL.md) requires logging plan drift, while the big-batch scope gate remains human. This is a substantive proof reduction, not routine permission to continue an already approved correction.


## Approval — 2026-10-18

The user replied “Approve” to this bounded S1 disposition. Its explicit baseline-failure acceptance and evidence limitations supersede the original S1 all-pass/native-vendor requirements only as stated above. The original records and failed scores remain intact. S2 and S3 remain unstarted; their gates and all workflow safety semantics are unchanged.

# S1 completion evidence — 2026-10-18

**State:** S1 implementation, amended exits and evidence approved by the user on 2026-10-18. S2 preparation is underway; no audit/ship prompt has changed.
**Governing revision:** [baseline-review.md](baseline-review.md), explicitly approved by the user. This is limited evidence, not all-vendor lossless equivalence.

## Change and ownership

Build wrapper: **1,314 → 489 words**, 71 → 27 lines. Cursor is byte-identical, and the caveman banner is byte-identical to the frozen baseline. Audit/ship wrappers, native adapters, overview, runtime, optional integration owner and third-party packages are unchanged. Version **2.31.5** was recorded through `/changelog` after workflow-doctor passed; no commit, merge or publication occurred.

| Removed wrapper detail | Retained owner/load point |
|------------------------|---------------------------|
| Context, generic/project rules, standalone card, scope execution | `2-build.md`, Per-scope inner loop; wrapper requires this before the first scope and directly retains the generated-companion pointer required by workflow-doctor |
| Current-session evidence, exit output, test strategy | Verification-before-completion (hard rule); transferred test-strategy prerequisite |
| Three strikes, hill/log discipline, role models and parallel constraints | Three-strike rule, Parallel subagents, Stuck-uphill detector, log.md and deviations.md discipline; before first scope |
| UI, bug-fix and output/transition details | Applicable phase sections; Output/Confirmation gate/Transition before completion |
| Appetite applicability and rollback-start gate | Unchanged overview Adaptive confirmation gate rows, loaded before gate decisions |
| Startup/off/bypass/refusal semantics | Short wrapper bootstrap plus existing integration Automatic start and CLI/refusal owner; detailed integration reads remain conditional |
| Assignment, overlap, liveness, OpenCode port, collection and reconciliation | Existing Dispatch core/Reconcile core, Codex startup and OpenCode-port sections at their corresponding operation; phase owner retains runtime-version unknown-liveness, bounded worker text and independent rechecks |

The obsolete wrapper shorthand “hotfix … audit deferred” was not copied into an owner: the existing overview already requires one audit pass for hotfix. Its governing gates and observed hotfix decisions remain unchanged; no new hotfix behavior is claimed.

Contract A now enumerates all six consumers and validates the actual refusal owner, without filtering away absent consumers. E/M validate the build loading pointer before checking substantive owner requirements, and retain entry conflict checks. All 14 contracts remain. Negative fixtures cover missing consumers/owners/sections/Cursor copies, parity drift, forbidden exit-3 fallback and missing lite-card handling. A physical installed-layout fixture passes without `.project`, eval data, registry or external packages.

## Native observations and scoring

Claude native Skill activation and phase-owner/gate reads precede both matched decisions. Off avoids integration-detail reads and advances without an extra gate. Enabled reads the relevant refusal contract, stops and asks fix versus an explicit per-call bypass. Independent scorer `ctx_1c6d2964559d` accepted the loading pair. Reads are requested through the native entry references; no explicit owner-file checklist was supplied. The earlier no-full-activity pair and superseded candidate attempts remain separate incomplete/diagnostic artifacts.

| Scenario | Baseline observed source words | Candidate observed source words | Observed tool calls | Observed interval, baseline → candidate |
|----------|--------------------------------|---------------------------------|---------------------|------------------------------------------|
| Orca off | 2,682 | 2,043 | 5 → 5 | 11,150 → 11,690 ms |
| Already-refused enabled operation | 3,007 | 2,575 | 6 → 6 | 13,423 → 12,669 ms |

These are unique source words requested through Skill and observed Read ranges. They exclude system/hook context, tool framing and repeated grep output. Timing spans the first native Skill call to completion send, not complete provider latency. One sample per scenario, model-chosen read ranges and clipped traces limit interpretation. Observed source context fell; no total-token, cost or general latency improvement is claimed.

All 31 frozen cases and all 124 criteria were independently scored per vendor:

| Vendor | Baseline satisfied / failed / unverified | Candidate satisfied / failed / unverified | New regression |
|--------|-----------------------------------------|------------------------------------------|----------------|
| Claude | 116 / 4 / 4 | 118 / 2 / 4 | 0 |
| OpenCode | 82 / 20 / 22 | 86 / 16 / 22 | 0 |

OpenCode native owner loading remains unverified (terminal fallback); Codex remains unverified and Cursor CLI unavailable. Reviewer guard snapshots, installed-project native effects and other real runtime effects remain unverified. Apparent score improvements are single-run observations, not repaired-source claims. Known baseline failures remain failures.

Claude's original completion contains full vectors. The OpenCode observer's authoritative completion gives an exact score delta: four named expected criteria improve from 0 to 1, all other known zeros and all nulls stay unchanged, with no new regressions. The coordinator expanded that explicit delta over the frozen vector and checked the four cited responses. The normalized score record explains this transformation; it adds no new scoring judgment. Original completion bodies remain intact.

Planned result records are [baseline.json](../../evals/runs/instruction-compression/baseline.json) and [build-candidate.json](../../evals/runs/instruction-compression/build-candidate.json), with hash-checked evidence under their `evidence/` directory. Original traces, source snapshots and command logs remain under ignored `.project/metrics/instruction-compression/build-baseline/`. The approved policy pins the original score-vector hash; default strict mode still rejects that incomplete baseline. The amendment applies only to baseline/build, and rejects new failures, lost verified scores or hidden existing zeros.

## Current-session verification

Shared Node structural command across the five planned test files: exit 0. Bun contracts/loading command: exit 0. Setup validator: exit 0, READY, 23 checks; its workflow-doctor checks passed. All 125 TypeScript entries parse. Graph: CLEAN, 81 entries / 227 links. Changelog check and `git diff --check`: exit 0.

Complete Node suite (including nested runtime and hook files), exit 0:

```text
ℹ tests 1684
ℹ suites 32
ℹ pass 1681
ℹ fail 0
ℹ cancelled 0
ℹ skipped 3
ℹ todo 0
ℹ duration_ms 282944.368834
```

The skips are the two pre-existing platform/runtime skips plus the explicit live-mode test in the normal suite. Missing required inputs fail in child-process checks. No new skip was used to hide a required check. A later report-path hardening and test-only assertion/count refinements were verified by the focused Node/Bun proof and explicit live commands below; no production script changed.

Required amended evidence command, exit 0 on Node and Bun:

```sh
IC_EVAL_REQUIRED=1 IC_EVAL_POLICY=s1-approved-2026-10-18 IC_PHASE=build IC_EVAL_BASELINE=.project/evals/runs/instruction-compression/baseline.json IC_EVAL_REPORT=.project/evals/runs/instruction-compression/build-candidate.json node --test ai-framework/scripts/instruction-loading.test.mts
```

Node required-mode tail:

```text
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 543.187167
```

Focused Node contracts/loading: 23 passed / 0 failed / 1 explicit live skip. Explicit required-mode Bun contracts/loading: 24 passed / 0 failed / 0 skipped. Default shared Node: 82 passed / 0 failed / 1 explicit live skip. Coverage percentage is not asserted: this adds a test file, not a production utility; negative mutations and real required-mode execution are the relevant proof. The earlier empty coverage aggregate is not evidence.

All accepted Orca attempts have their own processed completion and settled local ledger. The Run has no reclaimable workers; runtime-retained user-owned terminals were preserved. The graph and unrelated toon-machine-data edits were not reverted.

## Size and gate

Eight implementation paths, **1074 added+deleted lines of 1,500**, including the 478-line dataset, Cursor copy and version history. Evidence/planning records are separate. The original 14-path boundary remains intact; no optional fifteenth file was needed. **426 lines remain**; S2/S3 estimates total about 420, leaving little margin. Reconsider their scope/budget at this gate before further implementation.

**Approve** S1 evidence and choose the next bounded slice; **Revise** S1; **Back** to planning; **Stop**. This completion does not start S2, audit, ship or a commit automatically.


## S1 scope approval — 2026-10-18

The user replied “Approve” to the S1 evidence gate. Recorded as acceptance of the completed bounded proof and its stated limitations. The S1-only evidence exception is not extended implicitly to audit or ship; feasibility and an explicit remaining-scope disposition are prepared before their prompt edits.

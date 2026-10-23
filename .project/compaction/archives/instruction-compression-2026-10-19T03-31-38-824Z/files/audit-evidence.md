# S2 evidence — 2026-10-18

**State:** S2 implementation and amended exits complete; awaiting its big-batch scope approval. S3 has not started.
**Governing amendment:** user-approved [remaining-scopes.md](remaining-scopes.md). This is bounded pilot evidence, not all-vendor behavioral equivalence or an actual workflow audit.

## Change and clause ownership

Audit wrapper: **941 → 468 words**, 91 → 28 lines. Cursor is byte-identical and the caveman banner matches the frozen baseline byte for byte. The phase owner `3-audit.md`, native adapters, overview and Orca integration owner retain their baseline hashes. Version **2.31.6** was recorded through the existing changelog script. No commit, merge or publication occurred.

| Removed wrapper detail | Retained owner and applicability |
|------------------------|----------------------------------|
| Entry trigger, role triggers/profiles and constrained context | Wrapper retains completed-build trigger; `3-audit.md`, Subagent fan-out before dispatch; generic/project companion pointer retained |
| Finding severity, file/line, rule and concrete failure evidence | Finding contract (every subagent), before dispatch |
| Explicit models, scratch/guard, limits, independence, canary and unfinished reviewers | Reviewer contract (every dispatch), before dispatch |
| Verify before triage, confirmed/unconfirmed/refuted handling | Verify before triage (main thread) and Measurement over assertion, before triage |
| Required-review completion and retry rule | Incomplete reviews, before triage/synthesis; wrapper directly states unfinished required reviews keep audit open |
| Synthesis, triage tiers and evidence after fixes | Synthesis (single-threaded, main thread), Triage tiers (not negotiable), Evidence rule (same as /build), before triage/synthesis |
| Appetite cycle limits and escalation | Loop discipline and Adaptive gate; no unconditional three-cycle permission |
| AI eval and concurrent-pitch obligations | Eval gate (AI changes — hard) and Cross-pitch conflict check, on their existing triggers |
| Output, confirmation and transition | Named phase sections plus overview Adaptive confirmation gate, row /audit end, before advancement |
| Off/bypass/start/refusal and worker boundaries | Short wrapper bootstrap keeps actual vendor/raw arguments, worker distinction, explicit per-call bypass and refusal-stop behavior |
| Reconcile command, fixed named checks, admission, verification and cleanup | Phase Optional Orca multi-agent and integration Reconcile core plus CLI, grader and live-smoke status before applicable enabled operations; already-refused path reads refusal contract and stops |

No unique removed clause needed transfer: existing owners already contain the substantive requirements. The added required-owner guard makes missing owner files/sections stop explicitly; only optional project companions may be absent.

Contract I/L now validates the canonical pointer, named owner sections and before-triage loading, then checks the substantive owner. All 14 existing contracts remain, including six-consumer refusal coverage and old conflict guards. Separate mutations detect omitted incomplete-review loading, missing owner failure guard, finding evidence, reviewer section, cycle cap and absent/mismatched Cursor copies. The disposable installed layout passes without `.project`, local evals, registry or external packages.

## Failed candidate retained

The first 445-word candidate was rejected. Independent OpenCode grading found omitted hotfix start approval, optional treatment of a missing required owner section, and known owner-loading zeros relabelled null. These were not accepted or hidden. Raw responses and grades remain under ignored `s2-preparation/` and `build-baseline/s2-*` records.

The source correction adds the required-owner failure guard and its removal mutation, then repeats the matched native pair and all 31 cases through both executable targets with fresh independent graders. The unrelated hotfix owner was not edited to tune the sample. No dataset, frozen baseline vector or threshold changed. Known baseline failures stay failed until observed resolved; an unavailable loading observation does not erase them.

## Native observation and measurement

Earlier unchanged-source baseline attempts returned `session_not_reported` and empty terminal fallback. They remain unverified. The approved bounded recovery captured new Claude provider transcripts while workers paused at a neutral observation checkpoint after reads and before deciding. This restored observable evidence for these attempts; it does not establish an Orca code fix or explain the older missing session binding.

Baseline off/enabled attempts: `ctx_89b6be26ec2b` / `ctx_45c942c831a5`. Corrected candidate off/enabled: `ctx_d2fb0f619952` / `ctx_6671f9b59778`. Exact native Skill(audit) and phase-owner reads precede each decision. Candidate reads include the governing overview gate; enabled also reads the CLI refusal contract. Off keeps the incomplete security review open; enabled additionally stops on `authorized-paths-overlap`, asks fix versus explicit invocation bypass and holds further dispatch. No real reconcile or reviewer fan-out was exercised.

| Scenario | Baseline observed source words | Corrected candidate | Tool calls | Observed interval |
|----------|--------------------------------|---------------------|------------|-------------------|
| Orca off | 2,999 | 2,780 | 4 → 6 | 28,515 → 52,986 ms |
| Already-refused enabled operation | 4,655 | 3,968 | 8 → 9 | 53,175 → 56,070 ms |

These count unique source lines requested through native Skill and observed Read ranges, excluding repeated grep output, system/hook context and tool framing. They are a source-context proxy, not total tokens or complete loaded context. The wrapper text inside the Skill event is clipped, so native activation is observed while full wrapper delivery is inferred. Model-chosen ranges differ. Both timings include observation asks and coordinator waits; no cost or latency improvement is established. The old baseline omitted overview reads; that omission remains unverified and is not credited retroactively.

Independent Claude scorer `ctx_7084d0836fa2` accepted the corrected pair with no required loading gap for reached actions. Its note inaccurately suggests the CLI exit table lies beyond the enabled read range: coordinator inspection confirms lines 331–410 include the exit table and refusal bullets. Preserve the original note and this correction; no score changes follow. Dispatch/automatic-start details were not required for the already-refused operation.

## Verification and budget

The shared five-file Node structural run exits 0: **84 total, 83 passed, 0 failed, 1 explicit live skip**, 26,081 ms. Focused Bun contracts/loading exits 0: **24 passed, 0 failed, 1 explicit live skip**. Setup validator exits 0: READY, 23 checks including workflow-doctor, 125 TypeScript entries parse. Graph check: CLEAN, 84 entries / 240 links. Changelog check and `git diff --check` exit 0. Other concurrent pitch/knowledge changes are preserved. The complete suite is reserved for wave end; S1's earlier full-suite result is not a current S2 full-suite claim.

Cumulative implementation: **10 paths, 1,286 added+deleted lines of 1,500**, including the unchanged 478-line dataset, mirrors and version history. The 14-path boundary remains. **214 lines remain**; S3's 180-line estimate leaves 34 lines of projected margin and must be refreshed before its edits.

Raw observations, exact completion bodies, hashes, command logs, final-size.json and final-matched-measurements.json are under ignored `.project/metrics/instruction-compression/`. Original baseline and S1 candidate records remain unchanged.


## Independent result and required evidence checks

All **31 frozen cases / 124 criteria per vendor** were independently scored, with full vectors in each grader's own authoritative completion. Fresh final subjects: Claude `ctx_4d788e8ee99d`, OpenCode `ctx_ce687c0ab8f8`. Fresh graders: Claude target `ctx_7084d0836fa2`; OpenCode target `ctx_4c6a9f75b911`. The coordinator checked exact case order, criterion counts and criterion-by-criterion comparison against the immutable wave baseline; no score was inferred or altered.

| Target | Baseline satisfied / failed / unverified | Corrected S2 satisfied / failed / unverified | New regression |
|--------|------------------------------------------|---------------------------------------------|----------------|
| Claude | 116 / 4 / 4 | 116 / 4 / 4 | 0 |
| OpenCode | 82 / 20 / 22 | 86 / 16 / 22 | 0 |

The four OpenCode improvements are single-run decision wording observations, not claims of repaired runtime effects. Sixteen failed criteria and 22 unverified criteria remain. Native OpenCode loading is unverified because its observed source is clipped terminal fallback without exact read events. Codex remains unverified; Cursor CLI remains unavailable. Real reviewer guard snapshots, installed-project native effects and actual runtime changes remain unverified. Full-case Claude reads were batched before responding, so the matched native pair provides the separate ordered loading proof; applicability-point loading in real tasks is not established.

New [audit-candidate.json](../../evals/runs/instruction-compression/audit-candidate.json) references hash-checked raw responses, observed tools, independent grades, original completions and paired traces under `evidence/`. The rejected first candidate is retained separately. Frozen dataset, baseline.json and build-candidate.json were not overwritten. Current six-source manifest SHA-256: `f2e7a816a2d31cfdb9963c84cb4ee3718edeb97f5048c5cde64e023bfd3d35b4`.

Required amended command exits **0** on Node: **11 passed / 0 failed / 0 skipped**. Bun contracts plus required live mode exits **0**: **25 passed / 0 failed / 0 skipped**.

```sh
IC_EVAL_REQUIRED=1 IC_EVAL_POLICY=remaining-approved-2026-10-18 IC_PHASE=audit IC_EVAL_BASELINE=.project/evals/runs/instruction-compression/baseline.json IC_EVAL_REPORT=.project/evals/runs/instruction-compression/audit-candidate.json node --test ai-framework/scripts/instruction-loading.test.mts
```

This checks evidence integrity and the explicit no-new-loss policy; independent scoring judges the recorded decisions. Default strict policy is unchanged and still rejects the incomplete baseline. S1's selector cannot authorize audit/ship; the separately approved remaining selector cannot authorize build. Missing reports fail rather than skip.

All accepted S2 completions, including the rejected candidate's scoring, are processed and locally settled. Orca reports **0 reclaimable resources**, 28 released and 20 runtime-retained terminals across the Run. Retained/user-owned terminals remain preserved. Coordinator delivery inbox is empty.

## Scope gate

**Approve** S2 evidence and proceed to bounded S3 preparation with its refreshed budget; **Revise** S2; **Back** to planning; **Stop**. This is the mandatory big-batch per-scope gate in the approved plan and workflow overview. It does not approve build-end, actual audit, ship, a commit or publication. S3 remains unstarted until this gate is answered.


## S2 scope approval — 2026-10-18

The user replied “Approve” to S2 completion evidence. S2 is accepted with its recorded limits. S3 preparation, refreshed budget and native pre-edit observations may proceed; later scope/build-end/audit/ship gates remain.

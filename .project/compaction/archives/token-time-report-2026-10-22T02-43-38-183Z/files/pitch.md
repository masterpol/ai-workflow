# Pitch: token-time-report

**Date**: 2026-10-21 • **Appetite**: big-batch (≤15 files / ≤1,500 LOC / ≤1 week; projected 11 files / about 1,300 LOC)
**Stack**: deterministic local reports; no AI-prompt scope.

## Problem

The owner cannot inspect tokens and active/wait time together by pitch, phase and scope. Separate reports hide attribution gaps and suggest comparisons that incomplete coverage cannot support.

## Knowledge consulted

Graph searched first; source/live checks and review dispositions: `shaping-evidence.md`. Original seed preserved separately.

- Token dimensions decision: name units; unavailable is not zero.
- Metrics lease decision: one acquisition, fail closed.
- Display-bucket identity pattern: never match lossy buckets.
- Shared-reader refusal and report-ownership lessons: preserve source states and user files.
- Directory-pinning and label-validation patterns: guard reads, publication and output. Exact knowledge paths appear in the critique artifacts.

Rules consulted: security, observability, data-modeling. No stack companions beyond README.

## Solution sketch

**Places/affordances**: `flow-report.mts` previews JSON/Markdown/HTML; explicit apply publishes owned `.project/metrics/flow-report.{json,md,html}`. `/state` links an existing report without generating it.

**Connections**: guarded token-v3 and usage-v2 copies, taken under one lease, feed a pure joiner and bounded pitch/phase/scope tables. Keep inputs read-only. Match exact canonical components using Map/null-prototype maps. Never match `(other)`, `(unknown)` or `(unattributed)`; `(none)` means no scope. Preserve one-sided rows and each store's overflow totals.

Show vendor token rows with reported-usage coverage and units; timing remains cross-vendor. Use stored union durations, never summed child durations. Disclose pending/provisional intervals, freshness, since dates, capture health, excluded counts and truncation. Wait is a lower bound of elapsed time between turns. Show pitch transitions and bounded trace.

Missing/refused sources remain distinct; missing usage is null. Effort and component-based ratios are unavailable: flow leaves lack the fields. Different capture windows forbid time-efficiency and shipped-pitch ratios. Reuse existing `state.json` history by exact slug with freshness/availability; never reparse records.

## Rabbit holes

- **Resolved**: prerequisites shipped; live timing exists for one named pitch, so coverage remains sparse.
- **Resolved**: no schema expansion or global-dimension allocation into flows.
- **Plan, joiner owner**: pin canonical eligibility, caps, asymmetric folds, legacy inputs, open intervals and stale history; require boundary fixtures.
- **Plan, report owner**: reuse exported `readText`/`readWorkflowState` with a report-local flow validator; avoid collector extraction; retain refusal semantics; pin directories across lease/publication; replace only marked generated files; recheck destinations. Require injected-swap, user-file and hostile-key tests across formats. Split before exceeding appetite.
- **Deferred**: comparable-window ratios require separate capture work.

## No-gos

No collectors/hooks/prompts, schema migration, backfill, journals/transcripts, estimates, productivity rankings, record re-parsing, historical edits, or implicit generation in `/state`.

## Critique findings

Four Orca perspectives complete. K1–K8/S1–S3: guards above. A1–A5: 11-file/about 1,300-LOC budget, inline fixtures, no collector extraction; split if plan cannot fit. X1–X3: receiving-project rollout stays separate; serialize release files at ship; injected lease tests avoid live-port flakes. Review details and recovery evidence are adjacent. No golden AI eval required.

## Bet decision

**Bet selected by owner, 2026-10-21** (“bet”). Critique dispositions and the bounded report scope above are carried into `/plan`.

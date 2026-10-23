# Source-review supplement: independent-rereview-catch-up

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/independent-rereview-catch-up.md) for the 2026-09-27 independent re-review pitch. Counts below are historical shipping evidence, not tests rerun during this review.

## Reviewer protocol rationale

Critique found that code-reviewer and test-coverage-checker were pinned to a small model and that the earlier shallow state review came from that agent, so every dispatch carried an explicit model. S1 used opus for three security dispatches (a, d, e) and sonnet for two code reviews (b, c); S2 used sonnet for dispatches a to c and opus for d and e; S3 used sonnet throughout. Shipped code has no diff and diff-only reviewers skip unchanged code, so prompts named whole files; security-reviewer holds write tools, so proofs of concept ran only in scratch copies. The reviewer contract now lives in the [audit phase](../../../ai-framework/workflow/phases/3-audit.md). The compaction-gate fix for bare-prefix slug matching was verified with adversarial slug pairs rather than skipped.

## Compaction review detail

Beyond the compact summary, S1 fixed: a remove step that never recomputed required sections or re-checked destinations (a hand-placed ledger opened the deletion gate), a graph check that executed the project's own script, archive and restore following symlinks and hanging on a FIFO, duplicate or non-ASCII headings collapsing section keys, a quadratic heading pattern, and exact-text matching that had already let a real ledger omit its No-gos section. One transaction-context mismatch stayed with path-safety-hardening and ledger content binding went to followups. Related lesson: [a gate must not trust its own author](../../knowledge/patterns/a-gate-must-not-trust-its-own-author.md).

## Metrics and state review detail

S2 found that a newer snapshot schema was overwritten as if absent, that a FIFO at the modes file hung the hook and left the metrics lock held, that malformed stored rows wiped history, and that the decision entry's bounded-snapshot claim was false. Fixes made token counts whole numbers, scoped model notes by vendor, bounded stdin and event names, and kept rejected snapshots aside. Not fixed: unbounded plugin scope labels, a shared key for undefined session ids, the lstat-to-read race (needs no-follow, non-blocking open and fstat) and any run against a real GFM renderer. S3 fixes used a realpath containment helper, fact filtering before render, a 500-character leaf bound and a shared root resolver. Design records: [metrics](../../knowledge/decisions/token-metrics-dimensions-design.md), [state report](../../knowledge/decisions/project-state-report-design.md); lesson: [a gate must not audit its own instrument](../../knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md).

## Historical inconsistencies

Source claims of must-fix-only changes conflict with lower-tier fixes in S1, S2 and S3. The claim that every canary was caught coexists with S3a lacking one and three refused canary attempts, and the S3 record still reads independent with a caught canary. S3 had no guard snapshot, against a claim of comparisons for every dispatch. A log line says overlapping pitches were reported stable while guards flagged their writes during dispatches. Per-scope test counts (75 and 79) differ from shared-suite counts (160 and 244); the 268 total uses the former. Plan limits (four files per slice, nine cumulative, fifteen total, three dispatches per slice) were superseded by the approved raises and five dispatches each. The reviewer contract was marked a first pass to amend after S1 to S3; no amendment is recorded. Treat these as historical, and compare with [open followups](../../pitches/_followups.md) before calling any current.

Whole files left out of the ledger: fifteen one-shot reviewer dispatch prompts (the reusable template lives in the audit phase and each review record keeps its prompt hash) and the hill chart, whose file table duplicates the shipped record and log.

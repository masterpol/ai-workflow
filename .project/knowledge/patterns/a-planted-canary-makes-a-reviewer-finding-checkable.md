---
id: a-planted-canary-makes-a-reviewer-finding-checkable
type: pattern
created: 2026-10-20
updated: 2026-11-25
tags: [audit, subagents, verification, canary]
related: [reviewer-reports-contradicted-by-measurement, archify-renders-the-state-report, a-gate-must-not-trust-its-own-author, review-guard-hashes-ignored-secret-files]
source: state-ai-authoring
confidence: low
---

# Pattern: plant the defect in the scratch copy so a reviewer's "must-fix" can be refuted or confirmed mechanically

## Summary

Audit reviewers are given a scratch copy with one planted defect (`review-bench prepare --canary`). When two reviewers returned a BLOCK "must-fix" at exactly the canary lines, the main thread did not have to judge the finding: it compared the cited line in the scratch copy with the live file (`>=` and `MODEL.test` present live), ran the live tests (62 pass) and ran `review-bench canary-check` (caught). Each also noticed the copy differed from the live file, which is the honest way to flag it.

## How to apply

Plant one canary per judging role, keep the manifest out of the prompt, store the prompt and its SHA-256, and triage a finding at a canary line as `caught` plus `refuted` against the live code. A BLOCK verdict from a reviewer whose only must-fix is the canary does not block the audit. Make sure a reviewer that can run tests runs them in the scratch copy only, and verify read-only afterwards (the guard snapshot has a size limit once many run directories exist, so an mtime sweep is the fallback).

## Seen again (archify-replaces-state, 2026-11-23)

Three reviewers each got a different canary; two reported it as a must-fix and the third, a test checker, built a whole must-fix on it ("entries never incremented") and a "test and code disagree" finding that was the canary's side effect. All three were refuted against the live file in one step and `canary-check` returned `caught`. The cross-pitch checker reads the live repo, so it cannot take a canary and is recorded `independent: no`; its two "pure overlap" claims still needed a manual check of the cited file, which refuted one. Findings that are the canary's *consequences* (a failing scratch test, a comment the canary added) are easy to mistake for real ones: compare against the live file first.

## Seen a third time (orca-bounded-control-receipts, 2026-11-23)

Each of three reviewers reported its own canary as a must-fix (a loosened regex, a wrong limit ladder, a dead `if (false)`), and the test reviewer first ran its mutants on a red baseline, so a mutant that broke the same test looked "killed". It patched the canary out of its base before mutating, which is the right move; a reviewer that does not will report survivors and kills it cannot tell apart. The two real survivors it found were then re-run as mutants on the live code before being believed.

## Seen a fourth time (package-less-ship-verification, 2026-11-25)

Two limits showed. A canary that also breaks tests is found by running the suite, so it proves a reviewer reached the code, not that reading would
catch such a defect. And "review only the scratch copy" is a prompt rule, not a barrier: one reviewer that shared the repository checkout compared
its scratch file with the live one and read the other reports, so it was recorded `independent: no`. `canary-check` also answered `false` for a
report that cited the file by an alias it had defined; ask reviewers to cite full file names.


---
id: a-planted-canary-makes-a-reviewer-finding-checkable
type: pattern
created: 2026-10-20
updated: 2026-10-20
tags: [audit, subagents, verification, canary]
related: [reviewer-reports-contradicted-by-measurement, a-gate-must-not-trust-its-own-author, review-guard-hashes-ignored-secret-files]
source: state-ai-authoring
confidence: low
---

# Pattern: plant the defect in the scratch copy so a reviewer's "must-fix" can be refuted or confirmed mechanically

## Summary

Audit reviewers are given a scratch copy with one planted defect (`review-bench prepare --canary`). When two reviewers returned a BLOCK "must-fix" at exactly the canary lines, the main thread did not have to judge the finding: it compared the cited line in the scratch copy with the live file (`>=` and `MODEL.test` present live), ran the live tests (62 pass) and ran `review-bench canary-check` (caught). Each also noticed the copy differed from the live file, which is the honest way to flag it.

## How to apply

Plant one canary per judging role, keep the manifest out of the prompt, store the prompt and its SHA-256, and triage a finding at a canary line as `caught` plus `refuted` against the live code. A BLOCK verdict from a reviewer whose only must-fix is the canary does not block the audit. Make sure a reviewer that can run tests runs them in the scratch copy only, and verify read-only afterwards (the guard snapshot has a size limit once many run directories exist, so an mtime sweep is the fallback).

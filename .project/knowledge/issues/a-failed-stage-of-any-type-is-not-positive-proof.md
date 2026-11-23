---
id: a-failed-stage-of-any-type-is-not-positive-proof
type: issue
created: 2026-11-23
updated: 2026-11-23
tags: [orca, dispatch, retries, receipts, fail-closed, security-review]
related: [retry-only-on-positive-proof-of-a-clean-failure, a-receipt-field-reaches-a-reason-only-as-a-bounded-token, orca-model-preflight-can-leave-unproven-ledger-ownership, capture-the-real-receipt-before-designing-recovery]
source: orca-api-currency-and-opencode2
severity: medium
resolved: true
---

# Issue: a `failedStage` that was not a string read as "no failed stage", so an empty residual list looked cleanly retryable

## Summary

Dispatch read a start failure's stage only when it was a string. A receipt with `failedStage: {}` (or a number or a list) and an empty `residualResources` list was therefore classified as a clean failure and retried, possibly while the first worker still existed. The same logic was already at `HEAD` and was found by an independent security review at the audit of `orca-api-currency-and-opencode2`.

## Fix

A failed stage of any type, other than absent or null, now keeps ownership as `unknown-liveness` with no automatic retry; only a string stage that matches the token shape is reported. Regression test `a failed stage of any type is never positive proof` fails without the fix and passes with it (6 stage shapes, one launch each).

## Lesson

Positive proof is a conjunction of explicit facts (an empty list and no stage of any kind). A field that is present but unparseable is evidence of an unknown outcome, not of absence. A cycle-2 re-check reintroduced the defect as a canary and the narrow security review caught it again.

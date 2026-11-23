---
id: a-receipt-field-reaches-a-reason-only-as-a-bounded-token
type: pattern
created: 2026-11-23
updated: 2026-11-23
tags: [orca, untrusted-output, reasons, security, receipts]
related: [parse-untrusted-values-and-re-emit-them, orca-model-preflight-can-leave-unproven-ledger-ownership, orca-worker-list-concise-view-hides-the-worker-identity-fields]
source: orca-bounded-control-receipts
confidence: low
---

# Pattern: text from a CLI receipt may appear in a reason or an instruction only as a token that passed a strict check

## Summary

Orca's failure receipts are untrusted data. The dispatch adapter reduced a refusal to `launch-failed:unproven` and lost its code; the fix that keeps the code (`launch-failed:refused:<code>`) must not turn the receipt into an echo channel. The same audit found the existing `launch-failed:${failedStage}` line already did: a 100,000-character stage reached the reason unbounded.

## How to apply
- Report a receipt field only if it matches a closed shape (lower-case token, 2 to 64 characters); otherwise report a fixed generic reason and keep the ownership state the same.
- Never echo the message, data or any other field. A test feeds hostile codes (control characters, paths, 65 characters, numbers, objects) and asserts nothing from the receipt appears in the outcome.
- A better reason must never change ownership: the code says why, it does not prove that nothing was created. Assert the ledger state and the second attempt's refusal in the same test.

## Evidence
Security review of `orca-bounded-control-receipts`: the unbounded `failedStage` (existing code) was reproduced and fixed; six mutants of the refusal branch killed.

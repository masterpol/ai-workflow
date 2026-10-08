---
id: rounded-zero-timeout-disables-cancellation
type: issue
created: 2026-10-07
updated: 2026-10-07
tags: [node, subprocess, timeout, security]
related: [guard-tests-can-fail-for-the-wrong-reason, prove-a-guard-test-with-an-in-memory-mutant]
source: orca-vendor-foundation
severity: medium
confidence: low
resolved: true
---

# Issue: rounding a remaining budget to zero disables subprocess cancellation

The preflight had checked that the total remaining time was positive, then floored it for
Node's synchronous subprocess timeout. A remaining fraction below one millisecond became
zero, which disables the timeout instead of enforcing the budget.

Refuse another call when less than one millisecond remains. Test an injected monotonic clock
at the fractional boundary and prove that the runner is never called. The corrected guard
was independently weakened in a disposable mutation run and detected. Keep both per-call
and total budgets: neither replaces the other. This follows
[[prove-a-guard-test-with-an-in-memory-mutant]].

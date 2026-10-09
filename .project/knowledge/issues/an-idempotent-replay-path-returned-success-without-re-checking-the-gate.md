---
id: an-idempotent-replay-path-returned-success-without-re-checking-the-gate
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [gates, audit, idempotency, dispatch, orca]
related: [a-gate-must-not-trust-its-own-author, a-gate-spawns-exactly-what-it-probed, retry-only-on-positive-proof-of-a-clean-failure]
source: fix-orca-dispatch-resume-gate
severity: medium
resolved: true
---

# Issue: an idempotent replay path returned a success-shaped outcome without re-checking the gate

## Summary

`orca-dispatch.mts` `dispatchScope()` read the ownership ledger before it evaluated the launch
gate. When the attempt key already existed, the function returned
`{ route: "resume", reason: "attempt-already-owned" }` and the thin CLI mapped `resume` to exit 0.
A caller that trusts the exit code therefore read "the worker was launched" for an attempt that
was only being handed back for inspection, and it did so even after the policy had been disabled
or the multi-agent switch turned off.

## Symptoms

Found by a live smoke against the installed Orca 1.4.222, not by any test:

1. With `use-orca-orchestration: true`, dispatch once. The launch gate refuses
   (`launch-failed:unproven`) and leaves an `unknown-liveness` ledger entry.
2. Replace the policy with the shipped example (`use-orca-orchestration: false`).
3. Re-dispatch the same attempt id. The CLI exits 0 with `attempt-already-owned`. Nothing spawned,
   and the policy forbids spawning.

A fresh attempt id under the same disabled policy correctly returned
`{ route: "normal", reason: "policy-disabled" }` with exit 3, so the guard was present — it simply
sat below the replay branch.

## Root Cause

The gate was ordered after the idempotency shortcut. `orcaMultiAgentEnabled()` and
`evaluateLaunch()` were read-only, side-effect-free checks, so placing them before the ledger read
would have cost nothing; they were placed after because the replay branch returns early. Ordering
a cheap guard below an early return is only safe when the early return cannot change the guard's
answer.

The wider trap: `resume` and `launched` are both "the caller's work is under way", so both mapped to
exit 0. That mapping is correct while a resume always implies a live gate, and wrong the moment a
resume can be produced after the gate's answer changes.

## Solution

`dispatchScope()` now re-checks the switch and re-evaluates the launch gate before
`resumeExisting()`. A resume is only returned while the current policy still permits the worker;
otherwise the call returns `{ route: "normal", reason }` and the CLI exits 3. The exit-code
mapping is unchanged, because the library no longer produces a success-shaped outcome it cannot
stand behind.

## Prevention

- An idempotency shortcut that returns a success-shaped outcome must re-run the gate it is skipping,
  even when the gate is read-only and cheap.
- When a caller cannot distinguish "it happened" from "go look at it" in an exit code, keep them as
  distinct exit codes and make the library refuse rather than emit the ambiguous one.
- Related: [[a-gate-must-not-trust-its-own-author]], [[retry-only-on-positive-proof-of-a-clean-failure]].

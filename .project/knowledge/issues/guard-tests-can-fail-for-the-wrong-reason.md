---
id: guard-tests-can-fail-for-the-wrong-reason
type: issue
created: 2026-10-07
updated: 2026-10-07
tags: [testing, mutation, fixtures, filesystem]
related: [prove-a-guard-test-with-an-in-memory-mutant, a-gate-must-not-audit-its-own-instrument]
source: orca-vendor-foundation
severity: medium
confidence: low
resolved: true
---

# Issue: guard tests can fail for the wrong reason

A failure is guard evidence only when the intended assertion failed. The foundation's first
mutation scratch copy omitted its relative example fixture, making unrelated reads fail.
Those results were discarded; the complete disposable layout first passed unmodified, then
fifteen weakened guards failed. A descriptor test also spread a native Node Stats object and
lost its prototype methods, allowing refusal for a malformed mock instead of the inode mismatch.
Preserving the Stats prototype restored the intended evidence. Doctor fixtures needed the
normal generated followups artifact as well as copied templates.

Require a passing baseline in the same fixture layout, inspect the failing assertion, and
preserve native-object methods when mocking one field. Keep a zero-read assertion where the
contract requires refusal before opening contents. These findings reinforce
[[prove-a-guard-test-with-an-in-memory-mutant]]; mutation failures caused by absent fixtures
are not counted as detected guards. Existing sandbox socket restrictions are environmental
failures and likewise cannot establish a source regression.

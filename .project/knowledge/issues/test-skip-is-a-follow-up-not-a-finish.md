---
id: test-skip-is-a-follow-up-not-a-finish
type: issue
created: 2026-10-16
updated: 2026-10-16
tags: [testing, followups, skip, contract-changes]
related: [a-gate-must-not-trust-its-own-author, a-pitch-can-pass-its-own-tests-and-break-on-the-real-file]
source: agent-model-sweep
---

# Issue: `test.skip` is a follow-up, not a finish

## Summary

A `test.skip` (or `t.skip()`) on a test that previously passed is a contract change with a
concrete obligation: a future pitch must replace the skipped test with one that exercises the
new contract, or remove the test if the old behavior is genuinely gone. Skipping is a
documentation act, not a deletion.

## What happened

`agent-model-sweep` S1 changed the Orca policy contract: the toon `models` block (and its
`integrations.orca` sub-block) is now authoritative; the legacy `.project/orchestration.json`
is a fallback. The existing `orca-preflight.test.mts` "doctor validates optional local policy
without probing or repairing it" exercised the legacy path under "no orchestration.json +
empty `.project/`". Under the new contract, the seeded example toon's `orca.enabled: true`
made every assertion report `pass` (the toon overrides), so the test could not exercise the
legacy path without significant changes.

The fix path: mark the test `test.skip` with a comment pointing at the pitch's `log.md`, add
the test replacement to the pitch's `SHIPPED.md` followups, and surface the obligation at
`/cooldown`. Skipping the test is acceptable; skipping the obligation is not.

## Failure mode this prevents

- A test that previously asserted behavior X now silently asserts nothing. The CI stays green
  for the wrong reason: a removed contract is not a test failure.
- A future pitch that wants to re-introduce the legacy path has no test to update; the
  regression is invisible.
- The pitch's `/audit` cycle 1 found a real failure (test-coverage M4) that this exact
  pattern would have hidden if the skip had not been explicit.

## Prevention

When a contract change forces a test to be skipped or rewritten:

1. Add a one-line comment on the skip pointing at the pitch's `log.md` or `SHIPPED.md`.
2. Add the replacement / deletion to the pitch's followups.
3. Surface the obligation at `/cooldown` so it lands on the next-ships queue.
4. Do not skip without all three; "I'll fix it later" is the failure mode.

## Examples in Codebase

- `ai-framework/scripts/orca-preflight.test.mts` — `test.skip("doctor validates optional local
  policy without probing or repairing it", ...)` with a comment pointing at
  `.project/pitches/agent-model-sweep/log.md`.

## Related Entries

- `a-pitch-can-pass-its-own-tests-and-break-on-the-real-file` — the same class of "tests are
  green for the wrong reason" failure.
- `a-gate-must-not-trust-its-own-author` — the gate (the skipped test) must not trust the
  author (the pitch that skipped it) to remember the obligation.

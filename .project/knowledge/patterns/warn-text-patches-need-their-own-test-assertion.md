---
id: warn-text-patches-need-their-own-test-assertion
type: pattern
created: 2026-10-16
updated: 2026-10-16
tags: [testing, doctor, error-messages, mutant-testing]
related: [warn-text-must-be-self-consistent-with-the-code-it-ships, prove-a-guard-test-with-an-in-memory-mutant]
source: agent-model-sweep
---

# Pattern: Warn text patches need their own test assertion

## Summary

When a `record(...)` / `throw` / `console.warn` message is patched (e.g. to name a removed
code path, to point at a new fix, to add a version number), the test that exercises the
code path must assert the new wording — not just the unanchored substring that matched
both pre- and post-patch.

## What happened

`agent-model-sweep` Bet 2 cycle 1 patched the `workflow-doctor.mts:800` warn text to
name the 2.28.0 fallback removal. The test that triggered the warn asserted only
`/no declared capability profile/`, which matched both the pre- and post-patch wording.
Reverting the cycle 1 patch to the pre-patch text would keep the suite green; the
patch itself was untested.

Audit cycle 2 (test-coverage T4) flagged this: a warn text patch is only "real" if a test
asserts the new wording. The fix was an additional `assert.match(warn!.detail,
/legacy .* fallback was removed in 2\.28\.0/)` on the same warn record, in the same test.

## The Pattern

```typescript
// Pre-patch: the test asserts only the unanchored substring.
assert.match(warn!.detail, /no declared capability profile/);

// Post-patch: a second anchored assertion pins the new wording so a revert to the
// pre-patch message is caught.
assert.match(warn!.detail, /no declared capability profile/);
assert.match(warn!.detail, /legacy .* fallback was removed in 2\.28\.0/);
```

## When to Use

- Any patch to a `record(...)` / `throw` / `console.warn` message text where the new wording
  adds a version number, a fix path, or a removed-behavior reference.
- Any patch to a test's expected error message string.
- Any patch to a help-text or CLI usage line that operators see in the wild.

## When NOT to Use

- Cosmetic wording changes (e.g. "couldn't" → "could not") that don't add a specific
  identifier, version, or fix path. These are usually covered by the existing
  unanchored assertion.
- Internal comments or log levels.

## Examples in Codebase

- `ai-framework/scripts/workflow-doctor.test.mts:755` and `:770` — the cycle 1 warn-text
  patch was pinned by an additional `assert.match` on the 2.28.0 wording.

## Related Patterns

- `prove-a-guard-test-with-an-in-memory-mutant` — a guard test's value is the proof that it
  fails for the right reason; a warn-text patch without an anchored assertion is a guard
  that passes for the wrong reason.
- `warn-text-must-be-self-consistent-with-the-code-it-ships` — the upstream reason this
  pattern exists.

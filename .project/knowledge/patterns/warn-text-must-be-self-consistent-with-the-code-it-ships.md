---
id: warn-text-must-be-self-consistent-with-the-code-it-ships
type: pattern
created: 2026-10-16
updated: 2026-10-16
tags: [validation, doctor, error-messages, consistency]
related: [a-gate-must-not-trust-its-own-author, mandatory-config-files-emit-one-top-level-failure]
source: agent-model-sweep
---

# Pattern: Warn text must be self-consistent with the code it ships

## Summary

When a code path is removed or its behavior changes, every `record(...)` / `throw` / `console.warn`
message that referenced the old path must be updated in the same commit. Operators who read
the message will look for behavior that no longer exists; the message contradicts the code.

## What happened

`agent-model-sweep` Bet 2 removed the legacy `claude-haiku-` / `sonnet-` / `opus-` model-prefix
fallback in `workflow-doctor.mts`'s `extractAgentProfile` (per the pinned decision
`profile-detection-lives-in-frontmatter-not-in-the-model-id` "When to Revisit" clause). The
`checkAgent` warn at `workflow-doctor.mts:800` was not updated; it still said:

> no declared capability profile — add a `profile: fast|standard|deep` frontmatter key, **or a
> `model:` line whose prefix matches a known claude-haiku-/sonnet-/opus- tier (legacy
> fallback)**

The operator who reads this message tries to add the `model:` line and expects the doctor
to derive a profile. It does not — the fallback is gone, the `model:` line is ignored, and
the same warn fires forever. The code-reviewer flagged this in audit cycle 1 as a must-fix;
the security-reviewer flagged the same item as "documentation accuracy."

## The fix

When removing or changing a code path, grep for every user-facing message that mentions
the path. Update the messages in the same commit. Add a test that asserts the new wording
(see `warn-text-patches-need-their-own-test-assertion`).

## When to Use

- Removing a feature, branch, or fallback in any file that emits operator-facing messages
  (`record(...)`, `throw new Error(...)`, `console.warn`, `console.error`, log lines).
- Renaming a config key, file path, or identifier that appears in error messages.
- Changing a numeric constant (e.g. "minimum version 1.4.224" → "minimum version 1.5.0") that
  appears in user-facing output.

## When NOT to Use

- Internal comments, internal log levels, or non-operator-facing strings.
- Messages that intentionally reference the old behavior as historical context (e.g.
  migration guides).

## Examples in Codebase

- `ai-framework/scripts/workflow-doctor.mts:796-801` — cycle 1 patch removed the
  `(legacy fallback)` reference and explicitly named the 2.28.0 removal.

## Related Patterns

- `a-gate-must-not-trust-its-own-author` — the gate (the doctor) is the independent witness
  of its own message; if the message lies, the operator has no recourse.
- `mandatory-config-files-emit-one-top-level-failure` — the top-level mandatory check is the
  one place a missing-config message can be a `fail`; per-consumer demoted warns must still be
  self-consistent with the code that emits them.
- `warn-text-patches-need-their-own-test-assertion` — companion pattern: when the warn
  text is patched, the test that triggers it must assert the new wording.

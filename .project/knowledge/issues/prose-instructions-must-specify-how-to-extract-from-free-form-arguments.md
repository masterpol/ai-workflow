---
id: prose-instructions-must-specify-how-to-extract-from-free-form-arguments
type: issue
created: 2026-09-25
updated: 2026-09-25
tags: [prose-skill, cli-integration, testing-gap]
related: [resolve-before-matching-a-protected-path-allowlist]
source: portable-skill-defaults
severity: medium
resolved: true
---

# Issue: A prose skill instruction referenced a CLI flag as if invocation arguments were already a clean single value, but they are free-form text

## Summary

`skill-defaults.js resolve-mode --phase P --arg V` correctly requires `V` to be an exact mode
word. The phase-file instruction that was supposed to call it wrote `[--arg $ARGUMENT]` — implying
whatever the user typed after the phase command could be passed straight through. A real
invocation like `/build caveman=lite fix the login bug` does not produce a clean mode word; it
produces free-form text containing one. The instruction, taken literally, breaks.

## Symptoms

- Discovered post-ship, during a live validation requested explicitly ("validate the caveman is
  being use correctly in the workflow") — not caught by the unit test suite, because every unit
  test called `resolveMode`/the CLI with an already-clean mode string, never with the kind of raw
  text a real phase invocation actually carries.
- Reproduced directly: `node ai-framework/scripts/skill-defaults.js resolve-mode --phase build
  --arg "caveman=lite do the build scope"` → `Choose --arg explicitly from lite,full,...` (exit 1).

## Root Cause

100% test coverage on `skill-defaults.js` proved the **code** was correct for every input it was
given. It said nothing about whether the **prose instruction** in each phase's `SKILL.md` — which
only an agent interprets, never a test harness — would actually produce a valid input in the
first place. A dense, terse phrase like `[--arg $ARGUMENT]` reads as complete to a human/model
skimming it, but under-specifies the one thing that actually matters: how to get from "whatever
the user typed" to "the one clean value this flag needs." This is a category of bug unit tests on
the underlying script structurally cannot catch, because the gap is in the *glue text*, not the
code the text points at.

## Solution

Moved the extraction into the script itself rather than leaving it to prose: added a
`--args-text` option (and an `extractInvocationArg()` export) that takes the raw, unparsed
invocation text, extracts a `caveman=<mode>` token via regex if one is present anywhere in it,
and falls through to the normal precedence chain if none is found — while still rejecting a
real `caveman=<typo>` loudly. Every phase file's instruction now says `--args-text "$ARGUMENTS"`
(pass the raw text through unmodified) instead of asking the agent to have already parsed it.
This makes correctness a property of tested code again, not of how carefully an agent reads a
one-line instruction.

```js
function extractInvocationArg(argumentsText) {
  const match = typeof argumentsText === "string" ? argumentsText.match(/\bcaveman=(\S+)/i) : null;
  return match ? match[1].toLowerCase() : undefined;
}
```

## Prevention

- When a prose skill instruction hands a raw, free-form value (a phase's invocation arguments,
  a user-typed command) to a script's CLI flag, check what that flag actually validates before
  assuming the two line up — write down (or better, actually run) the realistic invocation shape,
  not just the clean value the script's own unit tests use.
- 100% code coverage on a script says nothing about whether the *instructions pointing at it*
  are correct — those need their own validation, ideally by simulating a real invocation shape
  end-to-end (installing the real skill, setting real state, calling the real CLI the way the
  prose says to), not just by re-reading the prose for plausibility.
- Prefer moving parsing/extraction logic into tested code over asking an agent to reliably
  perform the same extraction correctly, consistently, across every model and every invocation.

## Related

- Fixed in `ai-framework/scripts/skill-defaults.js` (`extractInvocationArg`, `--args-text`),
  all 7 canonical phase `SKILL.md` files, and `ai-framework/integrations/skill-defaults.md`.
- [[resolve-before-matching-a-protected-path-allowlist]] — a sibling lesson from the same pitch:
  correctness found by actually trying a realistic input, not by re-reading code that looked
  right.

---
id: a-prose-example-in-a-model-instruction-is-followed-literally
type: pattern
created: 2026-10-20
updated: 2026-10-20
tags: [skills, prompts, live-runs, evaluation, instructions]
related: [one-owner-per-instruction-topic-guarded-by-contract-tests, prose-instructions-must-specify-how-to-extract-from-free-form-arguments, a-grader-reports-executed-and-unexecuted-cases-separately]
source: state-ai-authoring
confidence: low
---

# Pattern: a parenthetical example in a model instruction acts as a rule, so test it on the case it names

## Summary

An example added to a skill step to fix one failure ("if nothing is citable for a slot, for example `tokens` when token metrics are unavailable, leave it empty") was followed exactly: every model left the `tokens` slot empty in the case that was meant to produce an "unavailable" statement. The text had been added after a reviewer reproduced a different failure by hand.

## What happened

A reviewer wrote a fragment by hand from the skill text and listed what confused them. One fix named the repository's own situation as the example for "leave it empty". The first live run on the matching case (`tokens-slot-invented-totals`) stopped three times at an empty slot. Rewording it to "write the slot, state the unavailability and cite what the snapshot holds" fixed all of them.

## How to apply

When editing a model-facing instruction, name the case the example describes in the dataset and run that case live (or at least by hand through the real CLI) before closing the scope. Prefer the general rule plus the required output over an example that describes a situation in which the model should do less. Review feedback from a hand-written trial is a hypothesis about the prompt; the live case is the test.

---
id: a-sparse-array-hole-skips-every-but-visits-for-of
type: issue
created: 2026-10-20
updated: 2026-10-20
tags: [validation, arrays, testing, untrusted-input]
related: [parse-untrusted-values-and-re-emit-them, guard-tests-can-fail-for-the-wrong-reason, keep-the-fakes-guarantee-the-thing-they-replace]
source: state-fragment-sanitizer
severity: medium
resolved: true
confidence: medium
---

# Issue: a sparse array hole skips `every` but is visited by `for-of`

## Summary

A validator that checked an array with `Array.prototype.every` accepted a sparse array whose
holes were skipped by `every` and then visited as `undefined` by a later `for-of`. The crash
appeared only on the second pass over the same array.

## Symptoms

- `checkCitations` threw `TypeError` when called directly with a hole in `hrefs` or `numbers`.
- The same input passed the `every` guard that was supposed to reject malformed input.
- The defect was invisible in the normal path because the sanitizer built dense arrays first.

## Root cause

`every` skips holes entirely (a hole is not an element, so the callback never runs for it),
while `for-of` yields `undefined` for each hole. The two iteration protocols disagree about what
a hole is, and the validator used one to accept and the other to consume.

## Solution

Validate a bounded **dense copy** of the array before iterating it, and treat a hole as the
malformed value it is. The fix shipped as a named sparse-array regression with valid controls,
plus two coordinator-run mutants (one per field) that each fail the named input-type assertion.

## Prevention

- Do not use `every`/`some`/`filter` on an array that came from outside your control; they hide
  holes instead of reporting them.
- Copy with a bounded method that materialises holes (`Array.from` / `slice`) before validating,
  so validation and consumption see the same values.
- When a validator accepts an array, prove it with a test that contains an actual hole, not just
  a wrong element ([[guard-tests-can-fail-for-the-wrong-reason]]).

## Related

- [[parse-untrusted-values-and-re-emit-them]] — the same rule at the parse boundary: consume
  only values that were re-emitted from a validated structure.
- [[keep-the-fakes-guarantee-the-thing-they-replace]] — a fixture that omits a field can hide a
  hole in the data shape.

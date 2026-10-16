---
id: replace-a-library-with-a-fixture-table-from-the-library
type: pattern
created: 2026-10-16
updated: 2026-10-16
tags: [parsing, fixtures, testing, dependencies]
related: [parse-untrusted-values-and-re-emit-them, prove-a-guard-test-with-an-in-memory-mutant, a-pitch-can-pass-its-own-tests-and-break-on-the-real-file]
source: orca-engines-range
---

# Pattern: When the bundle cannot take a dependency, replay the library's own answers as fixtures

## Summary

A bundle with no npm dependencies still needs npm semver range semantics for `integrations.orca.engine`. Write the small subset by hand, but never author the expected results by hand: generate a cross product of ranges and versions once with the real library outside the repo, commit only the JSON rows, and replay them in a test. Hand-written expectations copy the author's misreading of the grammar.

## What happened

`runtime/semver-range.mts` (no imports, linear scanner) is checked against 2480 rows from `semver@7.6.3` (`satisfies(version, range)`). Rows exercise `^0.0.x`, partial `~`, `>`/`<=` on partials, wildcard hyphen ends and `||`. Three in-memory mutants (`>=` to `>`, caret ceiling, tilde minor) each fail the table. The reviewer's extra 340-range differential run found no mismatch. Where the subset is deliberately stricter than npm (empty `||` arms, `v1.2.3`, a space after an operator, prerelease), the rejection is a test, not a fixture.

## How to apply

- Generate rows in the scratchpad, commit the JSON with the library version in a header field, and drop rows that need out-of-scope features.
- Keep rejections as explicit tests; the library cannot tell you what you chose not to support.
- A reviewer's canary plus a differential run is stronger than either alone.

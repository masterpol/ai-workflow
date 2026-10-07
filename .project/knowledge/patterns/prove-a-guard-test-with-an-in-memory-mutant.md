---
id: prove-a-guard-test-with-an-in-memory-mutant
type: pattern
created: 2026-10-07
updated: 2026-10-07
tags: [testing, mutation, verification, audit, path-safety]
related: [a-gate-must-not-audit-its-own-instrument, a-gate-must-not-trust-its-own-author, macos-tmpdir-realpath-alias-breaks-path-assertions]
source: path-safety-hardening
---

# Pattern: prove a guard test guards by running it against an in-memory mutant

## Problem
A test that passes proves nothing about the check it names unless it also fails when that check is removed.

## Method
Run one named test in a child `node` process whose `Module._extensions['.js']` is patched: when the loader reaches the target
source file it reads the file, replaces one exact `before` string with `after` (for example `const check = () => {` becomes
`const check = () => { return;`), and compiles the altered text. The repository file is never edited. Use `--test-name-pattern`
to select the test. Each case must exit 1 with its named assertion failure; exit 0 means the mutant survived, and a timeout means
the test hangs when its guard is off (fix the test's cleanup). Require `before` to occur exactly once. Apply to every guard a
pitch adds (ancestor checks, symlink refusal, delimiter-safe identity joining, lock-age rule, font-name allow-list).

## Notes
- Fixture realpaths must be canonical on macOS ([[macos-tmpdir-realpath-alias-breaks-path-assertions]]).
- Author-run mutants are `author-run` evidence, not independent review ([[a-gate-must-not-audit-its-own-instrument]]).

---
id: a-source-scanner-fails-closed-on-what-it-cannot-read
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [validator, lexer, fail-closed, guards, testing]
related: [prove-a-guard-test-with-an-in-memory-mutant, guard-tests-can-fail-for-the-wrong-reason, a-gate-must-not-audit-its-own-instrument]
source: runner-aware-runtime-boundary-validator
---
# Pattern: a source scanner fails closed on whatever it cannot read

## Summary
The runtime-boundary validator (`runtime/validate.mts`) is a lexical scanner, not a parser. Two audit cycles found it failing open in the same way each time: a form it could not read produced no finding and no failure, so a real `node:*` import passed.

## The Pattern
- **Keep what you found.** On a lexer error return the findings collected so far plus an `unparsed` entry; do not discard them.
- **Unreadable is a failure, not a warning.** Unparsed, oversize, depth-capped, entry-capped, symlinked or unreadable production files fail the doctor and the invariants test; tests-only findings stay warnings.
- **Enumerate evasions from the language, not from the author's imagination.** Valid-JS spellings that hid an import: a backslash-newline (or U+2028) inside a module string, escaped identifiers (`require`), template-literal specifiers, parenthesized or conditional `import(...)`, comma/optional/tagged `require`, `${...}` expressions inside templates, and `import type from 'x'` (a value import named `type`). Check each with `node --check` before calling it a finding (`export * from` with a template is not valid JS).
- **Rules that read a form must not flag legitimate code.** "Any non-literal `import()` fails" flagged `.claude/hooks/post-edit-check.mts:71` (a computed project-file URL). Narrow the rule (fail when the argument contains a `node:` literal; a purely computed argument is an advisory), never add a per-file allowlist.
- **A planted defect that breaks no test is itself a finding.** The first canary (the ancestor-directory symlink check) broke nothing: the guard was untested. Plan canaries that turn a test red, and treat the ones that do not as coverage gaps.
- **Count with the same lexer you enforce with.** A plain `grep` counted 30 `child_process` imports in tests where the lexer found 28: two hits sat inside fixture strings.
Related: [[prove-a-guard-test-with-an-in-memory-mutant]], [[guard-tests-can-fail-for-the-wrong-reason]].

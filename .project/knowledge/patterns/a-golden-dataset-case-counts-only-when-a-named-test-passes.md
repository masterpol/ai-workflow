---
id: a-golden-dataset-case-counts-only-when-a-named-test-passes
type: pattern
created: 2026-10-20
updated: 2026-10-20
tags: [testing, datasets, evals, skip, coverage]
related: [a-grader-reports-executed-and-unexecuted-cases-separately, test-skip-is-a-follow-up-not-a-finish, local-eval-data-is-gitignored]
source: state-fragment-sanitizer
confidence: medium
---

# Pattern: a golden dataset case counts only when a named test passes — and a skip is not a pass

## Summary

A golden dataset can only protect a feature if each case is bound to a real, passing test. A
case whose only test is skipped, or whose test is named almost right, must not be counted as
enforced. Bind the case id to a named test, parse the child's real TAP output, and treat
`# SKIP`, `# TODO`, a `not ok` line and an absent test as failures of the mapping.

## The Pattern

- **Exact id prefix.** The child's test name must start with `[<case-id>]`; a similar name or a
  nested name is not a match.
- **A skip is not a pass.** A case whose only test carries `# SKIP` or `# TODO` is unenforced.
  Parse the real directive field rather than guessing at the reporter's spelling.
- **The child's own summary must be clean.** Exit 0 *and* a final summary with zero
  fail/cancelled/skipped/todo.
- **Partition explicitly.** Every dataset id is either owned here (and enforced) or deferred to
  another pitch, and the two sets are disjoint and together equal the dataset. A new id that
  maps to neither fails the mapping.
- **Negative controls in the same file.** Feed the mapping parser a synthetic report with a
  skipped-only case, a todo-only case, a failed case, an absent case, a similar name, a nested
  name, a stdout line, an escaped name and a malformed summary; each must mark the case
  unenforced.

## What happened

The sanitizer's golden dataset had 22 cases: 13 deterministic ones owned by the library and 9
deferred to the later authoring pitch. The mapping test asserted an exact disjoint partition
and enforced each owned case through a spawned Node run of the three fragment suites. A
mutant that removed the `SKIP` guard admitted a synthetic skipped-only case and failed the
named negative control.

## When to Use

- Any golden dataset that claims to protect a feature.
- Any harness that maps cases to tests through a text format you do not control.

## When NOT to Use

- Live-only cases (a model, a browser, a network). They stay deferred with a named owner and
  are never counted as enforced here.

## Related

- [[a-grader-reports-executed-and-unexecuted-cases-separately]] — the same honesty rule for
  graders.
- [[test-skip-is-a-follow-up-not-a-finish]] — a skip leaves an obligation behind.
- [[local-eval-data-is-gitignored]] — the dataset file itself has to be tracked.

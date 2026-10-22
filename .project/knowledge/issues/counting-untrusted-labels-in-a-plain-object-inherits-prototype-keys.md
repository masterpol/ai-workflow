---
id: counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys
type: issue
created: 2026-10-19
updated: 2026-10-19
tags: [security, untrusted-input, reports, charts, prototype]
related: [a-report-over-an-untrusted-tree-runs-only-bundle-code, parse-untrusted-values-and-re-emit-them, project-state-report-design]
source: state-report-redesign
severity: low
resolved: true
---
# Issue: a `{}` counter keyed by labels from `state.json` inherits `constructor` and `toString`

## Summary
The report counted pitch phases and top-level folders in `const counts = {}`. A phase or folder named `constructor` or `toString` read the inherited function, so `(counts[k] || 0) + 1` produced a string; `__proto__` silently vanished. Nothing reached markup unescaped, but the chart lost or garbled rows. Found by the audit's security reviewer, not by any test.

## Fix
Count in `Object.create(null)` (or a `Map`) whenever the keys come from untrusted data. Regression test: "charts: labels that are Object internals are counted as ordinary labels".

## Lesson
The pattern `parse-untrusted-values-and-re-emit-them` covers values; keys need the same care when they index an object.

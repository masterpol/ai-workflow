---
id: a-compression-pilot-keeps-failed-candidates-and-defers
type: pattern
created: 2026-10-19
updated: 2026-10-19
tags: [instruction-compression, evals, gates, workflow]
confidence: low
related: [a-grader-reports-executed-and-unexecuted-cases-separately, local-eval-data-is-gitignored, mutation-script-killed-leaves-source-mutated]
source: instruction-compression
---

# Pattern: shorten instructions behind a frozen baseline; keep rejected candidates and defer a scope rather than tune it

## Summary

Compress a wrapper only against a frozen dataset and baseline vector with a no-new-loss rule. A candidate that loses a satisfied criterion or hides a known zero as null is rejected and retained as evidence; the scope is deferred and its files restored byte-exact. Do not edit the prompt or score until green. Wrappers shrink by pointing at one owner, with an explicit stop when a required owner is missing.

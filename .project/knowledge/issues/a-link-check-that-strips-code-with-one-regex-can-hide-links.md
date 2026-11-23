---
id: a-link-check-that-strips-code-with-one-regex-can-hide-links
type: issue
created: 2026-11-23
updated: 2026-11-23
tags: [add-skill, validation, markdown, supply-chain]
related: [archify-renders-the-state-report, parse-untrusted-values-and-re-emit-them]
source: archify-replaces-state
severity: low
resolved: true
confidence: low
---

# Issue: an integrity check that skips "code" with a regex is bypassable

## Summary

`add-skill` rejected Archify because its link check read an example link inside backticks as real; the first fix (strip `` `[^`\n]*` ``) let escaped backticks and double-backtick spans hide real links.

## Symptoms
- `Unsafe relative path: "/abs/path/checkout-timing.html"` from `add-skill inspect`.
- Two independent reviewers showed `` a ` b [x](../../e.md) c ` d `` loses the link, and `\`[x](../../e.md)\`` keeps backslash-escaped backticks as code.

## Root Cause
Code spans pair a run of N backticks with the next run of exactly N, and a backslash makes a backtick literal. One regex does neither.

## Solution
A small per-line scanner (`stripCodeSpans`): equal-length runs, backslash escapes, an unmatched run stays literal, spans never cross a line. Five assertions, and the old regex is a killed mutant.

## Prevention
When a validation skips "safe" text, parse that text's grammar instead of approximating it, and test the skip with inputs that should not be skipped.

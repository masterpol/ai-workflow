---
id: a-string-built-in-a-loop-by-reading-its-last-character-is-quadratic
type: issue
created: 2026-11-25
updated: 2026-11-25
tags: [performance, untrusted-input, parser, strings, state-report]
related: [backtracking-regex-over-untrusted-text-is-quadratic, state-sql-migrations-as-a-neutral-schema-source]
source: state-project-sources
severity: medium
resolved: true
---

# Issue: a loop that appends to a string and reads `s[s.length - 1]` is quadratic without any regex

## Symptom
The SQL reader's type renderer joined tokens with `s += part` and chose the separator from `s[s.length - 1]`, cutting to 80 characters only at the end.
Reading the last character of a string built by concatenation makes V8 flatten the rope on every iteration. A column type of 450,000 tokens (1.8 MB) took 38.5 s; the same input through the whole pipeline, under a 1 MB file cap, took 12.7 s.
The lexer was linear and had a doubling-time test; this was outside what the test measured. A security reviewer found it by probing the real pipeline.

## Fix and rule
- Stop as soon as the output has the length you need, and keep the last character in a variable instead of indexing the growing string.
- A "linear" claim needs a timing test on **each** place untrusted text is accumulated, not only the lexer: a doubling-ratio test, best of three runs, with its own absolute deadline.
- Bound the work by the output you keep (80 characters), not by the input you are given.

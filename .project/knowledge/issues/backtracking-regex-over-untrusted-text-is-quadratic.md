---
id: backtracking-regex-over-untrusted-text-is-quadratic
type: issue
created: 2026-10-07
updated: 2026-10-07
tags: [regex, redos, untrusted-input, entry-files, setup-validator]
related: [parse-untrusted-values-and-re-emit-them, a-gate-must-not-audit-its-own-instrument]
source: shape-lite
severity: high
resolved: true
---

# Issue: a lazy fence-stripping regex over CLAUDE.md was quadratic

## Symptom
`outsideCode` used one `/^(```|~~~)...[\s\S]*?^\1$/gm` regex. An unclosed fence makes every opener scan to end of file: 16k lines took 1.15 s (4x per doubling); a 1 MB file blocked the validator, doctor and bundle-sync for about 187 s. Found by an independent security review, not by tests.

## Fix and rule
Replace with a linear line scanner (open/close state, unclosed = to EOF) and a 200k-line timing test. Judge a directive on its raw line: stripping inline code first accepted `` `a`@AGENTS.md ``. Any code that reads a project's entry files is reading untrusted text; use bounded, anchored matching and a size cap (1 MiB on the imported target).

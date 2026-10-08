---
id: a-thin-cli-keeps-every-guard-in-the-library
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [cli, guards, phases, security]
related: [a-grader-reports-executed-and-unexecuted-cases-separately, one-boundary-selects-the-child-runner]
source: orca-vendor-reconcile-integration
---

# Pattern: a thin CLI keeps every guard in the library

## Summary

Markdown phases cannot import TypeScript, so they need a command. Make it parse, validate input, make one library
call and print one JSON object. If the CLI repeats a guard it becomes a second, untested path.

## The Pattern

- The switch check, launch gate, path and apply guards stay in the libraries; a grep test asserts the CLI imports none of them.
- Parity tests compare CLI JSON with the library outcome for the same input; exit codes map from the outcome only.
- Anything the agent could use to supply command text is a fixed catalog selected by name (`--check workflow-doctor`).
- Input is a regular file, size-bounded, inside the root, opened without following links; worker text is data.

## Evidence

`orca-run.mts` (17 tests, Node and Bun). An audit canary (disabled symlink guard) was caught by both reviewers.

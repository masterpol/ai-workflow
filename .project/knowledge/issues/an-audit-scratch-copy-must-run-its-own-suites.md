---
id: an-audit-scratch-copy-must-run-its-own-suites
type: issue
created: 2026-10-19
updated: 2026-10-19
tags: [audit, reviewers, scratch-copy, canary, incomplete-review]
related: [a-gate-must-not-audit-its-own-instrument, a-gate-must-not-trust-its-own-author, project-state-report-design]
source: state-report-redesign
severity: low
resolved: true
---
# Issue: a scratch copy that cannot load the suite makes three reviewers return INCOMPLETE

## Summary
The first audit scratch copy held only the `state-*` scripts and `runtime/`. `state-html.test.mts` and `state-snapshot.test.mts` failed to import `skill-defaults.mts` (and its `skill-defaults.json`), so the security and test reviewers could not run the end-to-end suites and returned INCOMPLETE. The retry needed a second scratch copy, which cost a full dispatch round.

## Fix
Before dispatch, run the target suite once in the scratch copy (`review-bench.mts prepare --test-cmd` does this for the canary's suite) and choose a canary in the file whose suite is the widest one. Include `ai-framework/rules/` so reviewers can read the checklist files, and non-script data imports (`*.json`).

## Also seen
A canary in the scratch copy produces "must-fix" findings that are artifacts; verify each against the repo line before triage.

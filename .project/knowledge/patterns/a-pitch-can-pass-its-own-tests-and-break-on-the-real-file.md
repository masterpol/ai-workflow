---
id: a-pitch-can-pass-its-own-tests-and-break-on-the-real-file
type: pattern
created: 2026-10-16
updated: 2026-10-16
tags: [testing, fixtures, config, verification, gitignore]
related: [a-gate-must-not-trust-its-own-author, unified-toon-config-schema-v2]
source: unified-toon-config
confidence: low
---
# Pattern: green fixture tests do not prove the real config file loads

## Summary
After a schema reshape every agent reported green suites, yet the developer's real gitignored `ai-workflow.toon` failed to parse (a count mismatch) and Orca turned off. A test also read that gitignored file and crashed on a clean checkout.

## The Pattern
- After any schema change, run the real consumers (`orca-policy report`, doctor, setup-validator) against the real root file, not only fixtures.
- Validate in a clean worktree of the commit: it has no gitignored local files, so tests that need one fail there.
- A test that copies the bundle must seed gitignored files from the shipped example, never inherit the developer's copy.
- A validator that needs the whole suite to pass must be re-run by the coordinator, not taken from agent reports.

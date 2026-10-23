---
id: a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version
type: issue
created: 2026-10-17
updated: 2026-10-17
tags: [schema, migration, testing, config, release]
related: [test-skip-is-a-follow-up-not-a-finish, a-pitch-can-pass-its-own-tests-and-break-on-the-real-file, prove-a-guard-test-with-an-in-memory-mutant]
source: orca-role-pools
severity: medium
resolved: true
---
# Issue: bumping `ai-workflow.toon` to schemaVersion 3 left `config-migrate` writing 2 and 98 tests red at HEAD

## Summary

`vendor-model-toon` S1 moved the reader to schemaVersion 3 and committed with its own log saying the ripple was open. `config-migrate.mts` still emitted `schemaVersion: 2` and matched `only 2 is supported`, and `config.test.mts` / `config-migrate.test.mts` hard-coded 2. The next pitch inherited a suite that could not go green, and a migrator that produced a file its own reader refused.

## Fix

Emit 3, match `only 3`, update the fixture literals (D1 in `orca-role-pools/deviations.md`). Still open: a v2 file cannot be converted in place (the reader's refusal text promises `--apply` does it; today it needs `--force` and drops the values).

## How to avoid

Bump the version constant, the emitter, the refusal regex and every fixture literal in one commit (`grep -rn "schemaVersion: <old>"`), and run the whole suite before calling the scope done. A scope marked done with an open red suite hands the red to the next pitch.

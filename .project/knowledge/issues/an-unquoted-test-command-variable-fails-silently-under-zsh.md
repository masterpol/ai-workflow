---
id: an-unquoted-test-command-variable-fails-silently-under-zsh
type: issue
created: 2026-10-20
updated: 2026-10-20
tags: [workflow-tooling, shell, zsh, testing, evidence]
related: [a-local-workflow-env-file-changes-which-runner-path-tests-spawn, an-unbounded-mutation-run-hangs-on-a-mutant-that-removes-a-stall-guard]
source: workflow-usage-state
severity: low
resolved: true
---

# Issue: an unquoted test-command variable fails silently under zsh

## Summary

The plan's exit commands use `T="node --experimental-strip-types … --test"` then `$T file`. Under zsh the unquoted variable is one word, so `$T` fails at once (a 12-run flake loop "finished" in 0.02 s with 12 failures, and a test run printed nothing). Bash splits it as intended.

## Solution

Run exit commands under `bash -c '…'`, and treat a result that returns in milliseconds, or prints no summary line, as a failed run of the command rather than as test output.

## Prevention

Evidence pasted from a test command must include its `ℹ tests/pass/fail` lines; absence is a failure of the check.

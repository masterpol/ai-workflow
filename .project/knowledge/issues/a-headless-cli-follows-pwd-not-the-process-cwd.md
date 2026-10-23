---
id: a-headless-cli-follows-pwd-not-the-process-cwd
type: issue
created: 2026-10-20
updated: 2026-10-20
tags: [live-runs, harness, opencode, codex, cwd, evaluation]
related: [orca-workers-differ-from-the-coordinator-environment, a-grader-reports-executed-and-unexecuted-cases-separately, an-unquoted-test-command-variable-fails-silently-under-zsh]
source: state-ai-authoring
severity: medium
resolved: true
confidence: low
---

# Issue: a headless CLI can work in the wrong directory even when the process cwd is right

## Summary

Driving three vendor CLIs from a script (`subprocess` with `cwd=<fixture>`), `opencode run` worked in the *driver's* directory: it reads `PWD` from the environment, which `cwd=` does not update. The model reported that the skill file was missing, 23 of 24 runs "failed", and the failure looked like model weakness. Codex failed in 0 seconds without `--skip-git-repo-check` in a non-git fixture, and hung on "Reading additional input from stdin" until stdin was closed.

## Solution

Set `env.PWD` to the fixture for OpenCode, pass `--skip-git-repo-check` and `< /dev/null` for Codex, and run a one-case smoke per vendor before a matrix. Treat a run that ends in under a few seconds, or whose output says it cannot find the input, as a harness failure to discard and re-run, never as a graded fail.

## Prevention

Record each vendor's exact command, its cwd rule and its stdin rule in the live-run harness section before the matrix starts; discard and re-run (do not grade) any batch whose failures share one environmental cause.

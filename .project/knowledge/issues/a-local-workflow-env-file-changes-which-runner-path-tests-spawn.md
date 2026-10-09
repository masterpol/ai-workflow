---
id: a-local-workflow-env-file-changes-which-runner-path-tests-spawn
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [testing, runner, bun, environment, flaky-test]
related: [one-boundary-selects-the-child-runner, guard-tests-can-fail-for-the-wrong-reason, macos-tmpdir-realpath-alias-breaks-path-assertions]
source: state-multipage-report
severity: low
resolved: false
---
# Issue: the git-ignored `ai_workflow_env.json` (runner `bun`) makes a test that empties PATH fail on a developer machine

## Summary
`browser-runtime.test.mts` "CLI end to end" sets `PATH` to an empty directory and spawns the script. With
`ai_workflow_env.json` selecting `AI_WORKFLOW_RUNNER=bun` the child cannot find `bun` and exits 1. A clean checkout has no
such file, so CI and a fresh worktree pass; the same test passes locally with `AI_WORKFLOW_RUNNER=node`. It looked like a
regression in the shipping gauntlet and cost a baseline worktree to disprove.

## Rule
A test that controls PATH must also pin the runner in the child environment (process env beats the file), or resolve the
runner executable before emptying PATH. Run the gauntlet once with `AI_WORKFLOW_RUNNER=node` and once with `bun`.
Also seen: `token-consumption.test.mts` has one intermittent failure on a clean HEAD (timing under load; passed in the final
full run). Followup recorded in `_followups.md`.

---
id: a-nested-node-test-child-inherits-the-parents-test-context
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [testing, node-test, subprocess, environment, runner]
related: [one-boundary-selects-the-child-runner, a-local-workflow-env-file-changes-which-runner-path-tests-spawn]
source: test-execution-performance
severity: low
resolved: true
confidence: low
---

# Issue: a `node --test` child started from inside a test inherits `NODE_TEST_CONTEXT`

A real-launch test that spawned `node --test <fixture>` got exit 0 with no output from the fixture, even
when the fixture's assertion failed. The outer `node:test` run sets `NODE_TEST_CONTEXT`; a child that inherits
it behaves as a subtest and reports to the parent instead of running as its own top-level run.

Fix: `run-tests.mts` removes `NODE_TEST_CONTEXT` from the child environment. Any test helper that launches a
fresh `node --test` should do the same. The mutation test's outer script process still inherits it (audit A3,
not reproduced as a failure).

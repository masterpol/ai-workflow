---
id: a-workers-passing-tests-can-encode-the-wrong-data-shape
type: issue
created: 2026-10-19
updated: 2026-10-19
tags: [orca, workers, tests, verification, transcripts]
related: [reviewer-reports-contradicted-by-measurement, orca-workers-differ-from-the-coordinator-environment, reconcile-every-worker-of-a-wave-before-committing-any-scope]
source: token-attribution
severity: medium
resolved: true
confidence: low
---

# Issue: a worker's tests passed because its fixtures used the same wrong shape as its code

## Symptom

An OpenCode worker built the transcript usage reader and reported "17 tests pass on Node and Bun". It read
`usage` and `model` at the top level of each JSONL line; real lines carry them under `message`. Its fixtures
used the same wrong shape, so code and tests agreed with each other and with nothing real. It also accepted
FIFOs, used the wrong root directory, and had no recent-id window or held-back last group.

## Root cause

The brief named the plan file, but the worker's worktree (created from an older base) did not contain the
untracked pitch records, so the spike findings that fixed the shape were not visible to it. Green tests only
prove self-consistency.

## Fix and prevention

Review a worker's diff against the spike findings or a real sample shape before accepting; rerun every exit
command in the main checkout; put the data shape (key paths and types) in the brief itself. Pin the worktree
base to the current commit. Treat the worker's own test count as a claim, not evidence.

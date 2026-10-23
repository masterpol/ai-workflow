---
id: a-forced-fold-loop-spins-on-a-hand-edited-frontier
type: issue
created: 2026-10-20
updated: 2026-10-20
tags: [workflow-metrics, security, resource-exhaustion, validation, lease]
related: [an-unbounded-mutation-run-hangs-on-a-mutant-that-removes-a-stall-guard, metrics-ancestor-swap-during-async-lease, reversible-aggregates-store-their-routing]
source: workflow-usage-state
severity: high
resolved: true
---

# Issue: a forced-fold loop spins on a hand-edited frontier

## Summary

The usage state folds closed intervals up to a "frontier" and, over the record cap, forces the fold point forward in a loop. The loop made progress only if the frontier was before every open record's end. The validator accepted any non-negative integer frontier, so a hand-edited file with a frontier past every end sent the next writer into an endless loop while it held the metrics lease. Every later capture would then time out.

## Symptoms

`applyEvent` on a state with 256 open records, a frontier 60 s ahead and a subagent start and finish inside the five-minute future allowance never returned (100% CPU, killed after 8 s). The 79 tests and the author's own review had not tried a state that was valid but unreachable by the writers.

## Root Cause

A loop's termination depended on an invariant (`frontier < every open end`) that the writers keep but the reader did not check. State files are hand-editable, so anything the validator accepts is an input.

## Solution

Both halves: the validator rejects a state that breaks the invariant, and the loop checks that a pass removed something and cuts the list back (counted in `clippedIntervals`) when it did not. Prove each half with its own mutant, and give the no-progress test a watchdog, because a synchronous loop cannot be timed out by the test runner.

## Prevention

For any loop that terminates by a stored invariant: validate the invariant on read, guard progress in the loop, and write one hand-edited-state test per loop. A security reviewer found this only because the prompt asked for "another valid state that makes any loop run without bound".

---
id: a-simulated-clock-ahead-of-undelivered-events-folds-them-away
type: issue
created: 2026-10-20
updated: 2026-10-20
tags: [workflow-metrics, testing, clock, simulation, property-test]
related: [read-before-the-lease-commit-cursor-and-totals-together, a-local-workflow-env-file-changes-which-runner-path-tests-spawn, reversible-aggregates-store-their-routing]
source: workflow-usage-state
severity: low
resolved: true
---

# Issue: a simulated clock ahead of undelivered events folds them away

## Summary

The interval engine folds time up to the earlier of its pending starts and the collector clock. A property test that held the injected clock at the end of the whole scenario while delivering events in order let the fold point run past events not yet delivered, so real intervals were clipped and counted (20 clipped intervals in the first 300-run pass), and the test blamed the engine.

## Root Cause

In production the clock is real time and an event cannot be older than "now" except through counted clock skew. The simulation broke that assumption by freezing the clock in the future.

## Solution

Advance the injected clock with each delivered event in the simulation (`at(deps, eventTime)`), and assert `clippedIntervals === 0` so a clock mistake in the harness shows up as a named counter, not as a wrong total.

## Prevention

When a function folds or evicts by "now", a scenario test must move "now" with the events. Add the no-loss counter to the assertions.

# Pitch: Collector robustness

**Date**: 2026-09-26  •  **Appetite**: small-batch (≤2 files, ≤400 LOC)
**Stack**: Node.js telemetry hook

## Problem

Agent events can silently stop recording behind a stale lock, and distinct events can share a deduplication identity and be counted only once.

## Knowledge consulted

- `decisions/token-metrics-dimensions-design` — telemetry is bounded, local, and must state what it measured.
- `patterns/reversible-aggregates-store-their-routing` — record identity and state migrations must preserve aggregate correctness.
- `issues/bare-prefix-match-crosses-entities` — delimiter-built identifiers can alias separate entities.
- `ai-framework/rules/testing.md` — guards need a test that fails when loosened.

## Solution sketch (breadboard, NOT wireframe)

**Places**: `token-consumption.js` lock and event normalizer; `token-consumption.test.js` concurrency and identity fixtures.

**Affordances**: reclaim a lock only after a bounded age and fresh ownership check; treat `EPERM` as a live-PID uncertainty subject to the same age rule; encode identity fields unambiguously.

**Connections**: hook observes existing lock, validates current contents and age before reclaim, then acquires exclusive ownership. Normalization produces collision-free keys; deduplication and replacement use them while old snapshots remain readable.

## Rabbit holes

**Resolved here**:
- PID liveness alone is not ownership; stale age is reclaim authority.
- Identity fields need structure, not colon concatenation.

**Pushed to /plan as risk**:
- Legacy `identityKey` compatibility and exact lock-age boundary tests — owner: planner.

**Pushed to no-go**:
- Cross-host locking, telemetry upload, or changing report presentation.

## No-gos (this pitch)

- ✗ No new telemetry dimensions or vendor integrations.
- ✗ No unbounded waits in agent hooks.
- ✗ No changes to historical metrics snapshots beyond read compatibility.

## Critique findings

Skipped: small-batch.

## Bet decision

☒ **Bet** (→ /plan)
☐ Re-shape — named gap: legacy identity compatibility
☐ Pass — moved to `.project/pitches/_parked/collector-robustness/`; reason: {…}

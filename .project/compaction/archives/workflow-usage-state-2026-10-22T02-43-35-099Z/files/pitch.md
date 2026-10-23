# Pitch: workflow-usage-state

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected 7 files, ~800 LOC including tests)
**Stack**: backend (Node `.mts`: the workflow-usage state module, its report and contract doc)

Part A1 of the split of `token-time-report` (critique TT1/TT2). Full shaping draft with every correction, risk and critique row: `.project/pitches/workflow-usage-capture/shaping-draft.md` (read it first; this pitch carries only the state half). Part A2 is `workflow-usage-capture` (hooks and plugin that write into this state); part B is the re-seeded `token-time-report` (joined report). Bet 2026-10-19.

## Problem

The workflow-usage store records no intervals, no scope, no wait, no transitions, and caps pitches first-come. It cannot answer how long a pitch, phase or scope took, how much of that was waiting, or how the flow moved. Capture (A2) can only write what this state can hold, so the state comes first.

## Knowledge consulted

Same list as the shaping draft; the ones that decide this pitch:
- decisions/collector-metrics-lease-design: one writer, loopback lease, fail closed; both stores share one port.
- patterns/display-buckets-are-not-lifecycle-identities: `(other)`/`(unknown)` never match a start to a finish; composite keys stay unambiguous.
- patterns/reversible-aggregates-store-their-routing; issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version; patterns/a-version-migrator-edits-the-token-not-the-model: the v1 to v2 migration edits the version token and re-reads through the strict reader.
- patterns/pin-directory-identities-across-async-leases; issues/metrics-ancestor-swap-during-async-lease.
- rules `machine-data-format.md` (script-read state stays JSON), `data-modeling.md` (append-only migration, lossless round trip), `testing.md` (event units).

## Solution sketch (breadboard, NOT wireframe)

**Places**: P1 `workflow-metrics-state.mts` (schema version 2); P2 `workflow-metrics-report.mts` (capture status only); P3 `ai-framework/integrations/workflow-metrics.md` (contract); P4 their tests (`workflow-metrics-state.test.mts`, `workflow-metrics-report.test.mts`, plus `workflow-metrics.test.mts` if a version 2 fixture is needed).

**Affordances**:
- P1: append-only v1 to v2 migration, `since` date printed, no back-fill; `scope` label (`^S\d{1,3}$` or `(none)`); `active` and `wait` accumulators at four levels (total, pitch, pitch/phase, pitch/phase/scope); online interval folding so memory is bounded by the pending cap; an interval that ends before the earliest still-pending start is folded into `activeMs`; wait is the part of a gap not covered by active time, so active plus wait never exceeds wall time; wait coverage counters (turns started and finished, gaps measured, unmeasured, over the cap, cap default 8 h); `transitions` per pitch (forward, repeat, back, other by pipeline order, never written as `gate.decided`); a bounded `trace` ring per pitch (32 entries, no text); a bounded `sessions` map (hashed session id, last `Stop` time, open turn and segment); the pitch cap becomes the LRU fold `token-attribution` S7 uses (cap 50); health counter `capture.dropped`.
- Critique rulings folded in: activity key includes `session_id` and `agent_id`; duplicate and reordered events have defined behavior (dropped or unmatched, never double-counted) with tests (`Stop` before `UserPromptSubmit`, double `SessionEnd`, finish after eviction); eviction picks the oldest `startedAt`, not insertion order, with a burst test proving totals are not corrupted; one clock source per vendor, negative or out-of-order gaps count as unmeasured; wait is labeled "elapsed between turns, not necessarily think-time".
- P2: `automaticCapture` becomes computed (`unconfigured` with no native events, `observed` within 7 days of the last native event, `stale` after); the report accepts version 2; no new tables.
- P3: event mapping and the active/wait definitions.

**Connections**: `recordWorkflowEvent` (lease, one atomic write) merges each event's interval into the open interval sets at the four levels, folds what can no longer overlap, and updates counters; the report reads the state read-only.

## Rabbit holes

**Resolved here**: active and wait computed online with the fold rule (exact; unmatched starts add nothing and are counted); inferred transitions kept in their own counters; join key is `token-attribution`'s resolver output with sentinels never joining (part B), legacy manual events count as `unjoinable`; a pending activity older than the 6 h TTL is evicted and counted.

**Pushed to /plan as risk**:
- The state scope uses an injected `deps.net.tryListen` in new tests so the lease-port flake (about 1 in 12) does not worsen; failures counted against one baseline — owner: state scope.
- Pinned tests (`workflow-metrics-report.test.mts:56,67,82`, the `unconfigured` literal) and the v2 fixture site in `workflow-metrics.test.mts` — owner: state scope; schema constant, emitter, refusal regex and fixtures change in one commit.
- Exporting a stable key function so A2 and part B agree with `token-attribution` — owner: after `token-attribution` S6; this pitch accepts the key as an opaque validated string until then.

**Pushed to no-go**: hooks, plugin and wiring (A2); the joined report (part B); gate decisions, must-fix counts and ships; Codex and Cursor.

## No-gos (this pitch)

- ✗ Reading or storing prompts, responses, tool arguments or transcript text.
- ✗ Writing an inferred event as `gate.decided`, `audit.finished` or `pitch.finished`.
- ✗ Changing the token snapshot schema or the lease mechanism, or merging the stores.
- ✗ Unbounded arrays or per-event logs; everything capped and tested under a 4 MiB state.
- ✗ Fabricated durations for unmatched or evicted activity, or back-filled history.

## Critique findings

Run 2026-10-19 (shared run, recorded in full in `workflow-usage-capture/shaping-draft.md`): S7, S8, S9 skeptic; TT-5, TT-6 knowledge; TT1/TT2 appetite (produced this split); X2, X3, X4, X20 cross-pitch. State-side dispositions are folded into the affordances above.

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-19, owner chose "split" and "Bet" at the critique gate.  
☐ Re-shape  
☐ Pass

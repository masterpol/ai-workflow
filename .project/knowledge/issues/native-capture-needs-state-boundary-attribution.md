---
id: native-capture-needs-state-boundary-attribution
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [metrics, hooks, attribution, lifecycle, compatibility]
related: [collector-metrics-lease-design, reversible-aggregates-store-their-routing]
source: workflow-usage-capture
severity: medium
resolved: true
confidence: low
---

# Issue: a native hook mapper cannot repair missing state-boundary attribution

The capture spike found three gaps in the already shipped state core: explicit resolver sentinels
folded into the non-matchable other bucket; label-free native activity starts did not inherit the
session segment; a new phase could not atomically replace that canonical segment.

The owner approved a prerequisite repair in workflow-metrics-state.mts. It preserves only the known
(unattributed) pitch and (none) scope sentinels, inherits labels from segment:<sessionId> only for a
native start without explicit labels, and closes/replaces a segment in one leased apply operation.
Replay and backwards-time guards apply to the whole transition. Finishes retain their start labels.
No persisted field, schema version, lease implementation or token collector source changed.

Keep turns label-free in the adapter. Do not read the token snapshot or re-derive finish labels from a
pointer that may have moved mid-turn. State normalization, attribution and interval matching must agree.
Evidence: capture log P0/S1, approved prerequisite plan, 63 state tests, five mutation probes and
workflow-metrics.md. The bounded pending cap still permits explicit, counted eviction.

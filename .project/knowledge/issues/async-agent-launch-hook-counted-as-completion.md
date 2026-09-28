---
id: async-agent-launch-hook-counted-as-completion
type: issue
created: 2026-09-25
updated: 2026-09-25
tags: [hooks, claude-code, telemetry, double-counting]
related: [bare-prefix-match-crosses-entities, reversible-aggregates-store-their-routing]
source: metrics-report-dimensions
severity: medium
resolved: true
---

# Issue: A hook that fires at launch was counted as a completion, so async agents counted twice

## Summary

The token collector treated every Claude `PostToolUse(Agent)` event as a completion. For an async
subagent that event fires at **launch** (`tool_response.status` is `async_launched`, `isAsync` is
true); the real completion arrives later as `SubagentStop`. Each async agent therefore produced two
records with different identity keys, and only the launch record carried the model.

## Symptoms

- Lifetime Claude completions rose by two after one async subagent.
- A per-model table would have shown one agent as a "known model" row plus an "unreported" row.
- Found only because the S0 spike captured real payload key names; nothing in the existing tests
  or the hook's documentation described the launch-time firing.

## Root Cause

The collector inferred what an event meant from its name and from payload fields it happened to
read, and never checked when the harness fires it. Foreground agents fire the same event at
completion, which made the assumption look correct.

## Solution

An async-launch `agent-result` is not a completion. It stores only a bounded model note keyed by
agent id (`agent:<id>`); the `SubagentStop` record reads the note and consumes it. Foreground
`agent-result` keeps its old behaviour. Not back-filled: earlier Claude counts stay inflated and the
report prints the date from which counts are comparable.

## Prevention

- Before building on a hook event, capture its real payload key names (values never) in the live
  harness and read the launch/completion semantics from that, not from the event's name.
- Give any join key between two events a prefix so integer-like ids cannot reorder an
  insertion-ordered map (the first version of the note map evicted the newest all-digit id).

## Related

[[bare-prefix-match-crosses-entities]] (identity mix-ups in the same collector),
[[reversible-aggregates-store-their-routing]].

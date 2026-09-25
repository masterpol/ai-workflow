# Deviations: metrics-report-dimensions

## D1 — Claude async agents are double-counted and split across model rows (found in S0, 2026-09-24)

**Plan said**: S1 adds dimension aggregates on top of the existing completion logic.
**Reality**: for an async Claude subagent, `PostToolUse(Agent)` fires at launch (`status: async_launched`) and `SubagentStop` fires at completion. The collector records both as separate completions with different identity keys (`tool_use_id` vs `session:agentId:subagent-complete`). Live evidence in `spike-payloads.md`, finding 3. The `agent-result` record carries the model; the `subagent-complete` record does not.
**Resolution (added to S1)**: an async-launch `agent-result` is not a completion. It stores only a note `agentModels[agentId] = model` in a bounded map (cap 50, prototype-free), and `SubagentStop` reads the model from that note when its own payload has none. A foreground `agent-result` (not async) keeps today's behavior, including the upgrade path. S1 also records `effort` from `effort.level` on every Claude event and takes `agent_type` from `SubagentStop`.
**Effect on existing data**: lifetime completion counts for Claude were inflated by async launches. Not corrected retroactively (no backfill, per the pitch's no-gos). The report's `since` date marks where the counts become comparable.
**Appetite impact**: none on file count (same two collector files). About +40 lines in S1.

## D2 — S4 built inline, not dispatched (2026-09-24)

**Plan said**: S4 dispatched as a `fast` subagent.
**Reality**: S4 was three small exact edits plus a doctor change; building it inline cost less than briefing a subagent. Exit criteria are unchanged and were run.
**Also**: the S4 criterion `grep -c "token-report" workflow-doctor.js >= 2` counts lines; both mentions are on one line, so it was checked as `grep -o ... | wc -l` = 2.

## D3 — Collector coverage criterion needed extra tests after S2 (2026-09-24)

Moving the renderers out (S2) removed the lines that had been covering the collector, dropping it to 89.44% against the 90% target from S1. Added tests for the second underflow guard, float rounding residue at zero, and lock reclaim (dead owner, orphaned lock). Result: 94.13%.

## D4 — S2 added a "By Vendor Unit" table (2026-09-24)

The plan kept the existing "By Vendor" header verbatim (pinned by `skill-defaults.test.js`), so per-vendor units live in a separate small table instead of a new column. The Usage headline is built from model rows so tokens and completions cover the same window (from `dimensions.since`).

## D5 — Audit cycle 1 fixes and deferrals (2026-09-24)

Added in cycle 1, beyond the plan: a name allow-list (names outside `[\w.:/@+-]` become `(other)`), id truncation to 128 characters, status allow-listing, cost and token bounds, realpath containment of `.project` and `.project/metrics`, a fixed JSON-parse error message, `agent:`-prefixed model-note keys, bounded plugin session maps, and a new test file `ai-framework/hooks/scripts/opencode-plugin.test.js` (registered in `workflow-doctor.js`). File count is now 11 code/doc files plus this pitch's records, still within the 15-file cap. Deferred to `_followups.md` with reasons: the lock-reclaim flaw and identity-key collisions, both in code this pitch does not modify. See `audit-cycle-1.md`.

## D6 — Cycle 2 security re-check could not be completed by a reviewer agent (2026-09-25)

Three dispatches produced no report (rate limit; two 600-second stalls). The main thread ran the same adversarial checks and a mutation pass itself and recorded them as author-run in `audit-cycle-2.md`. Those checks found and fixed one more gap (agent ids rendered as labels). The user should decide whether that is enough or whether to spend a third cycle on a fresh independent security pass.


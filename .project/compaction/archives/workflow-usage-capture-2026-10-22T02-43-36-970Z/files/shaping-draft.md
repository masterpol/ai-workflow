# Pitch: token-time-report

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected 14, about 1,150 LOC including tests). The seed is an epic, so it is decomposed: this file is **part A, capture**, written in full. Part B, the joined report, is a short note at the end.
**Stack**: backend (Node `.mts` hook adapter, the workflow-usage state module, the OpenCode plugin, hook wiring)

Recommended move at bet: this part matches the backlog followup `workflow-usage-capture` (`_followups.md:264`). Rename the directory to `.project/pitches/workflow-usage-capture/` and re-seed `token-time-report` from the part B note. Depends on `token-attribution` reaching S6 (pointer and phase-start event) first.

## Problem

The owner cannot see how long a pitch, phase or scope really took, how much of that was waiting on them, or how the flow went (repeats, going back, failures). Nothing records it. `workflow-usage.json` holds 2 events ever (1 `skill.used`, 1 `pitch.finished`, both `manual`, last on 2026-10-08). No hook, skill or plugin calls `recordWorkflowEvent`, and the report prints `Automatic capture: unconfigured` as a fixed literal. A joined time and token report built on that store would show nothing, so capture has to come first.

## Knowledge consulted

Graph query (`graphify.mts query "workflow usage phase time active wait token report join"`) returned only code nodes and was truncated. The entries below were found by tag and grep, then read.

- decisions/token-metrics-dimensions-design: effort means reasoning effort, not the fast/standard/deep profile. Every table states its unit. Values a harness does not report show `Unreported`. Applies to how turns and agent intervals are counted.
- decisions/collector-metrics-lease-design: one writer per metrics directory through the loopback lease, and it fails closed. Both stores live in the same directory, so they share one lease port. One process must never nest a second acquisition.
- patterns/display-buckets-are-not-lifecycle-identities (K3): `(other)` and `(unknown)` labels never match a start to a finish. Unmatched finishes stay visible, and composite keys stay unambiguous. This constrains the interval union and the part B join.
- patterns/reversible-aggregates-store-their-routing: the pitch LRU fold must keep totals and never clamp. A v1→v2 migration adds empty aggregates with a `since` date and back-fills nothing.
- patterns/allow-list-untrusted-labels-at-ingest-and-at-render, plus issues/async-agent-launch-hook-counted-as-completion: a start event (`SubagentStart`, `UserPromptSubmit`) is never a completion (rule `testing.md` "Event units").
- `.project/records/pitch-compression/workflow-usage-metrics.md`: the shipped core's no-gos are no raw event journal, no prompts or arguments, and no fabricated coverage. It names capture and adoption as separate followups.
- decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers: the standing no-gos apply unchanged.
- Rules: `machine-data-format.md` (the state is read by scripts only, so it stays JSON); `data-modeling.md` (append-only migration with a lossless round trip); `canonical-mirror-sync.md` (not triggered, because no skill or agent file is edited). `.project/rules/` has only `README.md`.

## Seed claims checked against the code

1. **"Active = union of agent and phase intervals."** The store keeps no intervals. It keeps a summed `elapsedMs` per row plus up to 64 pending starts (`workflow-metrics-state.mts:5`, `:146`). A union cannot be computed later at render time, so it has to be computed when events are ingested.
2. **"Wait = gate pauses."** `phase.paused` and `phase.resumed` only flip a status. No paused duration is ever added up, and nothing emits those events. Gate pauses cannot be seen from hooks. The gap between turns (`Stop` to the next prompt) can be seen. Claude's main-session `Stop` is not wired today (`.claude/settings.json` has no `Stop` or `UserPromptSubmit` entry).
3. **"Ordered flow trace."** The store has "no raw event journal" by contract (`integrations/workflow-metrics.md:98`). A trace needs a new bounded ring.
4. **"Effort per step beside tokens."** Effort exists only in the token snapshot's per-vendor `efforts` dimension: Claude 1,415 of 1,468 completions carry an effort level, OpenCode 23 of 1,432. `token-attribution`'s planned `flows` leaf holds vendor rows only (`token-attribution/plan.md` S7), with no effort.
5. **"Gate decisions, must-fix counts."** Nothing emits `gate.decided` or `audit.finished`. The report says gate counts are "explicit workflow gate events, not decisions inferred from chat" (`workflow-metrics-report.mts:68`).
6. **"Cache hit rate = cache read ÷ (input + cache read)."** That formula only holds where `input` excludes cached tokens (Anthropic-style usage). OpenAI-style usage (Codex, some OpenCode providers) counts cached tokens inside `input`. The token snapshot's `total` also excludes `cacheRead` (6.4M total against 155.8M cache read), so "tokens per scope" has to name its unit. This belongs to part B.
7. **"~9 files."** Capture alone is 14 files. Seed plus capture is about 23, which makes this an epic.

## Solution sketch (breadboard, NOT wireframe)

**Places**:
- P1 Capture adapter `ai-framework/hooks/scripts/workflow-capture.mts` (new): the Claude hook entry, which writes only `workflow-usage.json`.
- P2 OpenCode plugin `.opencode/plugins/token-consumption.ts`: adds usage events beside its existing token calls.
- P3 Usage state `workflow-metrics-state.mts`: workflow-usage schema version 2.
- P4 Usage report and contract (`workflow-metrics-report.mts`, `integrations/workflow-metrics.md`): capture status only.
- P5 Wiring: the `ai-framework/hooks/hooks.json` template and the live `.claude/settings.json`.

**Affordances per place**:
- P1 maps hook events to existing event kinds, so no new kind is invented:
  - `SessionStart` maps to `session.started`.
  - `UserPromptSubmit` maps to `agent.started` with `agentKind: primary` (one turn). `Stop` maps to `agent.finished` (completed).
  - `SubagentStart` maps to `agent.started` with `agentKind: subagent`, if the spike confirms the event exists. `SubagentStop` maps to `agent.finished`.
  - A phase start, detected on the same registrations as `token-attribution`'s phase-start event, closes the session's open phase segment (`phase.finished`) and opens a new one (`phase.started`). It also appends one transition to the pitch trace.
  - `SessionEnd` closes the open turn and segment as `cancelled`.
  - Pitch, phase and scope come from **the same exported resolver** that `token-attribution` uses, called directly. P1 never reads the token snapshot.
  - Field selection is explicit: `session_id`, `hook_event_name` and `agent_id`/`agent_type` only. The `prompt` field is never read or stored.
  - stdout stays empty, the exit code is always 0, and stderr carries fixed text only.
- P2: `session.step.started` and `session.step.ended`/`failed` map to subagent or primary agent intervals, and a failed step gives outcome `failed`. A user `message.updated` with `time.created` closes a wait gap. A skill-use phase start applies the same resolver rule.
- P3, schema version 2 (append-only migration from 1, `since` date printed, no back-fill):
  - A `scope` label (`^S\d{1,3}$` or `(none)`).
  - `active` and `wait` accumulators at four levels: total, pitch, pitch/phase and pitch/phase/scope.
  - Wait coverage counters: turns started and finished, gaps measured, gaps unmeasured, gaps over the cap.
  - `transitions` per pitch (forward, repeat, back, other, by pipeline order).
  - A bounded `trace` ring per pitch: phase, scope, time and transition class; 32 entries, no text.
  - A bounded `sessions` map: hashed session id, last `Stop` time, open turn and open segment.
  - The pitch cap changes from first-come to the LRU fold `token-attribution` S7 uses, cap 50.
- P4: `automaticCapture` becomes a computed status: `unconfigured` with no native events, `observed` within 7 days of the last native event, `stale` after that. The literal and the tests pinned to it (`workflow-metrics-report.test.mts:56,67,82`) change. The report accepts version 2. No new tables are added, because rendering belongs to part B. The contract doc gains the event mapping and the active/wait definitions.
- P5: Claude registrations for `SessionStart`, `UserPromptSubmit`, `Stop`, `SessionEnd` and `SubagentStop` (plus `SubagentStart` if the spike confirms it), each with an explicit `timeout`. Phase start is a second command in `token-attribution`'s phase-start entries. Template and live copies are byte-consistent.

**Connections**:
1. A hook fires, P1 or P2 selects the needed fields, the resolver returns the key, and the event goes to `recordWorkflowEvent`. That runs under the existing lease and writes `workflow-usage.json` in one atomic write.
2. At ingest, P3 merges the event's interval into the open interval set for each of the four levels.
3. A merged interval that ends before the earliest still-pending start can never be overlapped again. It is folded into `activeMs`. Only intervals a pending activity could still overlap are kept, so memory is bounded by the pending cap of 64.
4. A wait gap (`Stop` to the next prompt in the same session) is held in the same structure. When it is folded, only its part not covered by active time counts as `waitMs`. That keeps active and wait disjoint, and their sum is never more than wall time.
5. Part B later reads `workflow-usage.json` and `token-consumption.json` read-only and joins them on the key.

## Rabbit holes

**Resolved here** (with answer):
- **Capture in this pitch or a prerequisite?** It is a prerequisite, so it is part A. The evidence: 2 manual events ever, zero callers, and a fixed `unconfigured` literal. Capture alone is 14 files, and the joined report adds about 9 more. Capture also needs weeks of real data before a report is worth judging. A report built first would ship tables of `Unavailable`.
- **Join key when the stores' labels differ.** Today they do differ:
  - `workflow-usage` accepts any `[\w.:/@+-]{1,80}` pitch or phase, has no scope, and folds pitch 51 onward into `(other)` forever.
  - `token-attribution` accepts a slug with a real directory, the closed `PHASES` set and `^S\d{1,3}$`.

  The answer:
  - The canonical key is `token-attribution`'s resolver output, and P1 and P2 call that same function, so new events agree by construction.
  - P3 adds `scope` and the LRU pitch fold.
  - Part B joins on exact equality of the three components, held in nested maps with no string join.
  - The sentinels `(other)`, `(unknown)` and `(unattributed)` never join, not even to themselves (K3). Each store keeps its own visible unattributed row. Legacy manual events with non-canonical labels count as `unjoinable`.
- **Active and wait without unbounded logs.** Both are computed online with the fold rule in Connections. Exact: an interval with no recorded start (for example a Claude `SubagentStop` without a start event) adds nothing and counts as unmatched. A pending activity older than the TTL (6 h, the same as the pointer's) is evicted and counted, so a crashed session cannot block folding forever. Wait is a lower bound by construction: missing `Stop` or prompt events leave a gap unmeasured, and the gap is counted in coverage.
- **Inferred transitions are not gate decisions.** Forward, repeat and back are derived from the order of phase starts and stored in their own `transitions` counters. They are never written as `gate.decided`, so the existing report contract ("not decisions inferred from chat") stays true.

**Pushed to /plan as risk** (with named owner):
- **Hook event availability and order:** whether `SubagentStart` exists, the `Stop` and `SessionEnd` payload key names, whether `UserPromptExpansion` fires before `UserPromptSubmit` for a slash command, the OpenCode user-message `time.created`, and the cost of the added Node process per prompt and turn. Owner: plan S1 spike, with key names only (the same method as `token-attribution` S1). If `SubagentStart` is absent, Claude subagent time is `Unavailable` and only turns count.
- **Dependency surface on `token-attribution`:**
  - (a) the resolver must be exported (a one-line change, or that pitch's S6 exports it);
  - (b) the `Stop` registration: if that pitch's S3 gate approves `session-turn`, P5 adds a second command to the same entry, and otherwise registers `Stop` for timing only, with no transcript read;
  - (c) **effort in the `flows` leaf**: recommend that `token-attribution` S7 store per-effort completions and tokens in each flow leaf before it is built. Otherwise part B needs token snapshot revision 4.

  Owner: the coordinator, before `token-attribution` S6/S7, then re-checked at this plan's S1.
- **Wait cap and lease load:** a long gap (overnight) needs a cap value (default proposal 8 h; anything above is counted at the cap and in `gaps over cap`). New capture tests must use an injected `deps.net.tryListen`, so the lease-port flake (about 1 in 12) does not get worse. Owner: the plan's state scope.

**Pushed to no-go** (deferred):
- Explicit gate decisions, audit must-fix counts and ships. Hooks cannot see them, and asking skill prose to emit them can be skipped (`token-attribution` critique A2). Part B decides between deriving them from records (shared with `state-deep-evidence`, which already plans revises, audit cycles and must-fix counts from records) and leaving them `Unavailable`.
- Codex capture: Codex `UserPromptSubmit` is owned by the Orca entry, and `orca-start-codex-hook.test.mts:210-214` pins exactly one entry. It goes to a followup with the Codex pointer pair.

## No-gos (this pitch)

- ✗ Reading or storing prompts, responses, tool arguments or transcript text. The `prompt` field is never selected, and a marker test greps every file under `.project/metrics` and stderr.
- ✗ Writing an inferred event as `gate.decided`, `audit.finished` or `pitch.finished`, or adding emission steps to skill or phase prose.
- ✗ The joined report, efficiency ratios, effort display, new report tables, `/state` changes (part B).
- ✗ Codex or Cursor capture.
- ✗ Touching the token snapshot schema or the lease mechanism, or merging the stores. P1 never reads `token-consumption.json` (the existing `workflow-metrics.test.mts` guards stay green).
- ✗ Unbounded arrays or per-event logs. The trace ring, sessions map and interval sets are capped and tested under a 4 MiB state.
- ✗ Fabricated durations for unmatched or evicted activity, or back-filled history. Version 2 counts start at the migration date.
- ✗ Blocking the agent: hooks always exit 0 and print nothing to stdout.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-10-19 by five perspective subagents (shared with `state-deep-evidence` and `state-ai-authoring`). Advisory. Rulings marked "Ruling" were recorded as defaults by the coordinator and are open to the owner at the bet.

| ID | Perspective | Severity | Disposition |
|----|-------------|----------|-------------|
| S7 | skeptic | high | Addressed in /plan: the activity key includes `session_id` and `agent_id`; defined behavior and tests for duplicate and reordered events (`Stop` before `UserPromptSubmit`, double `SessionEnd`, finish after eviction); eviction picks the oldest `startedAt`; a burst test proves totals are not corrupted |
| S8 | skeptic | high | Addressed: one clock source per vendor; negative or out-of-order gaps count as unmeasured; wait is labeled "elapsed between turns, not necessarily think-time"; a skewed-clock test; the scope label is never re-derived from the pointer after a mid-turn phase change |
| S9 | skeptic | medium | Addressed: a lease-busy event increments a visible `capture.dropped` health counter; a small bounded retry inside the hook timeout; p95 hook latency measured in the first spike |
| TT-1 | knowledge-historian | high | Addressed: exact registration string tested under `sh`, `AI_WORKFLOW_RUNNER` prefix, explicit deadline, real payloads captured before wiring; the payload spike is the first scope of /plan |
| TT-2..TT-6 | knowledge-historian | medium | Addressed in /plan: coexistence check with the existing `PreToolUse` and `UserPromptExpansion` hooks and a per-prompt cost budget; a doctor test per new registration on exact invocation; explicit two-file edit step and test for the hooks template and live settings; lease-identity patterns cited; the v1 to v2 migrator edits the version token and re-reads through the strict reader |
| TT1, TT2 | appetite-auditor | medium | Open for the owner: part A projects to about 1,500 LOC (1.0× the cap), not the declared 1,150; options are split into A1 (state v2 and report, ~800 LOC) and A2 (capture adapter, wiring, plugin, ~700 LOC), or defer the `trace` ring and `transitions` to part B at the cost of a second schema bump |
| X2 | cross-pitch-projector | high | Ruling: `state-deep-evidence` owns record-derived audit, must-fix and revision counts; this pitch keeps only event-derived `transitions` (`back`, `repeat`) |
| X3 | cross-pitch-projector | high | Ruling: `token-attribution`'s resolver, exported by its S6, is the single owner; this pitch adds no separate resolver export |
| X4 | cross-pitch-projector | high | Ruling: `state.json` owns token totals and by-model rows; the flow report holds per-flow rows only and is not read by the AI `tokens` slot |
| X6 | cross-pitch-projector | high | Ruling: `token-attribution`'s S3 gate decides the Claude `Stop` registration and its unit first; this pitch re-plans its registrations after that; one owner per `Stop` entry |
| X8, X12, X16, X20 | cross-pitch-projector | medium | Acknowledged: `token-consumption.mts` frozen until `token-attribution` S10; ship evidence comes from `state-deep-evidence` history or is `unavailable` on truncation; `workflow-v3-rollout` re-runs its dry run after this pitch's hooks; failures counted against one lease-flake baseline |
| X21 | cross-pitch-projector | acknowledged | Acknowledged: the recommended rename to `workflow-usage-capture` is the owner's call at the bet |

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.

## File projection (part A)

1. `ai-framework/scripts/workflow-metrics-state.mts`
2. `ai-framework/scripts/workflow-metrics-state.test.mts`
3. `ai-framework/scripts/workflow-metrics-report.mts`
4. `ai-framework/scripts/workflow-metrics-report.test.mts`
5. `ai-framework/hooks/scripts/workflow-capture.mts` (new)
6. `ai-framework/hooks/scripts/workflow-capture.test.mts` (new)
7. `ai-framework/hooks/hooks.json`
8. `.claude/settings.json`
9. `.opencode/plugins/token-consumption.ts`
10. `ai-framework/hooks/scripts/opencode-plugin.test.mts`
11. `ai-framework/integrations/workflow-metrics.md`
12. `ai-framework/hooks/scripts/token-consumption.mts` (resolver export only; 0 if `token-attribution` exports it)
13. `CHANGELOG.md` and 14. `VERSION` (through `changelog.mts` at /ship)

Watch: `workflow-metrics.test.mts`, the CLI test, may need a version-2 fixture. That would be file 15, still within the cap.

## Decomposition note: part B, `token-time-report` (re-seed after part A ships and holds data)

- **Where it lives:** a new read-only joiner, `ai-framework/scripts/flow-report.mts` plus a test. It reads both stores under **one** lease acquisition, because they share a directory and so a port. It writes `.project/metrics/flow-report.{json,md,html}`. `/state` links it with one line in `state-pages.mts` (as it already does for the two metrics pages).
  - Ruling (critique X4): token totals and by-model rows live in `state.json`, added by `state-deep-evidence`. The AI `tokens` slot reads `state.json` only. The flow report holds per-flow rows only, and `state-deep-evidence`'s `tokens.flows` may point at it.
- **Content**, per pitch, then phase, then scope:
  - tokens by vendor and effort mix;
  - active time and wait, with wait as a lower bound plus its coverage counts;
  - transitions, repeats and failures, and the trace;
  - ratios with a per-vendor cache-hit formula (seed claim 6), so vendors with different `input` meanings are never pooled;
  - output ÷ input, and tokens per scope with the unit named;
  - tokens per shipped pitch, with ship evidence from `done-work.md` names, since no ship event is captured.
- **Open for its shaping:** record-derived gate and must-fix counts (coordinate with `state-deep-evidence`). Projected about 9 files, a big-batch.

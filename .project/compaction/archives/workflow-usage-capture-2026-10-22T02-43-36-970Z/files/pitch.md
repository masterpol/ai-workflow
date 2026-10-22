# Pitch: workflow-usage-capture

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected 8 files, ~700 LOC including tests)
**Stack**: backend (Node `.mts` hook adapter, OpenCode plugin, hook wiring, doctor check)

Part A2 of the split of `token-time-report`; matches backlog followup `workflow-usage-capture` (`_followups.md:264`). Full shaping draft with every correction, risk and critique row: `shaping-draft.md` in this folder (read it first; this pitch carries only the capture half). Depends on `workflow-usage-state` (A1: the state it writes into) and on `token-attribution` S6 (the exported resolver and the phase-start event) and its S3 gate (the `Stop` registration). Part B is the re-seeded `token-time-report`. Bet 2026-10-19.

## Problem

`workflow-usage.json` holds 2 manual events ever. No hook, skill or plugin calls `recordWorkflowEvent`, so the report prints "Automatic capture: unconfigured". Until real events flow in, no time or flow report can have data.

## Knowledge consulted

Same list as the shaping draft; the ones that decide this pitch:
- patterns/a-blocking-hook-owns-its-runner-and-its-deadline: exact registration string tested under `sh`, `AI_WORKFLOW_RUNNER=node node ...` prefix so an absent runner cannot fail open, explicit deadline, real payloads captured before wiring.
- decisions/orca-auto-start-design: `PreToolUse` (Skill) and `UserPromptExpansion` already exist in the same settings file and cost about 0.5 s per probe; coexistence check and a per-prompt Node cost budget.
- issues/substring-hook-wiring-check-accepts-echoed-commands: the doctor must check each new registration on exact invocation.
- issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check: the `hooks.json` template and the live `.claude/settings.json` stay byte-consistent through an explicit two-file step.
- issues/async-agent-launch-hook-counted-as-completion (a start event is never a completion); decisions/collector-metrics-lease-design.

## Solution sketch (breadboard, NOT wireframe)

**Places**: P1 `ai-framework/hooks/scripts/workflow-capture.mts` (new) with `workflow-capture.test.mts` (new); P2 `.opencode/plugins/token-consumption.ts` with `opencode-plugin.test.mts`; P3 wiring in `ai-framework/hooks/hooks.json` and the live `.claude/settings.json`; P4 a doctor wiring test.

**Affordances**:
- P1 maps hook events to existing event kinds, inventing none: `SessionStart` to `session.started`; `UserPromptSubmit` to `agent.started` (primary turn) and `Stop` to `agent.finished`; `SubagentStart` to `agent.started` (subagent) if the spike confirms it, `SubagentStop` to `agent.finished`; a phase start (the same registrations as `token-attribution`'s phase-start event) closes the open phase segment and opens a new one; `SessionEnd` closes the open turn and segment as `cancelled`. Pitch, phase and scope come from the exported resolver of `token-attribution`, called directly; P1 never reads the token snapshot.
- Field selection is explicit: `session_id`, `hook_event_name`, `agent_id`/`agent_type` only; `prompt` is never read. stdout empty, exit 0, stderr fixed text only.
- Critique rulings folded in: a lease-busy event increments `capture.dropped` with a small bounded retry inside the hook timeout; p95 hook latency is measured in the first spike; the scope label is never re-derived from the pointer after a mid-turn phase change; one clock source per vendor.
- P2: `session.step.started`, `ended`, `failed` map to agent intervals (failed gives outcome `failed`); a user `message.updated` with `time.created` closes a wait gap; a skill-use phase start applies the same resolver rule.
- P3: registrations for `SessionStart`, `UserPromptSubmit`, `Stop`, `SessionEnd`, `SubagentStop` (plus `SubagentStart` if confirmed), each with an explicit `timeout`; phase start is a second command in `token-attribution`'s phase-start entries; one owner per `Stop` entry, decided by `token-attribution`'s S3 gate.

**Connections**: hook fires, P1 or P2 selects fields, the resolver returns the key, `recordWorkflowEvent` writes under the existing lease in one atomic write; A1's state folds the interval.

## Rabbit holes

**Resolved here**: capture is a prerequisite of the joined report; the resolver is shared, not duplicated; inferred transitions are never gate decisions.

**Pushed to /plan as risk**:
- First scope is the payload spike (key names only): whether `SubagentStart` exists, `Stop` and `SessionEnd` payload keys, whether `UserPromptExpansion` fires before `UserPromptSubmit` for a typed command, OpenCode user-message `time.created`, hook latency p95. If `SubagentStart` is absent, Claude subagent time is `Unavailable` and only turns count — owner: S1 spike.
- Dependency surface on `token-attribution`: resolver export (its S6), `Stop` ownership (its S3), and whether its flow leaves store effort (recommended, otherwise part B needs another token snapshot revision) — owner: coordinator before `token-attribution` S6/S7, re-checked at S1.
- Per-prompt latency and `UserPromptSubmit` stalls: a hook that blocks the prompt is unacceptable; deadline and cost budget — owner: P1/P3 scope.

**Pushed to no-go**: Codex capture (the Codex `UserPromptSubmit` is owned by the Orca entry and a test pins exactly one entry; goes to the Codex pointer followup); Cursor; gate decisions, must-fix counts, ships.

## No-gos (this pitch)

- ✗ Reading or storing prompts, responses, tool arguments or transcript text; a marker test greps every file under `.project/metrics` and stderr.
- ✗ Adding emission steps to skill or phase prose.
- ✗ Touching the token snapshot schema, the lease mechanism or the state schema (A1).
- ✗ Blocking the agent: always exit 0, nothing on stdout.
- ✗ Registrations that fail open when `AI_WORKFLOW_RUNNER` is absent or that are checked by substring.

## Critique findings

Run 2026-10-19 (shared run, recorded in full in `shaping-draft.md`): S9 skeptic; TT-1..TT-4 knowledge; X6, X8, X16 cross-pitch. Capture-side dispositions are folded into the affordances and risks above.

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-19, owner chose "split" and "Bet" at the critique gate. Sequence after `workflow-usage-state` and `token-attribution` S3/S6.  
☐ Re-shape  
☐ Pass

# S0 spike: which harness payloads expose which fields

**Date**: 2026-09-24. Key names and value types only; no payload values were recorded. Claude sections are **verified live**: a throwaway hook, wired temporarily into `.claude/settings.json` and removed afterwards (`git diff` on the file is empty), logged the key paths of real events fired by a trivial subagent and a Skill call in this session. OpenCode is read from the installed plugin and SDK type definitions (`@opencode-ai/plugin` 1.17.20), not from a live run. Codex was not inspected beyond its version (codex-cli 0.156.1).

Answer codes: `payload` = in this event's payload; `payload-elsewhere: <event>` = in another event of the same harness, joinable by id; `not exposed`; `unverified`.

## Claude SubagentStop

| Field | Answer | Key |
|---|---|---|
| agent type | payload (verified) | `agent_type` |
| effort | payload (verified) | `effort.level` (string) |
| model | payload-elsewhere: PostToolUse(Agent) | not present here |
| agent id | payload (verified) | `agent_id`, joins to `tool_response.agentId` |
| skill | not exposed | — |
| other keys seen | | `agent_transcript_path`, `transcript_path`, `last_assistant_message` (text: never read or stored), `stop_hook_active`, `permission_mode`, `session_id`, `prompt_id`, `background_tasks[]`, `session_crons[]` |

## Claude PostToolUse(Agent)

| Field | Answer | Key |
|---|---|---|
| model | payload (verified) | `tool_response.resolvedModel` |
| agent type | payload (verified) | `tool_input.subagent_type` |
| effort | payload (verified) | `effort.level` |
| launch vs completion | payload (verified) | `tool_response.isAsync` (boolean) and `tool_response.status`; an async spawn reports status `async_launched` at launch, so this event is not a completion for async agents |
| agent id | payload (verified) | `tool_response.agentId` |
| never store | | `tool_input.prompt`, `tool_response.prompt`, `tool_response.description` |

## Claude PostToolUse(Skill)

| Field | Answer | Key |
|---|---|---|
| skill name | payload (verified) | `tool_input.skill` |
| effort | payload (verified) | `effort.level` |
| success | payload (verified) | `tool_response.success` |
| never store | | `tool_input.args` (free text) |

## OpenCode (types only, unverified live)

| Field | Answer | Key |
|---|---|---|
| model | payload (types) | `AssistantMessage.providerID` / `modelID`; already used by the plugin |
| agent | payload (types) | `chat.message` `input.agent`; already used |
| effort | payload-elsewhere: `chat.message` (types) | `input.variant` (string, optional). Whether `variant` is the reasoning effort for every provider is unverified |
| skill | unverified | `tool.execute.after` gives `input.tool` (name) and `input.args`; the tool id OpenCode uses for skills is not in the type definitions |
| tokens and cost | payload (types) | `AssistantMessage.tokens`, `cost` |

## Codex (unverified)

| Field | Answer |
|---|---|
| model, effort, agent type, skill | unverified. The bundle's own docs state Codex completion hooks carry no token or cost fields; nothing here proves otherwise. Treated as `not exposed`, so reports show "Unreported". |

## Findings that change the plan

1. **No transcript read is needed.** Effort, agent type and model are all in payloads, so the pitch's transcript question is closed: no transcript is opened. This is inside the user's 2026-09-24 decision (payload sources first).
2. **Claude model needs a join.** `SubagentStop` has no model. `PostToolUse(Agent)` has it as `tool_response.resolvedModel` and shares an id with `SubagentStop` (`tool_response.agentId` = `agent_id`). But for async agents the `PostToolUse(Agent)` event fires at **launch**, not completion.
3. **The current collector double-counts async Claude agents.** Live evidence: after one async subagent the lifetime count rose by two, one record from the launch event (`async_launched`, has model, no agent completion) and one from `SubagentStop` (completed, no model). Any per-model table built on those records would split one agent into a "model known" row and an "(unreported)" row. The plan's S1 needs a small addition for this (logged as deviation D1 in `deviations.md`).
4. **Claude and Codex agents cannot be joined to a main-session model.** No event carries the main session's model; the main session is not a completion. Out of scope.
5. **Codex wiring stays unchanged** (`.codex/hooks.json` is not touched), which keeps the file count at 12.
6. **OpenCode `variant` and skill tool id are unverified** and are wired defensively in S3: read the field if present, otherwise record "Unreported"; match the skill tool name case-insensitively and only record a string name. A live OpenCode run (not done here, it would spend model tokens) would verify both.

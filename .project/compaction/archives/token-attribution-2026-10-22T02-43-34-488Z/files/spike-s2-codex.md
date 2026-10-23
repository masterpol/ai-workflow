Verdict: session-log

# S2 spike: Codex usage availability

Scope: key names and types only. No values, session ids or absolute paths recorded.
Sources: Codex CLI 0.163.0 hook input JSON schemas embedded in the binary, the Codex hooks
docs (redirected to the learn.chatgpt.com host), the repo's `.codex/hooks.json`, the
`orca-start-codex-hook` hook and its test, and the local Codex state database (schema only).
Not done: no live Codex session was run, so no payload was captured at runtime.

## Q1: Does SubagentStop carry numeric usage?

No. SubagentStop input keys (docs and binary schema agree):

- `session_id`: string
- `transcript_path`: string | null
- `agent_transcript_path`: string | null
- `agent_id`: string
- `agent_type`: string
- `turn_id`: string
- `cwd`: string
- `hook_event_name`: string
- `model`: string
- `permission_mode`: string
- `stop_hook_active`: boolean
- `last_assistant_message`: string | null

No hook input documents token or cost fields.

## Q2: Is there a session log with usage events?

Yes, per the binary, but not verified against a real file. Evidence:

- SubagentStop provides `agent_transcript_path` (string | null), a path to the subagent's own log.
  The parent `transcript_path` is also present.
- The binary contains rollout-file naming and item types (`session_meta`, `turn_context`, `token_count`
  event).
- The binary contains usage structs with these keys: `total_token_usage`, `last_token_usage`,
  `model_context_window`, and under each usage object `input_tokens`, `cached_input_tokens`,
  `cache_write_input_tokens`, `output_tokens`, `reasoning_output_tokens`, `total_tokens` (all integer).
- The local state database `threads` table has `rollout_path` and `tokens_used` columns.
- No `sessions/` directory exists locally, so no rollout sample was available to confirm the
  on-disk key shape. This is the main residual risk.

## Q3: Does UserPromptSubmit carry a session id that SubagentStop repeats?

The schemas say both carry `session_id` (string). Whether the subagent's `SubagentStop.session_id`
equals the parent's `UserPromptSubmit.session_id` is not verified at runtime. The shared-field
design suggests yes, so a parser should key on `session_id` plus `agent_id` and fall back when they differ.

## Parser estimate (session-log path)

Steps: read `agent_transcript_path` as JSONL, parse each line, keep the last `event_msg` with a
`token_count` payload, read its `info.total_token_usage` integers, and take `model` from the latest
`turn_context`. Null path or missing event means `unavailable`.

Estimate: about 45 LOC, under the ~60 LOC deferral threshold, so the session-log route is not deferred.
The estimate assumes the rollout shape above. If a real rollout differs, revisit.

## Repo state

- `.codex/hooks.json` registers `SubagentStop` (token-consumption, `--event subagent-complete`) and
  `UserPromptSubmit` (Orca start gate, `orca-start-codex-hook.mts`).
- `harnesses.md` currently says Codex hooks expose no token fields. That holds for the hook payload
  only and is stale if the session-log route is adopted.
- `token-consumption.mts` reads `usage`, `tokens`, `session_id` from the payload. Codex's payload has
  no `usage`, so Codex records `unavailable` today.

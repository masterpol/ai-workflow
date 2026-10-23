# Spike S1: pointer placement, session mapping, worktrees, lease-flake baseline

Method: read of the hook scripts, the wiring files, the OpenCode plugin and the existing test fixtures (key names only), plus the documented Claude Code hook input fields. No live capture run was made. Where a conclusion rests on documentation or fixtures rather than an observed payload, it says so. No payload values, ids or absolute paths are recorded here.

Placement: snapshot-map
Baseline failures: 0/12

## Claude

Key names that reach each hook (all hooks receive `session_id`, `transcript_path`, `cwd`, `hook_event_name`):

| Hook | Keys relevant to attribution | Evidence |
|---|---|---|
| `UserPromptExpansion` | `expansion_type`, `command_name`, `command_args` | read in `orca-start-hook.mts` (slash commands only: `expansion_type` equals `slash_command`) |
| `PreToolUse(Skill)` and `PostToolUse(Skill)` | `tool_name`, `tool_input.skill`, `tool_input.args`, `tool_use_id` | `orca-start-hook.mts` reads `tool_input.skill` and `tool_input.args`; the collector reads `tool_input` for skill-use |
| `SubagentStop` | `agent_id`, `agent_type`, `agent_transcript_path` (documented), `session_id` | collector reads `agent_id`, `agent_type`, `session_id`; fixtures use `session_id` plus `agent_id` |
| `PostToolUse(Agent)` | `tool_name`, `tool_input.subagent_type`, `tool_response` (`agentId`, `isAsync`), `tool_use_id`, `session_id` | collector reads each of these |

Findings:

- The subagent hooks carry the session id of the session that launched them. The collector already derives `sessionId` from `session_id` for both `SubagentStop` and `PostToolUse(Agent)`, and the existing fixtures place `session_id` next to `agent_id`. A subagent therefore resolves to the parent's pointer by a plain lookup on `session_id`; no parent-id field is needed. This is documentation- and fixture-based, not captured.
- Hooks that run inside a subagent carry `agent_id`; `orca-start-hook.mts` returns early on it. The new phase-start event must do the same: a subagent that invokes a skill must never replace the parent's pointer.
- A slash command fires `UserPromptExpansion`. A model-initiated skill fires `PreToolUse`/`PostToolUse(Skill)`. The same phase can reach the collector through both paths, so a phase-start write must be idempotent for the same session, phase, pitch and scope (it refreshes the timestamp only).
- `command_args` and `tool_input.args` are free text. The collector must parse them, keep only a validated slug and a validated scope token, and drop the rest (the existing `skill-use` event already promises args are never stored).
- Recommendation: register one new `UserPromptExpansion` entry (`matcher: "*"`) in `ai-framework/hooks/hooks.json` and `.claude/settings.json` that calls the collector with a `phase-start` event, and reuse the existing `PostToolUse(Skill)` wiring by teaching `skill-use` to also emit the phase-start when the skill name is in the phase set. Both files are already in S6's budget.

## OpenCode

- The plugin imports `recordEvent` in process and passes only `raw: { session_id }` (plus `message_id`/`tokens` on completions). It never passes a parent session id.
- Skill use arrives from the tool hook (V1 `tool.execute.after`, V2 `tool.hook("execute.after")`) with `sessionID` and the skill name from `args.name` or `input.name`. No skill arguments are forwarded, so pitch and scope cannot come from OpenCode invocations today.
- Completions arrive from `message.updated` (V1) and `session.step.ended`/`session.step.failed` (V2). Their payloads, as typed in the plugin, carry `sessionID` and `assistantMessageID` but no parent session field.
- Answer to the child-session question: an OpenCode child session (a subagent task) has its own `sessionID`, and nothing the plugin passes today lets the collector link it to its parent. The completion would not match the parent's pointer and would be `(unattributed)`.
- Recommendation on the contingent plugin pair (`.opencode/plugins/token-consumption.ts` plus `ai-framework/hooks/scripts/opencode-plugin.test.mts`): needed only to attribute child-session completions. It would subscribe to the session-created event, pass the child's parent id with the first event, and let the collector store a child-to-parent link (bounded, inside the same map). Recommend deferring the pair to a named followup unless the owner wants OpenCode subagent spend attributed in this pitch. Primary-session OpenCode completions attribute correctly without it. A second reason to defer: OpenCode can only start a phase from the skill tool, which forwards no arguments, so its pitch would come from the status-table fallback anyway. Unverified: whether the V1 and V2 session-created events expose a parent id under that name; confirm with a live capture before building the pair.

## Codex

- `UserPromptSubmit` carries `hook_event_name`, `session_id` and `prompt` (fixture keys in `orca-start-codex-hook.test.mts`). The phase and arguments come from the leading `/phase` or `$phase` token of `prompt`.
- `SubagentStop` fixtures carry `session_id` and `agent_id`, so a Codex completion resolves to the `UserPromptSubmit` pointer by `session_id`, if a pointer is ever written.
- Writing a Codex pointer requires a second `UserPromptSubmit` entry (or a change to the existing one) in `.codex/hooks.json`, and `orca-start-codex-hook.test.mts` pins exactly one `UserPromptSubmit` and one `SubagentStop`. That is the Codex contingent pair. Whether Codex completions carry numeric usage at all is S2's question.
- Recommendation: do not choose the Codex pair unless S2's verdict is `payload` or `session-log`. With `Unavailable` usage a pointer would attribute nothing but a completion count. Defer the wiring to `_followups.md`.

## Worktrees

- Claude resolves the root from `$CLAUDE_PROJECT_DIR`; Codex resolves it with `git rev-parse --show-toplevel`. In a linked worktree both give the worktree directory, so each worktree writes its own `.project/metrics` and its own snapshot. A pointer map inside the snapshot is therefore per worktree too, which is consistent: the session that started a phase and the completions it causes run in the same worktree.
- Consequence: totals for one pitch built across several worktrees are split across snapshots. Nothing is lost, but nothing joins them.
- Recommendation: document the limit (S9) and do not resolve to the main checkout. Resolving would add a git spawn to every hook, widen the trust boundary (one checkout writing into another), and cut across the metrics path-safety checks that pin the directory under the root. Revisit only if the owner works in many worktrees per pitch.

## Pitch, phase and scope source

Proposal, confirmed against the code with the amendments marked:

- Phase: the command or skill name when it is in the phase set also used by both orca-start hooks (`shape`, `shape-lite`, `critique`, `plan`, `build`, `audit`, `ship`, `cooldown`, `fix`, `resume`, `switch`, `checkpoint`). The collector should hold its own copy of the set (the orca-start sets are file-local constants) and a test should assert the three copies agree.
- Pitch: the first argument token if it matches a slug pattern and `.project/pitches/<slug>/` is a real directory (not a symlink, not an underscore-prefixed folder such as `_parked`). Otherwise the sole row of the "Active pitches" table in `.project/status.md`. Otherwise `(unattributed)`.
  - Amendment: the status fallback is weak in practice. At the base ref the table lists one pitch while several other pitch directories exist untracked, so the sole-row rule would misattribute work on those pitches to the listed one. Recommend keeping the fallback only when the invocation had no usable argument AND the table has exactly one row, and stating this limit in the docs. A cheap safer alternative is to skip the fallback and report `(unattributed)`; the owner decides.
- Scope: an argument token matching `^S\d{1,3}$`, else `(none)`. A scope change inside one `/build` fires no hook, so it is invisible; the unattributed and `(none)` shares must be shown.
- `resume` and `switch`: they take the pitch as their first argument, so they write a pointer for that pitch with phase equal to their own name and scope `(none)`; the following phase invocation replaces it. `checkpoint`: it takes no pitch argument and does no real spend, so it never replaces a live pointer; it only refreshes that pointer's timestamp if one exists, and otherwise writes nothing.
- A second invocation in the same session replaces the previous pointer (last writer wins). Invocations from inside a subagent (payload has `agent_id`) are ignored.

## TTL

- Proposal confirmed: 6 hours, sliding, refreshed by each attributed completion. A pointer older than the TTL is treated as absent, so the completion is `(unattributed)` and the record keeps that key forever (reversal uses the stored key, not a re-lookup).
- Context cap: 32 sessions in the map. When full, drop expired entries first, then the entry with the oldest timestamp (least recently used). Never refuse to record the completion because the map is full.
- Rationale for 6 hours: it covers one long `/build` with idle gaps, while a crashed or abandoned phase stops attributing within a working day. There is no clear-at-phase-finish hook, so the TTL and the next phase start are the only ways a pointer ends.
- Recommendation: make both numbers named constants with tests at the boundary (exactly at TTL, one unit past), not configuration.

## Placement decision

Recommendation (see the Placement line at the top): a bounded `contexts` map inside the token snapshot, keyed by session id, holding pitch, phase, scope and a timestamp only.

- It is written in the same atomic write that holds the lease, so a completion reads the pointer and stamps its key without a second file, a second path-safety surface or a read-modify race.
- The per-file alternative needs distinct refusal outcomes for a symlinked or non-regular pointer, plus a writer test against that hostile shape, and a cleanup path for stale files. None of that buys anything here.
- Cost: the phase-start event takes the lease (a hook already does so for every completion). The Claude `UserPromptExpansion` hook has the longest timeout of the paths involved (8 s in wiring), and the lease flake baseline below is clean, so this is acceptable.
- Cost: the map is part of the snapshot, so S5's revision bump must land first (the plan already orders it so).
- Not decided here: Codex and OpenCode pointer writes. Both fit the same map keyed by their own session ids; only the wiring cost differs (see the Codex and OpenCode sections).

## Lease-flake baseline

- Command: twelve sequential runs of `token-consumption.test.mts` with the repository's Node test invocation, counting the runs that exit non-zero.
- Result: 0 of 12 runs failed at base ref `633adb3` on a quiet machine. The recorded history is about 1 in 12, so a clean sample is consistent with it and is weak evidence of the true rate.
- Recommendation: S4 to S7 re-run the same twelve-run loop at each scope close and accept no more than the same count; treat any single failure as a signal to re-run a second batch before concluding. New tests should use their own roots (the port is derived from the real path), as the plan states.

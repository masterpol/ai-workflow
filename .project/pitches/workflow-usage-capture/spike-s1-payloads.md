# S1 payload and coexistence spike

Run 2026-10-20, Codex coordinator, `orca=normal`. Only scratch settings were wired. The live wiring is unchanged.
Probe records contain event names, key paths and types only. Raw hook input and model output were not persisted
by the probe. A print-mode `/plan` expanded a scratch command with tools disabled and session persistence disabled.
The scratch command only requested a short reply; it did not invoke the workflow plan phase.

## Claude SessionStart

Claude Code version: 2.1.305

Observed keys: `cwd`, `hook_event_name`, `session_id`, `source`, `transcript_path` (strings).
`prompt_id` was absent. Capture will select only the session identifier and allow-listed source.

## Claude UserPromptSubmit

Observed keys: `cwd`, `hook_event_name`, `permission_mode`, `prompt`, `prompt_id`, `session_id`,
`transcript_path` (strings). The probe records the type of `prompt`, never its value.

## Claude UserPromptExpansion

Observed keys: `command_args`, `command_name`, `command_source`, `cwd`, `expansion_type`, `hook_event_name`,
`permission_mode`, `prompt`, `prompt_id`, `session_id`, `transcript_path` (strings).
Only command name and arguments may go to the existing resolver; argument text must never reach an event.

## Claude PostToolUse Skill

Not exercised live because tools were disabled. Documented, unverified key paths: `tool_name` (string),
`tool_input` (object), `tool_input.skill` and `tool_input.args` (strings), `tool_use_id` (string), plus common keys.
Source: [Claude hook reference](https://code.claude.com/docs/en/hooks#posttooluse).
The shipped collector already handles the same field paths.

## Claude Stop

Observed strings: `cwd`, `hook_event_name`, `last_assistant_message`, `permission_mode`, `prompt_id`, `session_id`,
`transcript_path`. Other types: `stop_hook_active` (boolean), `background_tasks` and `session_crons` (arrays),
`effort` (object). No content field value was retained.

Turn identity: prompt_id

Both submit and stop carry `prompt_id`; the common-field contract defines it as the current prompt identity.
The probe deliberately did not retain or compare identifier values. Equality rests on that documented contract,
not on a recorded value comparison. A session-id fallback is needed for older hosts.
Source: [common hook fields](https://code.claude.com/docs/en/hooks#common-input-fields).

## Claude SubagentStart

SubagentStart: exists

The event exists in the official hook reference. No live subagent was launched; runtime fields remain unverified.
Documented fields: `agent_id`, `agent_type` (strings) plus common fields. Register with matcher `*`.
Source: [SubagentStart reference](https://code.claude.com/docs/en/hooks#subagentstart).

## Claude SubagentStop

Not exercised live. Documented fields: `agent_id`, `agent_type`, `agent_transcript_path`,
`last_assistant_message` (strings), `stop_hook_active` (boolean), plus common fields.
The adapter must ignore response and transcript fields.
Source: [SubagentStop reference](https://code.claude.com/docs/en/hooks#subagentstop).

## Claude SessionEnd

SessionEnd recorded at exit: yes
Matcher form: star

Observed keys: `cwd`, `hook_event_name`, `prompt_id`, `reason`, `session_id`, `transcript_path` (strings).
The record was present after the scratch process exited successfully. Star matchers worked for submit, stop and
session end in that invocation. Exit-time behavior for an interrupted or forcibly killed host remains unverified.

## Event order

Expansion before submit: no

Observed order: SessionStart, UserPromptSubmit, UserPromptExpansion, Stop, SessionEnd.
Thus a typed phase command starts its primary turn before the phase-start hook runs. G1 must explicitly choose
whether to accept attribution to the preceding phase, or request a bounded re-stamp policy from A1.
Recommended initial policy: accept the previous segment, document the first turn as unattributed, and avoid
retroactive changes. This is a proposal, not an approved change.

## OpenCode

OpenCode version: 2.1.1
OpenCode user time.created: unverified
OpenCode turn boundary: unavailable

No live OpenCode session was run. The repository's V2 event interfaces provide step start, end and failure with
`sessionID` and `assistantMessageID`. Its V1 interface provides completion time only. Keep V2 step intervals,
no V1 time intervals without a verified start, and no wait inference from last-step completions.
The [official plugin reference](https://opencode.ai/docs/plugins/#events) lists idle and message events, but that
alone does not verify the installed V2 stream or a user-message boundary. OpenCode wait remains Unavailable.
There is a second contract gap: A1 only closes wait on primary `agent.started`; it has no user-message event kind.
Do not fake a primary activity from a user message to work around this.

## Latency and cost

Proxy p95 ms: 92
Budget p95 ms: 250

Proposed budget, requiring G1 approval. Node version 24.21.0. Thirty sequential runs under `/bin/sh` for each
condition; monotonic wall time includes shell startup, stdin delivery, Node startup, lease and atomic write.
The proxy used `workflow-metrics.mts record --root <scratch> --best-effort`, prefixed with
`AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning`, and a synthetic
native `session.started` input with a fresh event identifier each time. Every proxy reported `written: true`.
Standalone p50/p95: 88/92 ms. A 250 ms per-hook ceiling leaves startup variation headroom over the observed
concurrent p95, but is not evidence of the eventual adapter's latency. S4 must measure the actual capture command.
Added processes: two per plain turn (submit and stop), one per phase start, plus session/subagent lifecycle hooks.
The already shipped token-consumption processes are additional existing cost.

## Coexistence

Coexistence lease skips: 0/60

Thirty rounds per switch setting. Each round ran the proxy, the exact live Orca UserPromptExpansion command,
and the exact live token-consumption PostToolUse Skill command concurrently on the same scratch project.
Orca off: proxy p50/p95 106/135 ms, skips 0/30, all three commands exited 0 in all rounds.
Orca on: proxy p50/p95 108/136 ms, skips 0/30, token command exited 0 in all rounds; Orca exited 2 in all rounds.
Orca's fixed refusal was `worker-identity-unavailable`. This measures contention alongside the readiness refusal,
not alongside a ready Orca dispatch. No worker or Run was created, and no live coordination state was changed.
The current build remains bypassed by its original invocation. Ready-Orca coexistence is unverified.
The inherited lease baseline is 0/12 from token-attribution and workflow-usage-state S1.

## Gate record

A1 contract: blocked
Resolver export: resolvePhaseContext
Token Stop group: present
OpenCode pair: not-chosen

The latter two decisions come from token-attribution/SHIPPED.md: its S3 Stop was approved; OpenCode child-session
attribution was deferred. The live Stop group is present. The resolver is exported by the shipped collector.

A1 contract verification against shipped code:
- A1-1: label-free finish identity works; activity keys exclude labels. However, the additional mapper requirement
  that A1 stamp a label-free activity start from the open segment is absent. Such turns retain unknown labels.
- A1-2: primary turns can supersede a missed finish. Repeated subagent starts are still rejected; the contract must
  be narrowed to primary turns or sent back to A1.
- A1-3: **missing**. A second `phase.started` on the same segment returns `activity already started`.
- A1-4: next primary start closes a wait gap. No user-message boundary API exists; leave OpenCode wait unavailable.
- A1-5: no batch API; optional, so SessionEnd would use sequential writes.
- A1-6: **missing**. Explicit resolver sentinels `(unattributed)` and `(none)` both normalize to `(other)`.
- A1-7: marker-file channel exists and the next successful leased event sweeps it into `captureDropped`.

The approved plan says missing A1 contracts go back to A1, never into an A2 patch. G1 cannot say `met` or
`amended` until that prerequisite is repaired or the owner approves a revised design. Do not create mapper or
wiring files under this gate. Proposed next step: reopen A1 with label inheritance, phase replacement and
sentinel preservation as a separately approved prerequisite, then rerun this spike's contract probe.

File budget remains 12/15 implementation files, approximately 1,150 LOC, excluding pitch records. No production
files changed in S1. Proposed registrations: eight independent groups including SubagentStart. No phase-set copy,
Codex hook, Cursor hook or token snapshot read is introduced.

Current-session verification:
- Scratch Claude invocation: exit 0; five event records; schema/type-only probe output as summarized above.
- Ninety proxy writes: exit 0 and `written: true`; zero skips across sixty concurrent rounds.
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/workflow-metrics-state.test.mts`:
  exit 0, 58 tests, 58 pass, 0 fail. Existing tests pass but do not establish the missing capture contracts.
- Pure in-memory contract probe (no metrics writes): first phase accepted; label-free turn retained unknown pitch
  and phase; replacement phase refused; both resolver sentinels mapped to other. Reproduction is in `log.md`.
- `git diff --quiet .claude/settings.json ai-framework/hooks/hooks.json`: exit 0.

Gate G1: pending. Approve mapping only after the A1 prerequisite is resolved; Revise prerequisite/design;
Back to plan; Stop. No approval is inferred from the spike run.

### Follow-up: approved prerequisite repair

The owner approved repairing the three A1 gaps on 2026-10-20. The implementation now accepts the explicit
resolver sentinels, inherits native start labels through canonical session segments, and replaces those segments
under one lease. The capture plan records this approved boundary exception. Current evidence is in `log.md`:
63 state tests pass on Node and Bun, 21 metrics/report tests pass, coverage is 99.45% lines, and five mutants are
killed. The existing sanitizer timing flake still fails the broad suite, so P0 completion is withheld.

The gate record above remains the original S1 observation. Proposed G1 amendment: canonical native segments,
primary-only superseding starts, preceding-phase attribution for turns before expansion, eight independent Claude
registrations, prompt-id turn identity with session-id fallback, no OpenCode wait without a verified boundary,
and a 250 ms p95 budget. No approval of that mapping or the baseline-test exception is inferred from the repair.


### Owner approval — 2026-10-20

Gate G1: approved. The owner approved the documented prerequisite/test exception and the proposed G1 amendment.
The approved A1 contract is amended: primary starts supersede missed turns; duplicate subagent starts remain
rejected. Native phases use canonical session segment identities. The mapping uses eight separate Claude groups,
prompt-id turn identities with session-id fallback, preceding-phase labels before expansion, no OpenCode wait
without a verified turn boundary, and a 250 ms p95 budget. Earlier blocked/pending lines above are historical
spike observations, not current gate state.

A1 contract: amended

# Plan: workflow-usage-capture

**Pitch**: pitch.md (full draft: shaping-draft.md)  •  **Appetite**: big-batch (cap 15 files / 1,500 LOC)  •  **Hill**: hill.md  •  **Base ref**: `633adb3`

Part A2 of the `token-time-report` split. It writes native capture events into the state that `workflow-usage-state`
(A1) defines. Every scope keeps the pitch's no-gos:
- no prompt, response, tool argument or transcript text is read into an event or stored;
- no new event kinds, and no emission steps in skill or phase prose;
- the token snapshot schema, the lease mechanism and the A1 state schema are not changed;
- every hook exits 0, writes nothing to stdout and only fixed text to stderr;
- Codex and Cursor are not touched.

Two dependencies are unbuilt today: A1 (state v2) and `token-attribution` S3 and S6 (the `Stop` decision, the phase-start
registration and the exported resolver). Scopes are ordered so that S1 and S2 can run now. Every later scope opens only
on a start condition that a command can check (see "Start conditions").

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Spike: payload key names, event order, OpenCode turn boundary, latency and coexistence | `.project/pitches/workflow-usage-capture/spike-s1-payloads.md` (pitch record) | ~90 (notes) | — | A1 build; `token-attribution` S1-S3 | yes: read-only plus a scratch project; writes only its own findings file; the prompt carries the privacy exits verbatim | standard (privacy discipline with live hooks; latency method needs judgment) |
| S2 | Pure event mapper (Claude and OpenCode) with injected resolver | `ai-framework/hooks/scripts/workflow-capture.mts` (new), `ai-framework/hooks/scripts/workflow-capture.test.mts` (new) | ~150 + ~200 test | S1 gate (G1) | A1 build (isolated worktree only) | yes: two new files, pure functions, mapping table fixed by G1 | standard (mapping and privacy semantics) |
| S3 | Hook entry: bounded stdin, real resolver, `recordWorkflowEvent`, deadline, bounded retry, fixed stderr | same two files as S2 | ~100 + ~220 test | S2; A1 shipped; `token-attribution` S6 shipped (start conditions C-A1, C-RES) | — | no: needs both dependencies merged and the lease and deadline semantics; main thread | — |
| S4 | Claude wiring: template plus live settings in one two-file step; sync-propagation test | `ai-framework/hooks/hooks.json`, `.claude/settings.json`, `ai-framework/scripts/runtime/migrate.test.mts` (+ assertions in `workflow-capture.test.mts`) | ~80 JSON + ~50 test + ~90 test | S3; `token-attribution` S6 wiring landed; its S3 `Stop` decision recorded (C-WIRE) | — | no: the live `.claude/settings.json` edit and `sh` runs of the exact strings; main thread | — |
| S5 | Doctor: exact-invocation check per capture registration | `ai-framework/scripts/workflow-doctor.mts`, `ai-framework/scripts/workflow-doctor.test.mts` | ~45 + ~80 test | S4 (expected strings fixed) | S6 (isolated worktree only) | yes: two files, a precedent to follow (`checkClaudeStartupWiring`), exits and mutants fully specified | fast |
| S6 | OpenCode plugin capture | `.opencode/plugins/token-consumption.ts`, `ai-framework/hooks/scripts/opencode-plugin.test.mts` | ~50 + ~120 test | S2, S3; the `token-attribution` OpenCode pair condition (C-OC) | S5 (isolated worktree only) | yes: two files, the mapper already exists and is tested, exits fixed | standard (V1/V2 event-stream semantics) |
| S7 | Docs, rollout record and release | `ai-framework/integrations/harnesses.md` (one paragraph); `.project/pitches/workflow-usage-capture/rollout.md` (pitch record); `CHANGELOG.md`, `VERSION` via `ai-framework/scripts/changelog.mts` at /ship | ~20 | S4, S5, S6 | — | no: full suite, scratch bundle-sync dry run, cross-pitch check; main thread | — |

S2 and S3 edit the same two files, so they run in sequence. They are still two scopes, because S2 ships as a pure,
tested module before either dependency lands, and S3 cannot start until both have.

## File budget

Firm, 12 of 15. Release records are included; pitch records (`spike-s1-payloads.md`, `rollout.md`, `log.md`) are not,
as in the sibling plans.

1. `ai-framework/hooks/scripts/workflow-capture.mts` (new)
2. `ai-framework/hooks/scripts/workflow-capture.test.mts` (new)
3. `ai-framework/hooks/hooks.json`
4. `.claude/settings.json`
5. `ai-framework/scripts/runtime/migrate.test.mts`
6. `ai-framework/scripts/workflow-doctor.mts`
7. `ai-framework/scripts/workflow-doctor.test.mts`
8. `.opencode/plugins/token-consumption.ts`
9. `ai-framework/hooks/scripts/opencode-plugin.test.mts`
10. `ai-framework/integrations/harnesses.md`
11. `CHANGELOG.md`
12. `VERSION`

Three spare. The G1 gate re-counts. Spares are reserved for a test file that a dependency's shape forces, such as a
`workflow-metrics.test.mts` fixture. They are never used for an A1-owned source file. If a contract item below is
missing from A1, the gate sends it back to A1. It is not patched here.

Not touched, with reason:
- `ai-framework/hooks/scripts/token-consumption.mts` is frozen until `token-attribution` S10 (critique X8). The resolver is imported from it, never copied.
- `ai-framework/scripts/workflow-metrics-state.mts`, `workflow-metrics-report.mts` and `integrations/workflow-metrics.md` belong to A1.
- `runtime/migrate.mts` already propagates new groups (see Blast radius), so only its test is added.
- `bundle-sync.mts` syncs `ai-framework/hooks` whole and calls `migrateInstanceEntries`.
- `setup-validator.mts` auto-discovers `ai-framework/hooks/scripts/*.mts` for its parse check.
- `.codex/hooks.json` and `orca-start-codex-hook.test.mts:210-214` pin exactly one `UserPromptSubmit` entry (no-go).
- `orca-start-hook.mts` returns before reading stdin when Orca is off. Its tests find groups by matcher and command, so added groups do not break them.
- `SETUP.md` is a bundle-sync flagged file. Capture is wired by default, not opt-in, so its opt-in hook list is not the place for it.

Projected LOC: about 1,150 (tests about 60%), not the pitch's ~700. See "Pitch claims checked against the code", item 8.

## Blast radius (impact scan at `633adb3`)

| Consumer | What it does with hook wiring | Effect of capture | Action |
|---|---|---|---|
| `runtime/migrate.mts:97-119` `addMissingHooks` (called by `bundle-sync.mts:499`) | Reads the **bundle's `.claude/settings.json`**, not `hooks.json`. It adds a source group only when no instance group with the same event **and matcher** already runs one of its workflow scripts. It never adds a command to an existing group. | A capture command added as a second command in an existing group (the pitch's "second command in `token-attribution`'s phase-start entries") would never reach an install that already has that group. RN and LAH will have it first, because `token-attribution` S10 lands before `workflow-v3-rollout`'s next sync. | S4: every capture registration is its **own group** that runs only `workflow-capture.mts`. A new `migrate.test.mts` test proves it propagates once and idempotently. |
| `workflow-doctor.mts:321-344` `checkClaudeStartupWiring` | Exact Orca command and timeout check | none | must stay green |
| `workflow-doctor.mts:1031-1032` | Substring `matches()` on `token-consumption.mts` and `--event skill-use` | none. Capture uses its own exact check, not these regexes | S5 adds `checkClaudeCaptureWiring` |
| `workflow-doctor.mts:972` script list | Presence plus parse check | new adapter and its test are absent from the list | S5 adds both |
| `workflow-doctor.test.mts:871-899` | Indexes `PreToolUse[0]` and `UserPromptExpansion[0]` of the **live** settings | breaks if a capture group is placed before the Orca group | S4 appends groups after the existing ones; this test is in S4's exit |
| `orca-start-hook.test.mts:67-72, 195-206` | Finds the Orca group by matcher and command, checks `hooks[0]` of that group | none while capture is its own group | S4 exit |
| `runtime/upgrade.test.mts:146-149` | Asserts that the sync registers the Claude Orca groups | none | S4 exit |
| `runtime/migrate.test.mts:41-74, 200-215` | Fixtures of instance and source settings | none. New test only | S4 |
| `setup-validator.mts:35, 169-200` | Parse-checks every `.mts` in `ai-framework/hooks/scripts` | the new adapter is parse-checked automatically | S3 exit |
| `runtime/invariants.test.mts` | One `runDirect(import.meta.url, main);` per command, silent import, no live `.js` | the new adapter must comply. The plugin imports it, so a silent import is required | S2, S3 exit |
| `opencode-plugin.test.mts:310-318` | Regex `import \{ recordEvent \} from ".../token-consumption.mts"` | still matches if capture is a separate import line | S6 keeps a separate import line |
| `workflow-metrics.test.mts:34-69` | The CLI never touches `token-consumption.json`; legacy and workflow collectors share one lease | capture adds a third concurrent writer on the same port | must stay green; S3 adds its own "never reads the token snapshot" spy test |
| `workflow-v3-rollout` (RN hand-wired Claude hooks; `readiness.md:21` "Hook groups added by the sync: none (already wired by hand)") | RN's hand-wired groups run `orca-start-hook` / `token-consumption`, which share no script with capture | the sync adds capture groups to RN in canonical form, beside RN's `bun "..."` Orca entries | S7 scratch dry run against an RN-shaped fixture; `rollout.md` names the re-run of that pitch's dry run |
| Live `.claude/settings.json` vs `hooks.json` | **Not byte-identical today.** The live file is a subset with a different key order, no `SessionStart`, no `workflow-notice` and no descriptions on the token groups | a whole-file byte-consistency test would fail on day one | S4: identity is checked per capture group (deep-equal of event, matcher, hooks, description in both files), plus one commit that touches both |

Lease-port flake: `token-consumption.test.mts` sees "metrics lock is held by another writer" in about 1 of 12 isolated
runs (`_followups.md:422`, `workflow-v3-rollout/readiness.md:25`). The baseline is the number `token-attribution` S1
records (`Baseline failures: N/12`). If that does not exist yet, S1 here records its own with the same loop.

## Event mapping (fixed by G1; default shown)

Claude, adapter `workflow-capture.mts --vendor claude`. Fields selected: `hook_event_name`, `session_id`, `prompt_id`
(if G1 confirms it on both ends of a turn), `agent_id`, `agent_type`, `source` (enum allow-list), `stop_hook_active`
(boolean), `expansion_type`, `command_name`, and `tool_name` / `tool_input.skill`. `command_args` and
`tool_input.args` are passed only to the imported resolver, which returns a validated slug and scope token. They are
never put into an event. `prompt`, `last_assistant_message`, `transcript_path` and `agent_transcript_path` are never
read.

| Hook (registration) | Condition | Event sent to `recordWorkflowEvent` | `activityId` |
|---|---|---|---|
| `SessionStart` | `source` in `startup`, `resume`, `clear` (`compact` sends nothing) | `session.started` | — |
| `UserPromptSubmit` | no `agent_id` | `agent.started`, `agentKind: primary`, **no labels** | `turn:<prompt_id or session_id>` (G1 `Turn identity`) |
| `Stop` | `stop_hook_active !== true` | `agent.finished`, `completed`, **no labels** | same as its start |
| `SubagentStart` (only if G1 `SubagentStart: exists`) | — | `agent.started`, `agentKind: subagent` | `agent_id` |
| `SubagentStop` | — | `agent.finished`, `completed` | `agent_id` |
| `UserPromptExpansion` | `expansion_type === "slash_command"`, no `agent_id`, the resolver says it is a phase | `phase.started` with the resolver's pitch, phase and scope | `segment:<session_id>` |
| `PostToolUse` matcher `Skill` | no `agent_id`, the resolver says it is a phase | `phase.started` (same) | `segment:<session_id>` |
| `SessionEnd` | — | `agent.finished` `cancelled` (turn) and `phase.finished` `cancelled` (segment), in one call if A1 offers it (contract A1-5) | as above |

All events use `source: "native"` and `vendor: "claude"`. `occurredAt` comes from the hook process clock, read once at
entry (one clock source per vendor). `eventId` is `sha256(vendor, hook_event_name, session_id, prompt_id or agent_id, occurredAt)`.
It is deterministic per firing, so the same hook registered twice dedupes through A1's `recent` ring.

The rule behind "no labels": a turn, subagent or `SessionEnd` event never carries a pitch, phase or scope. A1 stamps
labels from the session's open segment when the activity **starts**, and a finish matches on its key, never on its
labels. So a phase change in the middle of a turn cannot re-derive the turn's scope from a pointer (critique S8).
Capture never reads the token snapshot or any pointer stored in it.

OpenCode, through `.opencode/plugins/token-consumption.ts`, uses the same mapper. Default, to be confirmed by G1:
- `session.step.started` maps to `agent.started` and `session.step.ended` to `agent.finished` `completed`. `session.step.failed` maps to `agent.finished` `failed`. `activityId` is `assistantMessageID`.
- A user `message.updated` with `time.created` closes a wait gap, in the form A1 contract A1-4 defines.
- A skill tool call naming a phase gives `phase.started` through the resolver.
- If G1 records `OpenCode turn boundary: unavailable`, OpenCode wait stays `Unavailable` and only step intervals count.

## A1 contract required at G1 (checked against A1's plan and then its code)

Capture can only write what A1 accepts. G1 records `A1 contract: met` only when A1's plan, and at C-A1 its tests, cover:

1. **A1-1**: A finish matches an open activity on `(vendor, sessionId, activityId)` and ignores the finish's labels. Today's `activityKey` hashes pitch and phase (`workflow-metrics-state.mts:109-111`), so a label-free `Stop` would never match a labelled start.
2. **A1-2**: A start on an already open key closes the old activity as unmatched or cancelled and opens the new one. Today it is rejected with `activity already started` (`:140`), so one lost `Stop` would also lose the next turn.
3. **A1-3**: A `phase.started` on a session with an open segment closes that segment in the same `applyEvent`. The adapter sends one event per phase start, which means one lease acquisition.
4. **A1-4**: A1 names the event shape that closes a wait gap (Claude: the next primary `agent.started`; OpenCode: the user message).
5. **A1-5** (optional): a single call that records two events under one lease. Without it, `SessionEnd` makes two sequential calls, never nested.
6. **A1-6**: The resolver's `(unattributed)` pitch and `(none)` scope are stored and stay matchable. Today `SAFE = /^[\w.:/@+-]{1,80}$/` maps `(unattributed)` to `(other)`, and `(other)` is never matchable (`:137`), so every unattributed turn would end up as an unmatched finish.
7. **A1-7** (critique S9): how a lease-busy skip reaches `capture.dropped`. The adapter cannot write that counter itself: when the lease is busy, nothing can be written under it. Proposal: the state module records the skip itself (for example a bounded slot tally that the next leased write sweeps), and returns a distinguishable busy reason. Without A1-7, drops show only as A1's unmatched counters, and `capture.dropped` is reported as inferred.

## Start conditions (commands; a scope does not start until each exits 0)

- **G1 record present** (S2 onward): `grep -cE "^(A1 contract: (met|amended)|Resolver export: [A-Za-z]+|Token Stop group: (present|absent)|OpenCode pair: (chosen|not-chosen))$" .project/pitches/workflow-usage-capture/spike-s1-payloads.md` = 4.
- **C-A1** (S3): A1 has shipped. `grep -cE "schemaVersion: 2|schemaVersion !== 2" ai-framework/scripts/workflow-metrics-state.mts` ≥ 1, and `T ai-framework/scripts/workflow-metrics-state.test.mts` exit 0.
- **C-RES** (S3): `R=$(sed -nE 's/^Resolver export: ([A-Za-z]+)$/\1/p' .project/pitches/workflow-usage-capture/spike-s1-payloads.md); grep -cE "^export (async )?function $R\b" ai-framework/hooks/scripts/token-consumption.mts` = 1. Note: `token-attribution/plan.md` S6 has **no export exit today**. The coordinator adds one to that plan before its S6 starts (pitch risk 2).
- **C-WIRE** (S4): `grep -c -- "--vendor claude --event phase-start" ai-framework/hooks/hooks.json .claude/settings.json` gives 1 in each file (`token-attribution` S6 landed), and `grep -cE "^Main-session Stop: (recommend|do-not-recommend)$" .project/pitches/token-attribution/spike-s3-transcript.md` = 1, with the owner's gate decision copied into G1 `Token Stop group:`.
- **C-OC** (S6): G1 `OpenCode pair: not-chosen`, or, if chosen, `git log --oneline --grep "token-attribution" -- .opencode/plugins/token-consumption.ts | wc -l` ≥ 1 (its plugin edits landed first).

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Commands: `T` = `node --experimental-strip-types --disable-warning=ExperimentalWarning --test`;
`SUITE` = `T "ai-framework/**/*.test.mts" ".claude/**/*.test.mts"`. There is no build, typecheck or lint command
(`.project/context/stack.md`, "Not Applicable"). Every backend scope's "no untyped validators" check is
`grep -cE ":\s*any\b|as any\b|<any>" <changed .mts/.ts>` = 0 on its added lines. Bun is installed, so each code scope
also runs `bun test <its test files>`. Commits carry `workflow-usage-capture` in the message, so the file-count check
below can find them.

### S1 — Spike: payload key names, event order, OpenCode turn boundary, latency and coexistence
- `test -f .project/pitches/workflow-usage-capture/spike-s1-payloads.md`
- `grep -cE "^## (Claude SessionStart|Claude UserPromptSubmit|Claude UserPromptExpansion|Claude PostToolUse Skill|Claude Stop|Claude SubagentStart|Claude SubagentStop|Claude SessionEnd|Event order|OpenCode|Latency and cost|Coexistence|Gate record)$"` = 13
- One verdict line each (`grep -cE` = 1 per line):
  - `^Claude Code version: [0-9][0-9.]*$`
  - `^SubagentStart: (exists|absent)$`
  - `^Turn identity: (prompt_id|session_id)$`: does `Stop` carry the `prompt_id` that `UserPromptSubmit` carries? (Seen on `SubagentStop` in the 2026-09-24 spike.)
  - `^Expansion before submit: (yes|no|unverified)$`: for a typed `/plan`, does `UserPromptExpansion` fire before `UserPromptSubmit`?
  - `^SessionEnd recorded at exit: (yes|no|unverified)$`: does a `SessionEnd` hook finish before the process exits?
  - `^Matcher form: (star|omitted)$`: the accepted matcher for `UserPromptSubmit`, `Stop` and `SessionEnd`.
  - `^OpenCode version: [0-9][0-9.]*$`, `^OpenCode user time.created: (exists|absent|unverified)$`, `^OpenCode turn boundary: (idle-event|last-step|unavailable)$`
  - `^Proxy p95 ms: [0-9]+$`, `^Budget p95 ms: [0-9]+$`, `^Coexistence lease skips: [0-9]+/[0-9]+$`
- Method:
  - **Key names.** Use a scratch project in the scratchpad with its own `.claude/settings.json`. A probe hook registered for every event above writes only key paths and value **types**. The 2026-09-24 method (`.project/compaction/archives/metrics-report-dimensions-*/files/spike-payloads.md`) wired a throwaway hook into the live file. That is allowed only if `git diff --quiet .claude/settings.json ai-framework/hooks/hooks.json` exits 0 afterwards. Documented hook schemas fill gaps, marked `unverified`.
  - **Latency.** The proxy for capture cost is `printf '<synthetic event>' | AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/workflow-metrics.mts record --root <scratch> --best-effort`. It already does one Node start, one lease and one atomic write. Run it 30 times under `/bin/sh`, wall clock, and record p50 and p95. `Budget p95 ms` is the per-hook limit S4 re-measures against. Per-prompt cost is stated as a count: Node processes added per plain turn (expected 2: submit and stop) and per phase start (expected 1).
  - **Coexistence.** Run 30 rounds in which the exact Orca `UserPromptExpansion` command (switch off; and on, if Orca is installed) and the proxy run concurrently, plus a `token-consumption.mts --event skill-use` run on the same scratch metrics directory as a stand-in for `token-attribution`'s phase-start command. Record the proxy's p95 change and the lease skips.
- Privacy (counts = 0): `grep -cE "/Users/|/home/"`; `grep -cE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"` (no session or prompt ids); `grep -cE '"(prompt|command_args|last_assistant_message|args|text)"\s*:\s*"'`; `git status --porcelain | grep -cE "settings\.local|\.jsonl"`. `settings.local.json` is never read or written.
- Cross-pitch: the "Gate record" section copies the `token-attribution` S3 owner decision on main-session `Stop` and its contingent-pair choice once those exist.
- Time box: half a day. An unanswered question is recorded as `unverified`, and the default in "Event mapping" applies.

**Gate G1 (after S1; Approve / Revise / Back / Stop).**
- The owner confirms the event mapping, the registration list (with or without `SubagentStart`), `Turn identity`, the OpenCode boundary, the latency budget, and the A1 contract (`met`, or `amended` with A1's plan updated first).
- G1 also records the resolver export name and, once known, `Token Stop group` and `OpenCode pair`.
- It re-counts files and LOC.
- `Expansion before submit: no` means a `/build` turn starts under the previous phase. The owner picks between accepting that and asking A1 for a bounded re-stamp window, triggered only by a phase-start event and never by a pointer read.

### S2 — Pure event mapper with injected resolver
- `T ai-framework/hooks/scripts/workflow-capture.test.mts` exit 0; `bun test ai-framework/hooks/scripts/workflow-capture.test.mts` exit 0
- `T ai-framework/scripts/runtime/invariants.test.mts` exit 0 (silent import, one `runDirect`, no `.js`)
- `grep -cE ":\s*any\b|as any\b|<any>" ai-framework/hooks/scripts/workflow-capture.mts` = 0
- Source guards (= 0): `grep -cE "\.prompt\b|\[\"prompt\"\]|last_assistant_message|transcript_path" ai-framework/hooks/scripts/workflow-capture.mts`; `grep -c "token-consumption.json" ai-framework/hooks/scripts/workflow-capture.mts`.
- The phase set is not duplicated: `grep -cE "\"shape-lite\"|\"cooldown\"" ai-framework/hooks/scripts/workflow-capture.mts` = 0. Phase detection is the injected resolver's answer.
- Behavior tests, one per mapping row. The mapper is `(payload, resolve, now) => event inputs[]`; tests use a stub resolver:
  - Each row in the table gives exactly the listed kind, `agentKind`, outcome and `activityId`. Unknown `hook_event_name`, wrong types and `compact` give `[]`.
  - `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop` and `SessionEnd` events have no `pitch`, `phase` or `scope` key. A test changes the stub resolver's answer between start and finish, and the finish is unchanged (the S8 scope ruling).
  - A payload with `agent_id` never yields `phase.started`, and never a primary turn event (token-attribution S6 rule).
  - Event units (rule `testing.md`): no `*.started` input carries an outcome. `SubagentStart` and `UserPromptSubmit` never yield `agent.finished`.
  - `stop_hook_active: true` gives `[]`.
  - Field allow-list: the payload carries `CAPTURE-TEXT-MARKER` in `prompt`, `last_assistant_message`, `transcript_path`, `tool_input.args`, and in `command_args` after the slug and scope tokens. `JSON.stringify(mapper output)` does not match the marker. The stub resolver receives `command_args` and is the only consumer.
  - `eventId` is deterministic for an identical payload and `now`, and differs when `hook_event_name` differs.
  - OpenCode rows (step started, ended, failed; user message; skill phase) map as G1 decided, and malformed events give `[]`.
- Mutant proof, recorded in `log.md`: mapping `prompt` into `activityId` makes the marker test fail; adding `pitch` to the `Stop` row makes the label-free test fail.

### S3 — Hook entry
- Start conditions C-A1 and C-RES exit 0.
- `T ai-framework/hooks/scripts/workflow-capture.test.mts ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics.test.mts` exit 0; `bun test ai-framework/hooks/scripts/workflow-capture.test.mts` exit 0
- `node ai-framework/scripts/setup-validator.mts` exit 0 (the TypeScript entries parse check covers the new file)
- The resolver is imported, not copied: `grep -cE "import \{[^}]*\b$R\b[^}]*\} from \"\./token-consumption\.mts\"" ai-framework/hooks/scripts/workflow-capture.mts` = 1, with `$R` as in C-RES.
- Behavior tests, through `main(argv, deps)`. Every test injects an in-memory `deps.net.tryListen`, as `metrics-lock.test.mts:358` does: `grep -c "tryListen" ai-framework/hooks/scripts/workflow-capture.test.mts` ≥ 1.
  - Exit 0 and stdout `""` for valid, malformed, oversized (> 64 KiB stdin, read bounded), non-object and hostile payloads. stderr is empty or one of the fixed lines in `CAPTURE_MESSAGES`, asserted by set membership, and never contains a path or value.
  - A non-phase `UserPromptExpansion` or `Skill` call returns before the lease: the `tryListen` spy is called 0 times.
  - A real write: `SessionStart`, then `UserPromptSubmit`, then `Stop` yields a state that A1's strict reader accepts, with one matched primary finish.
  - The token snapshot is never read. An `fs` spy sees no path ending in `token-consumption.json`, and a `LEGACY-MARKER` file there is byte-unchanged.
  - **Bounded retry.** A `tryListen` that is busy for the first lease wait and free afterwards gives a recorded event: one extra attempt at most, started only while elapsed time is under the internal budget (default 3,000 ms, below the 5 s registration timeout). Always busy: exit 0, the fixed `lease busy` line, state bytes unchanged, and `capture.dropped` handled as A1-7 decided (asserted after the next successful event). The retry count is asserted from the spy: at most 2 lease acquisitions per event.
  - No forced exit after the lease is acquired. The deadline is checked only before an attempt, so a timer can never leave a `workflow-usage.json.*.tmp` file. Test: a slow injected clock past the budget before the attempt gives exit 0, no lease call, and no `*.tmp` file in the metrics directory.
  - The marker test: every fixture payload carries `CAPTURE-TEXT-MARKER` in every text field. After the full Claude event sequence, recursive reads of every file under `.project/metrics` (`*.json`, `*.tmp`, `*.rejected`, any other) and the captured stderr do not match the marker.
  - The phase-start event uses the real resolver. A slug with a real `.project/pitches/<slug>/` directory and `S3` in `command_args` gives `phase.started` with that pitch, phase and scope. An unknown slug falls back by the resolver's own rule. The test asserts the result equals a direct call of the resolver, so the two cannot drift.
- Mutant proofs, in `log.md`: removing the pre-lease phase check makes the "0 lease calls" test fail; letting the retry loop run 3 attempts makes the retry-count test fail.

### S4 — Claude wiring (two-file step) and sync propagation
- Start condition C-WIRE exits 0.
- One commit carries both wiring files: `git show --name-only --format= <S4 commit> | grep -cE "^ai-framework/hooks/hooks\.json$|^\.claude/settings\.json$"` = 2.
- Exact strings. The one capture command is `AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning "$CLAUDE_PROJECT_DIR/ai-framework/hooks/scripts/workflow-capture.mts" --vendor claude --root "$CLAUDE_PROJECT_DIR"`, with `"timeout": 5` and a `description`. For N = the G1 registration count (7, or 8 with `SubagentStart`):
  - `grep -c 'workflow-capture.mts\\" --vendor claude --root' ai-framework/hooks/hooks.json .claude/settings.json` = N in each file;
  - `node -e 'for (const f of ["ai-framework/hooks/hooks.json",".claude/settings.json"]) JSON.parse(require("fs").readFileSync(f,"utf8"))'` exit 0.
- Registrations, each in its **own group** whose `hooks` array holds only the capture command, appended after the existing groups:
  - `SessionStart` (`*`), `UserPromptSubmit`, `Stop`, `SessionEnd` (matcher per G1 `Matcher form`);
  - `SubagentStop` (`*`), `SubagentStart` (`*`, only if it exists);
  - `UserPromptExpansion` (`*`), `PostToolUse` (`Skill`).
  - The `Stop` group has one owner. If G1 `Token Stop group: present`, `token-attribution`'s `token-consumption.mts` `Stop` group stays separate and unchanged.
- Tests in `workflow-capture.test.mts`:
  - **Per-group identity.** For each capture group, event, matcher, `hooks` and `description` deep-equal between `hooks.json` and `.claude/settings.json`, and each command `===` the constant above. The two files are not compared byte for byte, because they differ by design.
  - **Exact string under `sh`.** Take the command from `.claude/settings.json` and run it with `/bin/sh -c`, `CLAUDE_PROJECT_DIR` set to a fixture with `ai-framework` symlinked, `AI_WORKFLOW_RUNNER=bun` in the environment, a project-root runner config naming `bun`, and `PATH` holding only `node`. Exit 0, stdout `""`, and the event is recorded. The same run with `node` absent from `PATH` gives a non-2 exit and stdout `""` (Claude treats a non-2 exit as non-blocking, so nothing is blocked).
  - **One per event.** Each event has exactly one capture command across all its groups (no double count).
- `migrate.test.mts`, new test. An instance `.claude/settings.json` holding the Orca groups, the token groups and a `token-attribution`-style `UserPromptExpansion` phase-start group gets every capture group exactly once from `migrateInstanceEntries(root, source, true, deps)`, and existing groups stay deep-equal. A second run reports nothing to change. An instance with a wrapped capture command under the same event and matcher is not given a duplicate.
- Regression set: `T ai-framework/hooks/scripts/workflow-capture.test.mts ai-framework/hooks/scripts/orca-start-hook.test.mts ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/runtime/migrate.test.mts ai-framework/scripts/runtime/upgrade.test.mts ai-framework/hooks/scripts/token-consumption.test.mts` exit 0.
- Latency, re-measured with the real command (30 runs under `/bin/sh`, same method as S1): `Measured p95 ms: M` is appended to `log.md`, and `node -e` comparing it to S1's `Budget p95 ms` exits 0 (M ≤ budget). The coexistence round is re-run with the real `token-attribution` phase-start command. Lease skips must not exceed the S1 count plus one.

### S5 — Doctor: exact invocation per capture registration
- `T ai-framework/scripts/workflow-doctor.test.mts` exit 0; `bun test ai-framework/scripts/workflow-doctor.test.mts` exit 0; `node ai-framework/scripts/workflow-doctor.mts` has no new fail and reports `Claude capture wiring` as pass in this checkout.
- `grep -c "Claude capture wiring" ai-framework/scripts/workflow-doctor.mts` ≥ 1; `grep -c "workflow-capture.mts" ai-framework/scripts/workflow-doctor.mts` ≥ 2 (the check and the script list at line 972).
- Check semantics (issue: substring-hook-wiring-check-accepts-echoed-commands):
  - A group counts only when `hook.type === "command"`, `hook.command === EXPECTED`, `hook.timeout === 5` and the matcher equals the expected one.
  - No capture registration at all gives `warn` ("automatic workflow capture is not wired"), so an install that has not synced yet is not failed.
  - A registration that mentions `workflow-capture.mts` but is not exact gives `fail`, naming only the miswired event.
  - Two capture commands under one event give `fail`.
- Tests (one per case): the canonical live settings pass. Each of these fails and names only its event:
  - `echo AI_WORKFLOW_RUNNER=node node ... workflow-capture.mts ...` (an echoed command);
  - a `bun "..."` command;
  - a missing `timeout`;
  - `timeout: 30`;
  - a trailing `; true`;
  - a duplicate group.

  Deleting all capture groups gives `warn`.
- Mutant proof, in `log.md`: replacing `===` with `.includes(...)` in the command comparison makes the echoed-command test fail.

### S6 — OpenCode plugin capture
- Start condition C-OC exits 0.
- `T ai-framework/hooks/scripts/opencode-plugin.test.mts ai-framework/hooks/scripts/workflow-capture.test.mts` exit 0; `bun test ai-framework/hooks/scripts/opencode-plugin.test.mts` exit 0
- `grep -c 'import { recordEvent } from "../../ai-framework/hooks/scripts/token-consumption.mts"' .opencode/plugins/token-consumption.ts` = 1 (the pinned import line is unchanged; capture is a separate import line); `grep -c "workflow-capture.mts" .opencode/plugins/token-consumption.ts` = 1.
- `grep -cE ":\s*any\b|as any\b|<any>" .opencode/plugins/token-consumption.ts` = 0 on added lines.
- Behavior tests:
  - V2: a step started then ended yields one matched agent interval in `workflow-usage.json`; a failed step yields outcome `failed`.
  - V1: the mapping G1 chose, or nothing if V1 lacks a start time.
  - The user-message rule follows G1. With `OpenCode turn boundary: unavailable`, no wait gap is recorded.
  - A skill tool call naming a phase yields `phase.started` through the resolver.
  - Malformed events and a rejecting `recordWorkflowEvent` never throw out of the plugin, and the token-consumption assertions in the existing tests are unchanged.
  - Capture runs after `recordEvent` returns, never inside its lease (no nested acquisition). A test with a spy order asserts the token write settles before the capture call starts.
  - Marker: message text fields carry `CAPTURE-TEXT-MARKER`, and no file under `.project/metrics` matches it.
- Lease flake: the plugin tests use the real lease. For 12 runs of `T ai-framework/hooks/scripts/opencode-plugin.test.mts`, the failure count is ≤ the baseline. Both numbers go in `log.md`.

### S7 — Docs, rollout and release
- Docs: in `harnesses.md`, metrics section (after line 141), `grep -c "workflow-capture.mts" ai-framework/integrations/harnesses.md` ≥ 1. The paragraph names:
  - the events captured;
  - "never reads prompt, response or transcript text";
  - that OpenCode wait is `Unavailable` when no turn boundary exists;
  - that Codex and Cursor capture is not wired.

  Then `T ai-framework/scripts/skill-vendors.test.mts ai-framework/scripts/workflow-contracts.test.mts` exit 0. `skill-vendors.test.mts` reads `harnesses.md`, and the contracts test guards one owner per topic.
- Rollout:
  - Export base `633adb3` into the scratchpad (`git archive 633adb3 | tar -x -C <scratch>`).
  - Hand-wire its `.claude/settings.json` like RN: Orca as `bun "..."`, no capture.
  - Run `node ai-framework/scripts/bundle-sync.mts --source <this checkout> --apply` from there (exit 0).
  - `grep -c "workflow-capture.mts" <scratch>/.claude/settings.json` = N, and the RN-style Orca entries are byte-unchanged.
  - Record the counts only in `rollout.md`: `test -f .project/pitches/workflow-usage-capture/rollout.md`.
  - `rollout.md` names the re-run of `workflow-v3-rollout`'s scratch-copy dry run (critique X16) as that pitch's next step. If `workflow-v3-rollout` is still `shaped` (`grep -c "| workflow-v3-rollout | shaped |" .project/status.md` = 1), it lands before that pitch's next sync.
- `SUITE` exit 0 under Node; `bun test ai-framework` exit 0, or each failure is matched by name to a pre-existing followup; the lease flake count is ≤ the baseline.
- `node ai-framework/scripts/setup-validator.mts` exit 0; `node ai-framework/scripts/graphify.mts --check` exit 0; `node ai-framework/scripts/workflow-doctor.mts` has no new fail.
- Privacy close-out: after the suite, `grep -rl "CAPTURE-TEXT-MARKER" .project/metrics | wc -l` = 0.
- Release at /ship: `node ai-framework/scripts/changelog.mts ...` updates `CHANGELOG.md` and `VERSION`. File count: `git log --format= --name-only --grep "workflow-usage-capture" | grep -vE "^\.project/|^$" | sort -u | wc -l` ≤ 15.

## Risks (inherited from pitch rabbit holes)

| Risk | Pitch owner → plan scope | Spike needed? | Mitigation |
|------|--------------------------|---------------|------------|
| Hook event availability and order: `SubagentStart`; `Stop` and `SessionEnd` keys; `UserPromptExpansion` before `UserPromptSubmit`; OpenCode `time.created`; p95 latency | S1 spike → S1, G1 | yes (S1) | Key names and types only. Each question has a verdict line. A missing `SubagentStart` makes Claude subagent time `Unavailable`, with only turns and finishes counted. `unverified` falls back to the default mapping. |
| Dependency surface on `token-attribution`: resolver export (S6), `Stop` ownership (S3), effort in `flows` (S7) | coordinator, before its S6/S7 → G1, C-RES, C-WIRE | no (gate checks) | `token-attribution/plan.md` S6 lists no export today. The coordinator adds one before its S6. C-RES blocks S3 until `export function <name>` exists. Effort in flows stays that pitch's S7 call (recommended), re-checked at G1. |
| Per-prompt latency and `UserPromptSubmit` stalls | P1/P3 → S1, S3, S4 | yes (S1 measures) | Budget from S1. The internal budget is 3 s, under a 5 s timeout. The pre-lease phase check costs non-phase calls no lease. S4 re-measures M ≤ budget. Added cost is stated as a count (2 Node processes per plain turn, 1 per phase start). |
| Lease contention between parallel groups. Claude runs every matching group at once, so capture and `token-consumption` (and `Stop`, if both) race for one port | new → S1, S3, S4 | yes (S1 coexistence) | The lease's own 1 s wait plus at most one retry. Skips counted against S1. One writer per directory is kept, and acquisition is never nested. |
| `capture.dropped` cannot be written by the hook whose lease was busy | critique S9 (pitch claim) → G1 (A1-7), S3 | no | Mechanism owned by A1's state module. Fallback: inferred from unmatched counters and labelled as such. |
| A1 semantics that capture relies on (A1-1 to A1-6) | new → G1, C-A1 | no | Checked against A1's plan at G1, then against its code at C-A1. A missing item goes back to A1 and is never patched here. |
| A second command in an existing group never reaches installs (`addMissingHooks`) | new → S4 | no | Own group per registration, plus a `migrate.test.mts` propagation and idempotence test. |
| Template and live settings are not byte-identical today | new → S4 | no | Per-group deep-equal test plus a two-file commit. The whole files are not compared. |
| A scope label re-derived after a mid-turn phase change | critique S8 → S2 | no | Turn and agent events carry no labels; A1-1 matches on key; S2 has a stub-resolver-switch test. |
| `Stop` with two owners in one group | critique X6 → S4 | no | One owner per group. `token-attribution`'s `Stop` group (if approved) and capture's are separate. The doctor fails a duplicate capture `Stop`. |
| Prompt or argument text leaks | no-go → S2, S3, S6, S7 | no | Allow-list selection; `command_args` goes only to the resolver; marker tests over every metrics file and stderr; source greps; mutants. |
| A deadline kill in the middle of a write leaves temp files | new → S3 | no | No forced exit after the lease is acquired; the deadline is checked before an attempt only; the test asserts no `*.tmp`. |
| A phase start from a subagent moves the main segment | new → S2 | no | An `agent_id` payload never gives `phase.started`. |
| `SessionEnd` killed at exit, leaving open turns | new → S1 | yes (S1) | A1's TTL eviction (6 h), counted. `SessionEnd recorded at exit: no` is documented in S7. |
| Duplicate registration (`settings.json` plus a local file) double-counts | new → S2, S5 | no | Deterministic `eventId` dedupes through A1's `recent` ring. The doctor fails duplicates within `settings.json`. `settings.local.json` is never read. |
| Lease-port flake worsens | A1 risk → S3, S6, S7 | no (baseline) | Injected `tryListen` in adapter tests. Plugin tests are counted against the baseline. |
| Cross-pitch contention: `hooks.json`/`settings.json` (`token-attribution` S6), OpenCode plugin pair (`token-attribution` contingent), `token-consumption.mts` frozen (X8) | critique X6/X8 → C-WIRE, C-OC | no | Start conditions order the edits. `token-consumption.mts` is never edited here. The overlap check is re-run at /audit. |
| `workflow-v3-rollout` RN hand-wired hooks | critique X16 → S7 | no | Scratch dry run against an RN-shaped fixture; `rollout.md` hands the re-run to that pitch. |

### Rules folded into exit criteria
- `ai-framework/rules/testing.md`:
  - event units: no start is a completion (S2);
  - macOS tmpdir realpath: fixtures via `tempFixture`, with paths compared after `realpathSync` (S3, S4);
  - each guard proved with an in-memory mutant (S2, S3, S5).
- `ai-framework/rules/security.md`:
  - explicit allow-list and length bounds on every selected field;
  - stdin read bounded;
  - fixed stderr, never a path or value (S2, S3);
  - exact-match wiring validation (S5).
- `ai-framework/rules/machine-data-format.md`: the state stays JSON and is script-read. No `.toon` goes under `.project/metrics`.
- `ai-framework/rules/data-modeling.md`: not triggered; no schema change here (A1 owns it).
- `ai-framework/rules/canonical-mirror-sync.md`: not triggered; no skill or agent file is edited. `harnesses.md` is not a mirrored file.
- `.project/rules/`: holds only `README.md`, so no stack-specific companion applies.

## Parallel dispatch plan

1. **Now:** S1 is dispatched (`standard`). It is read-only, writes only its findings file and runs a scratch project, alongside A1's build and `token-attribution` S1-S3. Its prompt carries the S1 privacy exits verbatim. Then **G1**.
2. **S2** is dispatched (`standard`) after G1, in an **isolated worktree** while A1 is being built in the main checkout. The file sets are disjoint (two new files against A1's state, report and docs). No parallel writers share one worktree (`harnesses.md`, "Other dispatch rules"). Without a worktree, it runs after A1 on the main thread.
3. **S3** runs on the main thread once C-A1 and C-RES pass.
4. **S4** runs on the main thread once C-WIRE passes. `token-attribution` S6 edits the same two wiring files, so S4 always follows it.
5. **Wave (parallel):** S5 is dispatched (`fast`) and S6 (`standard`, once C-OC passes) after S4, each in its own isolated worktree. Their file sets are disjoint (doctor and its test against the plugin and its test). If C-OC is still closed, S5 runs alone and S6 waits.
6. **S7** runs on the main thread last, before `workflow-v3-rollout`'s next bundle-sync.

On a harness without nested dispatch, run S1 to S7 in sequence with the same constrained prompts.

## Pitch claims checked against the code

1. **"Phase start is a second command in `token-attribution`'s phase-start entries"** does not survive the sync. `addMissingHooks` (`runtime/migrate.mts:97-119`) adds whole groups only when no group with the same event and matcher already runs a shared script. A command appended to an existing group never reaches an install that already has the group. Capture uses its own groups, which also gives "one owner per `Stop` entry" literally.
2. **"`hooks.json` and `.claude/settings.json` stay byte-consistent"** is not true today, and it is not the intended design. The live file is a subset with a different key order. Consistency is enforced per capture group.
3. **"A lease-busy event increments `capture.dropped`"** cannot be done by that hook. It holds no lease, so it cannot write the state. This becomes A1 contract A1-7.
4. **"Pitch, phase and scope come from the exported resolver"** holds only for phase-start events. Those are the only payloads with resolver inputs (`command_name`/`command_args`, `tool_input.skill`/`args`). Turn and agent events get labels from A1's open segment, and capture never reads the pointer.
5. **The exported resolver is not in `token-attribution/plan.md`.** Its S6 exits contain no export. The X3 ruling assumed one. C-RES blocks S3 until it exists.
6. **Today's state would reject or mis-match capture events:**
   - `activityKey` includes pitch and phase (`workflow-metrics-state.mts:109-111`);
   - a repeated start is refused (`:140`);
   - `(unattributed)` fails `SAFE` and becomes the unmatchable `(other)` (`:13`, `:137`).

   These become A1-1, A1-2 and A1-6.
7. **The lease already retries.** `metrics-lock.mts` waits up to 1,000 ms in 25 ms steps. `withMetricsLease` passes `{}`, so capture cannot tune `waitMs` without editing A1's file. The "small bounded retry" is that wait plus at most one outer attempt.
8. **The appetite** is about 1,150 LOC and 12 files (the pitch said ~700 LOC and 8 files). The pitch left out the doctor test, the sync-propagation test, the docs paragraph and the release pair.
9. **The OpenCode plugin has two entry points.** V1 (`server`, `message.updated`) and V2 (`setup`, `session.step.*`) differ, and the pitch mapped V2 only. V1 has no step start, so its mapping is a G1 decision.
10. **The 2026-09-24 payload spike already shows `prompt_id` on `SubagentStop`.** If `Stop` and `UserPromptSubmit` also carry it, it is a stable turn identity without a pointer (S1 `Turn identity`).

## Wireframes (UI scopes only, light)

Not applicable: no UI scope.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)

## Approved prerequisite repair — 2026-10-20

The owner approved repairing the A1 dependency after the S1 contract reproduction. This explicitly permits a
prerequisite change to `workflow-metrics-state.mts` and its test, plus the contract document and release records;
the original A1 pitch remains historical. This repair is distinct from S2 and does not open G1 automatically.
No lease or persisted object shape changes are permitted.

| File | Behavior to test | Type | Test file |
|------|------------------|------|-----------|
| workflow-metrics-state.mts | Preserve the resolver's unattributed pitch and no-scope sentinels, match finishes, and round-trip strict state; reject arbitrary parenthesized values | Unit + leased handler | workflow-metrics-state.test.mts |
| workflow-metrics-state.mts | Inherit labels for a native label-free start from its session's canonical segment; preserve those labels across a later phase change; isolate vendor/session and retain explicit labels | Unit | workflow-metrics-state.test.mts |
| workflow-metrics-state.mts | Replace a native canonical phase segment atomically, credit the closed segment, deduplicate replays, reject backwards time, and leave active agent intervals intact | Unit + leased handler | workflow-metrics-state.test.mts |

Use `segment:<sessionId>` as the canonical native phase activity identity. Manual lifecycle semantics remain
unchanged. A replacement synthesizes a deterministic phase finish inside the same in-memory apply and lease;
it does not create a second lease or an activity completion. Starts never synthesize agent finishes.
Primary starts before expansion retain their previous segment's labels; no retroactive stamping is introduced.

Exit checks: targeted Node and Bun state tests; workflow metrics/report regression tests; original contract probe;
setup-validator; graph integrity; workflow-doctor; `git diff --check`. No application build/typecheck applies.


## G1 accepted — 2026-10-20

Owner approval accepted the spike amendment and the documented sanitizer full-suite exception. The current
spike gate record supersedes its earlier blocked observation. S2 is sequential on the main thread after the
approved prerequisite, using only its two new mapper/test files. Test strategy: unit tests for every Claude
mapping row, OpenCode step/skill rows, label-free finishes, marker privacy, deterministic identity, malformed
inputs and length/type boundaries. Runtime invariant tests verify silent import and dependency boundaries.
No CLI or lease is introduced before S3.


## S3 strategy — 2026-10-20

The owner approved S2 and opening S3. Add handler tests around `main(argv, deps)` with in-memory
`net.tryListen`: bounded stdin and fixed diagnostics; real resolver parity; strict state reads after a full
lifecycle; token-file read spies and recursive marker scans; busy-first/success and always-busy outcomes;
shared monotonic budget before each outer writer call; and no forced exit while a write is in progress.
The writer retains A1's existing internal lease retries. Count outer calls with an injected clock that makes each
busy wait expire after one bind probe. A1 records refused write attempts in its drop-marker channel, including a
first attempt later recovered by the hook's retry; the adapter must not alter the marker/lease implementation.
Main accepts only the Claude vendor; OpenCode uses an exported in-process capture function in S6.

### S3 start-check correction

C-A1's original textual `schemaVersion: 2|schemaVersion !== 2` grep reports zero because the shipped state
uses the exported `SCHEMA_VERSION` constant rather than a literal at those call sites. The equivalent
executable check is `node --input-type=module` importing `SCHEMA_VERSION` and asserting strict equality to 2,
plus the existing required state test command. Both pass. No source/schema change is made to satisfy a grep.
C-RES remains the exact exported-function check and reports one match.

## S4 execution record — 2026-10-20

Owner approved S3. C-WIRE passed. The S4 tests cover identical capture-only groups, one registration per event,
exact sh invocation under Node-only PATH despite Bun settings, absent-Node non-blocking failure, and migration
propagation/idempotence with wrapped-command preservation. Both settings files are edited together. The required
S4 implementation commit includes the existing prerequisite and adapter changes so its registrations never point
to a missing module. Tracking/evidence records are committed separately after checking that source commit.

### File-budget command correction after S4

The unbounded S7 `git log --grep workflow-usage-capture` also matches the earlier A1 commit body, adding its
report source/test even though this capture build does not edit them. Scope the commit search to this build's
starting HEAD, `868212b..HEAD`, before filtering names. S4's implementation commit changes 10 implementation/release
files; the projected complete file set remains 15 after the approved prerequisite exception. Historical A1 files
must not be counted as new capture changes merely because that commit mentions this dependent pitch.


### S7 file-budget measurement refinement

Use the complete implementation diff from the build base, `git diff --numstat 868212b -- ':!.project'`,
to enforce the 15-file / 1,500-added-LOC cap. Commit-message filtering misses S6's plugin commit because
its title says OpenCode workflow step intervals rather than the pitch slug. The complete diff includes
all implementation and release files regardless of commit wording. The release update remains at /ship.

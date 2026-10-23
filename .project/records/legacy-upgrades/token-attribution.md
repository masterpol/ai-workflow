# Source-review supplement: token-attribution

Prepared 2026-10-22 from verified recovery sources. This is the durable record of the token-attribution pitch (bet and shipped 2026-10-19, release 2.34.0, base ref 633adb3) now that its done-work narrative is retired; no compact pitch-compression record exists. Results are historical evidence, not a new certification. Part 1 of 2; part 2 was `token-time-report`. Contract: [token consumption guide](../../../ai-framework/docs/token-consumption.md) and [state report](../../../ai-framework/integrations/state-report.md). Lessons: [read before the lease, commit cursor and totals together](../../knowledge/patterns/read-before-the-lease-commit-cursor-and-totals-together.md), [a worker's passing tests can encode the wrong data shape](../../knowledge/issues/a-workers-passing-tests-can-encode-the-wrong-data-shape.md), [reversible aggregates store their routing](../../knowledge/patterns/reversible-aggregates-store-their-routing.md), [pin directory identities across async leases](../../knowledge/patterns/pin-directory-identities-across-async-leases.md), [metrics ancestor swap during async lease](../../knowledge/issues/metrics-ancestor-swap-during-async-lease.md), [a version migrator edits the token, not the model](../../knowledge/patterns/a-version-migrator-edits-the-token-not-the-model.md), [schema bump left 98 stale tests](../../knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md), [async agent launch counted as completion](../../knowledge/issues/async-agent-launch-hook-counted-as-completion.md), [hardening a shared reader made its writer destructive](../../knowledge/issues/hardening-a-shared-reader-made-its-writer-destructive.md), [display buckets are not lifecycle identities](../../knowledge/patterns/display-buckets-are-not-lifecycle-identities.md), [resolve before matching a protected path allowlist](../../knowledge/patterns/resolve-before-matching-a-protected-path-allowlist.md). Design records: [dimensions design](../../knowledge/decisions/token-metrics-dimensions-design.md), [lease design](../../knowledge/decisions/collector-metrics-lease-design.md). Code: [collector](../../../ai-framework/hooks/scripts/token-consumption.mts), [transcript reader](../../../ai-framework/hooks/scripts/transcript-usage.mts), [report](../../../ai-framework/hooks/scripts/token-report.mts), [state snapshot](../../../ai-framework/scripts/state-snapshot.mts), [OpenCode plugin](../../../.opencode/plugins/token-consumption.ts), [hook template](../../../ai-framework/hooks/hooks.json), [live settings](../../../.claude/settings.json). Backlog: [followups](../../pitches/_followups.md). Conflicting figures are kept as recorded under Historical contradictions.

## What shipped

The owner could not say which pitch, phase or scope spent tokens, and Claude (1,499 completions, all subagent runs) and Codex (51) reported no tokens. Every completion now carries numeric usage and a pitch, phase and scope key.

| Scope | Outcome (all done 2026-10-19) |
|---|---|
| S1 | Spike: placement `snapshot-map`, TTL 6 h, 32 sessions, lease baseline 0/12 |
| S2 | Spike: Codex verdict `session-log` (shape unconfirmed); Codex pair deferred |
| S3 | Spike: verdict `subagent-file`; last line wins for repeated ids; `Stop` approved |
| S4 | Usage reader module; worker output rewritten on the main thread (wrong data shape) |
| S5 | Snapshot revision 3, append-only migration, directory-identity pin (cf8ecfe) |
| S6 | Phase-start hook and exported `resolvePhaseContext` (556a60f) |
| S7 | Flows with caps, transcript cursors, `Stop` session-turn (101b4ba) |
| S8 | By Flow table and Unattributed share (b577c54); worker output reviewed |
| S9 | Docs (67dce8d); worker output reviewed |
| S10 | Rollout record, scratch bundle-sync dry run, release 2.34.0 |

Appetite big-batch, cap 15 files / 1,500 LOC. SHIPPED recorded 12 of 15 files; the plan budgeted 14 of 15. `ai-framework/docs/token-consumption.md` and `state-report.md` were updated in-pitch. No ADR-worthy decision beyond the pitch records.

## Scope and design

Breadboard places: P1 active-context pointer, P2 usage reader, P3 collector, OpenCode plugin and hooks, P4 snapshot schema revision. Phase-start writes the pointer through a collector `phase-start` event on `UserPromptExpansion` plus the existing skill-use path; the model is never asked to write it. Completion with no valid context is `(unattributed)` and the share is reported. Child sessions resolve to the parent via `session_id`. The reader reads from a saved offset before the lease, keeps only `model`, `message.id` and `usage` numbers, dedups by id, advances only to the last complete newline, and resets on a shorter file. Offset and totals commit in one atomic write under the lease. Owner decisions 2026-10-19 overrode earlier no-gos: Claude usage is read from the local transcript (numbers only), attribution is pitch, phase, scope. The pitch was split from `token-metrics-redesign` after critique A1 (22 files projected).

## Spike findings

- Placement: a bounded `contexts` map inside the snapshot (same atomic write, no new path-safety surface). Per-file pointers would need distinct refusal outcomes and stale cleanup. Requires the revision bump first.
- Hook keys: all hooks carry `session_id`, `transcript_path`, `cwd`, `hook_event_name`. Subagent hooks carry the launching session id, so lookup is by `session_id`. Hooks inside a subagent carry `agent_id` and must never replace the parent's context. `command_args` and `tool_input.args` are free text: keep only a validated slug and an `S<n>` token. A phase can arrive via both slash command and Skill tool, so phase-start is idempotent.
- Phase set: shape, shape-lite, critique, plan, build, audit, ship, cooldown, fix, resume, switch, checkpoint (three copies must agree; a test asserts it). `resume` and `switch` write a pointer for their pitch with scope `(none)`; `checkpoint` only refreshes an existing pointer's timestamp.
- Pitch source: first argument if a slug and `.project/pitches/<slug>/` is a real directory (not a symlink, not `_`-prefixed). The sole-row `status.md` fallback was proposed, then dropped by the owner; no usable argument means `(unattributed)`. Scope changes inside one `/build` fire no hook and are invisible.
- TTL 6 h sliding, refreshed by each attributed completion; cap 32 sessions (drop expired, then oldest); never refuse to record because the map is full. Both are named constants with boundary tests.
- OpenCode: the plugin passes only `session_id`; no parent id, so child completions are `(unattributed)`. Skill tool forwards no arguments. Unverified whether session-created events expose a parent id.
- Codex: SubagentStop carries no usage fields. Rollout files likely hold `token_count` events with `total_token_usage` (input, cached input, cache write, output, reasoning, total); no sample existed locally, so the shape is unconfirmed. Parser estimate about 45 LOC. `orca-start-codex-hook.test.mts` pins exactly one `UserPromptSubmit` and one `SubagentStop`.
- Worktrees: Claude resolves root via `$CLAUDE_PROJECT_DIR`, Codex via `git rev-parse --show-toplevel`; each linked worktree has its own `.project/metrics`. Decision: document the limit, do not resolve to the main checkout (extra git spawn per hook, cross-checkout trust).
- Transcript shape: assistant lines carry `message.model`, `message.id`, `message.usage` (`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`). One line per content block, so ids repeat; repeats were contiguous in the 60-file contiguity sample, usage differs on 205 of 1,779 repeats and only `output_tokens` grows, never shrinks (610 files). Keep the last line. Parent transcripts have 0 sidechain lines; subagent usage lives only in separate `subagents/` files (49,104 of 52,716 lines `isSidechain`). Read subagent usage from `agent_transcript_path` and skip sidechain lines in parents. Sizes p50 527,815 bytes, max 76,509,810. Compaction or resume can fork or rewrite files, so keep the shorter-file reset. Under Orca `CLAUDE_CONFIG_DIR` is set, so the root is that or `~/.claude`.
- Main-session `Stop` was recommended and approved as a `session-turn` event (agentType `primary`); it changes Claude's completion unit.
- Hook order SubagentStop then PostToolUse(Agent) for foreground agents is what the code encodes; live timing was not observed. Tests keep both orders working.
- Lease flake baseline 0/12 at base ref (recorded history about 1 in 12, so thin evidence); S4 to S7 and S10 rerun the loop and accept no more.

## Plan and gate decisions

Scopes S1 to S3 spikes (parallel, read-only), S4 reader, S5 revision 3 plus directory-identity pin, S6 pointer and phase-start, S7 stamping and flows, S8 report, S9 docs, S10 rollout. S5 deliberately lands before any scope writes new data, so no commit writes pointers or flows under `schemaVersion: 2`. S5, S6, S7 edit the same collector file and run strictly sequentially on the main thread; S8 and S9 were dispatched. Firm budget 14 of 15 files (reader and test, collector and test, report and test, hooks.json, settings.json, state-snapshot and test, state-report.md, token-consumption.md, CHANGELOG, VERSION); projected about 1,300 of 1,500 LOC. Impact scan found three files the pitch missed: `state-snapshot.mts` line 36 (`SUPPORTED_METRICS_SCHEMAS`), its test, and `state-report.md` line 76; without them `/state` would turn `unavailable` after the bump.

Spike gate (2026-10-19, owner Approve): placement `snapshot-map`; neither contingent pair (Codex pointer, OpenCode child sessions) goes to followups; `Stop` `session-turn` approved; status.md fallback dropped; S3 rules (subagent file, skip sidechain, keep last line); execution through Orca (coordinator claude, implementation opencode, review codex).

Claims in the pitch checked against code: orca-start hooks cannot be the shared phase-start (they return before stdin when Orca is off); no phase-finish hook exists; scope only from arguments; `upgrade` logic only upgrades `unavailable` records, so a foreground `agent-result` after a transcript-reported SubagentStop must be absorbed or it counts twice; the base collector refuses `schemaVersion > 2`; the directory-identity pin was never ported from `workflow-metrics-state`; the bucket-key first-come cap would push every pitch after the 50th into `(other)`, hence the LRU fold.

Design details kept: flows nested `flows.pitches[pitch].phases[phase].scopes[scope]` with vendor rows at the leaf (no string joins); each record stores `flow: { applied, pitch, phase, scope }` so upgrade, replay and reversal reuse the stored key even after the context moves; records without `flow.applied` are skipped on reversal; apply then reverse deep-equals the start and underflow throws; the LRU fold never removes a row that `current` or `previous` routes to; `transcripts` is keyed by sha256 of the real path, capped at 200 LRU; file cap 4 MiB, full-cap snapshot under 2 MiB.

## Deviations

- D1: the plan named `upgradeClaudeCompletion`; code has `canUpgradeClaudeCompletion` inside `recordCompletion`.
- D2: S1 baseline recorded 0/12, thin against the recorded 1 in 12.
- D3 (S5): 7 suite failures from `ai-framework/scripts/state-test-helpers.mts:3` importing `node:assert/strict` (also red on a clean HEAD export; doctor reported one runtime-boundary FAIL) were accepted as pre-existing and out of budget. By S7 the failure was gone in the working tree and not caused by this pitch.
- D4 (S6): sole-row fallback dropped, so its symlink/oversize/FIFO tests do not apply; `Stop` registration moved to S7 so no commit wires an event the collector would count as a completion.
- D5 (S4): signature `readTranscriptUsage(file, deps, options)` returning `{status: "ok" | "refused"}`; `options.final` releases the last message group (SubagentStop), otherwise it is held back. The worker's Orca worktree had an old base, so reconcile was skipped and the main thread replaced its files.
- D6 (S7): `Stop` registered in hooks.json and settings.json; `transcript_path` documented but not observed live; a missing path degrades to an `unavailable` primary completion; a session-turn with no new usage is not a completion.
- D7 (S7): the "1.5, -1, 2e12 become null" exit is tested through the exported helper `transcriptTokens`.
- D8 (S7): scope recency is insertion order (move-to-end); pitches carry `at`; reversal restores counters, not `at`.

## Standing constraints

- No transcript text, prompts, responses or tool arguments stored; marker tests (`TRANSCRIPT-TEXT-MARKER`) scan every file under `.project/metrics` (json, md, html, rejected) and stderr. Reader outputs only values built from parsed numbers and bounded ids, re-validated with `integerOrNull` at the write point.
- No estimated tokens or cost for any vendor; Claude cost stays `Unpriced`.
- No per-message or per-run logs; every collection capped (pitches 50, scopes 25, 600 leaf rows, 200 transcript cursors, 32 contexts).
- Lease mechanism unchanged; the two metrics stores are not merged; the collector exits 0 always and never blocks the agent.
- No Cursor collector, dashboard server or network calls; no back-filling (counts start at the revision date, printed in the report).
- Path safety: realpath both sides, distinct `refused` outcomes (never null), `O_NOFOLLOW`/`O_NONBLOCK`, `fstat` identity match, containment re-check after open, macOS `/var` alias test that asserts its own input shape.
- Naming: "token snapshot revision", never "v3".

## Rabbit holes and risks

Resolved: pointer placement, key caps (LRU fold), exactly-once under replay, partial trailing line, shorter file and failed write, path safety including the macOS alias, lease hold time (read before the lease; only offset commit and aggregate write inside it), lease-port flake (0/12 at S1, S6, S7). Pushed to plan with owners: pointer placement and parent-child mapping (S1); Codex usage availability (S2, one-hour box, undecided counts as unavailable); per-worktree split (S1); key caps (S3 risk, built in S7); rollout interaction with `workflow-v3-rollout` and test-port isolation (S4/S10). Deferred: time, flow outcome, efficiency ratios and the joined report (part 2, `token-time-report`), estimated cost, history back-fill. Surfaced at ship: oversized-line cursor stall (fixed in audit as SE3), label collisions in the report (fixed as C3), unverified live payloads (`Stop` `transcript_path`, foreground hook order).

## Audit history

One cycle, dispatched security (independent: yes), code and test (independent: no), cross-pitch (haiku, no canary); ux, i18n, eval not applicable. Three reviewers got planted canaries in scratch copies; the three canary must-fixes (C1, SE1, T1) were refuted against the repo. Code and test reviewers cited the canary as `~948-953` and `~944-949` (canary at line 945), so the mechanical canary check was false and both are recorded `independent: no`; both still returned real findings. Reviewers were read-only (guard check: changed set equals the thread's own 6-file cycle-1 patches).

Fixed with tests and mutants: C2 (`(unattributed)` phase rendered as "Other (overflow)"; fixed with flowLabel; rated must-fix by the code reviewer and real), C3 (colliding cleaned flow names erased rows; merged), SE2 (containment re-check after open), SE3 (a line longer than the read window never advanced the cursor), SE4 (directory pin taken after the transcript read; reordered), T2 (inode check mutant), T3 (200-cursor eviction), T4 (shorter file on same inode). Acknowledged: T5 path-length cap 4096 is an equivalent mutant; T6 locked id-window filter is defense in depth; collector tests use real lease ports derived from their own temp roots (no flake in repeated runs), in-memory `tryListen` only in new phase tests; `leastRecentPitch` NaN order; `resolveFlow` can overshoot the leaf cap by one `(other)/(other)` row; context strings are only checked to be strings (file capped at 4 MiB). Cross-pitch: no blocker; token-attribution first in merge order; `workflow-usage-capture`, `state-deep-evidence`, `state-ai-authoring`, `state-fragment-sanitizer`, `state-report-redesign` also edit hooks.json, settings.json, state-snapshot.mts, state-report.md and release files and rebase on this pitch.

Evidence after fixes: Node full suite tests 1870 / pass 1867 / fail 0 / skipped 3; Bun on ai-framework/hooks 233 pass / 0 fail; setup-validator exit 0; graphify --check clean; workflow-doctor 0 FAIL; added `any` count 0.

## Build notes

- S5 mutant: guard `> SNAPSHOT_REVISION + 1` fails the "newer schema" and "revision newer than this collector" tests. S4 mutant: removing realpath containment fails the refusals and CONFIG_DIR tests. S7 mutants (each fails a named test): drop upgrade routing reuse, drop pitch cap fold, drop agent-result absorb, drop offset filter and id window, count empty session-turn, drop replay routing reuse (a test was added after the first run missed it). S8 mutants: raw flow labels fail the hostile-label test; dropping the zero-completions branch fails the unattributed-line test.
- S4 worker (Orca ta-s4-a1, opencode) reported 17 passing tests but read `usage`/`model` at the top level instead of `message.usage`/`message.model`, accepted FIFOs, used the wrong root (`CLAUDE_CONFIG_DIR` without `/projects`), had no recent-id window, no held-back last group, no lstat/fstat identity check, and imported the Node adapter. The main thread rewrote module and tests (19 tests); the worker's numbers were not used as evidence. S8 (ta-s8-a1, opencode) and S9 (ta-s9-a1, codex) outputs were reviewed line by line and exit commands rerun on the main checkout before acceptance.
- First S8 dispatch was refused with opencode-port-held (a fresh `opencode serve --service` started 31 s earlier by launchd); stopped under the standing approval and the retry launched. S8 worker release state `retained`.
- Test counts: S6 78 collector tests Node and Bun (124 with orca-start and opencode-plugin tests); S7 94 collector tests Node, 105 with transcript-usage on Bun, full suite 1853 pass / 0 fail / 3 skipped.

## Rollout

Hook and collector changes land before `workflow-v3-rollout`'s next bundle-sync (that pitch was still `shaped`). Scratch dry run 2026-10-19: base 633adb3 exported with `git archive`, then `bundle-sync.mts --source <this checkout> --json` from it; exit 0; 7 new files, 0 changed, 0 local, 0 conflict, 0 removed, 0 flagged, 15 unverified; `transcript-usage.mts` appears, so the reader reaches synced projects. Next step for `workflow-v3-rollout`: rerun its scratch-copy dry run against this checkout. Operator step for any syncing project: restart OpenCode and any process that loaded the old collector; until then it skips events with "newer than this collector understands" and nothing is corrupted.

## Open followups

Eight items recorded in [followups](../../pitches/_followups.md) under "From token-attribution (2026-10-19)":
1. Codex usage: parse the session log for `total_token_usage` (about 45 LOC); on-disk shape unconfirmed, as is whether `UserPromptSubmit` and `SubagentStop` repeat one session id; needs `.codex/hooks.json` and `orca-start-codex-hook.test.mts` changes (medium).
2. OpenCode child sessions: no parent id passed, so child completions are `(unattributed)`; verify whether session-created events expose one (low-medium).
3. Verify live: Claude `Stop` payload carries `transcript_path`; `SubagentStop` vs `PostToolUse(Agent)` order for foreground agents (low).
4. One pitch across several worktrees splits its metrics; no join or main-checkout resolution (low).
5. Cap edge cases: `leastRecentPitch` NaN sort, `resolveFlow` leaf overshoot by one row, context labels only checked to be strings (low).
6. Path-length cap and locked id-window filter are equivalent mutants (low).
7. Cross-pitch ruling between `state-report-redesign` and `state-deep-evidence`; the latter's plan.md:27 is stale because the resolver export exists (medium).
8. Brief workers with the data shape and pin the worktree base to HEAD; `ai-workflow.toon` is git-ignored so workers cannot run doctor-based checks (low).

## Historical contradictions

- The shipped record says "0 real must-fix, 5 should-fix fixed"; audit.md lists eight fixed findings and one real report bug rated must-fix (C2).
- SHIPPED says 12 of 15 files; the plan budgeted 14 of 15.
- The lease-flake baseline 0/12 conflicts with the recorded history of about 1 in 12; it is weak evidence, not proof of a fix.
- The pitch's claims (orca-start hooks write the pointer; pointer cleared at phase finish; old in-memory collectors corrupt data) were corrected by the plan as described under Plan and gate decisions.
- The S5 hill note says a followup for the `state-test-helpers.mts` failure would be written at /ship; the eight shipped followups do not include it, and the failure had cleared in the working tree by S7.

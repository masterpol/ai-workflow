# Source-review supplement: orca-auto-start-all-phases

Prepared 2026-10-22 from verified recovery sources. Durable record of the pitch shaped, built and shipped 2026-10-08 (v2.20.0, big-batch narrowed after critique to core plus the Claude hook, 2 audit cycles, zero must-fix at exit). Results are historical evidence, not a new certification. Design: [decision](../../knowledge/decisions/orca-auto-start-design.md). Lessons: [fail-closed hook](../../knowledge/patterns/a-blocking-hook-owns-its-runner-and-its-deadline.md), [bare probe command](../../knowledge/issues/a-probe-child-ran-a-bare-command-with-the-parent-path.md). Shipped narrative: [run record](../../runs/2026-10-08-orca-auto-start-all-phases.md). Contract: [orca-vendors](../../../ai-framework/integrations/orca-vendors.md) "Automatic start". Code: [decision library](../../../ai-framework/scripts/orca-start.mts), [CLI](../../../ai-framework/scripts/orca-run.mts), [hook](../../../ai-framework/hooks/scripts/orca-start-hook.mts), [hook template](../../../ai-framework/hooks/hooks.json), [live settings](../../../.claude/settings.json). Backlog: [followups](../../pitches/_followups.md). Conflicting figures are kept under Historical contradictions.

## Problem and shaping

With `AI_WORKFLOW_ORCA_MULTI_AGENT=true` a user expects every phase to run through Orca; only build, audit and ship mentioned Orca as optional prose, and in this project the switch was true for a whole pipeline while the fallback to ordinary subagents happened silently (the cause: `status.dispatchReady: false` misread as "cannot launch"; `evaluateLaunch` is the launch authority and returned allowed for codex and opencode). Must-have: switch on, Orca starts on every phase; switch off or unset, normal workflow with no side effects; switch on but not ready, stop and ask, never fall back silently. Appetite: big-batch, bet 2026-10-08 narrowed to core `start` plus Claude hook (about 9 files). Knowledge that constrained it: opt-in before runtime discovery (off path reads only the switch), a gate spawns exactly what it probed (never cache), idempotent replay must re-check the gate, hook payload shapes must be captured not assumed, override tokens are parsed from raw args, one boundary selects the child runner, a thin CLI keeps guards in the library, and the status-dispatch-ready and workers-differ-from-the-coordinator issues.

Breadboard: `orca-run.mts start --phase --vendor [--args-text]` prints one JSON line `{state: off|ready|blocked|worker, reason}`; exit 0 proceed, 4 blocked, 2 usage, 1 internal (3 stays "normal or refused" for existing subcommands). Decision table: switch not exactly `true` is `off` (no policy read, PATH lookup, probe or output); `--worker-context` is `worker`; gate denial is `blocked` with reason and the offer of `orca=normal`; all verified is `ready` with the line `Orca: ready (coordinator <v>, workers <list>)`. The Claude hook exits 2 with the reason on stderr to block, and adds one context line on ready.

Critique (2026-10-08, Orca workers, advisory): A1 appetite 41 files / 1800-2800 lines against 15 / 1500, so split (addressed by narrowing); S1 cumulative fail-closed deadline (R10); S2 trusted worker identity (R11); S3 refusal after ready must not fall back (R12); S4 bypass grammar (R13); S5 off path re-exec (R14); A2 mirror contract deferred; K1-K12 missed knowledge added; X1 validator overlap (R15).

## What shipped

Scopes P0, S0-S5 done. 15 delivery files at the cap, about 1,000 lines: `orca-start.mts` and test, `orca-run.mts` and test, `orca-start-hook.mts` and test, `hooks.json`, `.claude/settings.json`, `orca-vendors.md`, and build/audit/ship skills with their Cursor mirrors. Result per promise is in the [run record](../../runs/2026-10-08-orca-auto-start-all-phases.md#pitch--implementation). Not delivered: start blocks in all 12 skills and the Codex, OpenCode and Cursor adapters (later pitches). Built and audited through real Codex and OpenCode workers.

## No-gos

- Never start or probe Orca when the switch is not exactly `true`.
- No silent fallback when the switch is `true` and Orca is not ready.
- Do not change the dispatch core, ledger, reconcile or the launch gate's checks.
- Worker output never picks commands, paths, vendors or approvals; the human Approve / Revise / Back / Stop gates are unchanged.
- Do not claim Codex, OpenCode or Cursor triggers work without a live run in that host.
- Read no `.env*` and add no new configuration file; the switch source stays env plus `ai_workflow_env.json`.
All six held at ship.

## Plan contract

`decideStart(options)` returns `{state, reason, line, workers?}`. States: `off` (exit 0, empty line); `worker` (flag, or the caller's `ORCA_TERMINAL_HANDLE` is an agent terminal of an open dispatch; exit 0); `bypassed` (switch true and the whole token `orca=normal`; exit 0; line `Orca: bypassed by request (orca=normal)`); `ready`; `blocked` (exit 4; `Orca requested but not ready: <reason>. Fix it, or re-invoke with orca=normal to run this phase without Orca.`). Decision order is fixed: switch, bypass, worker identity, gate. A cumulative deadline (default 4 s) covers every probe; expiry is `blocked: timeout`. Nothing is cached. Scope plan: P0 free two stale ledger slots; S0 payload spike; S1 library (520 LOC est); S2 CLI; S3 hook; S4 docs; S5 stop-and-ask wording (separable if above 12 files / 1,300 lines). Exit criteria were Node and Bun runs of each scope's test file, invariants (no `any`, no `node:` imports in production files), workflow-doctor and setup-validator READY, and guard tests proven with in-memory mutants. Blast radius: orca-run tests and grader, `workflow-doctor` (parses hooks.json and settings.json), `runtime/invariants.test.mts`, `skill-defaults.mts` as the token-extraction model. Parallel dispatch used Codex workers for S1-S3 and OpenCode for S4-S5 and review, briefed scratch-safe, with coordinator git-status baselines and rerun of every exit command.

## Rabbit holes and how they closed

Resolved at shaping: stop and ask (user decision 2026-10-08), only bypass is the per-call `orca=normal`; "workflow skills" means the twelve phase skills (helper skills such as search, impact, state, sync, setup, changelog, bundle-sync, workflow-doctor, add-skill, caveman, knowledge-health, dependency-security, pitch-compress do not start Orca); workers never start Orca (`--worker-context`); off path reads the switch (env, then `ai_workflow_env.json` from the trusted root) and exits before any policy read, PATH lookup or spawn.

- R1 typed commands: observed live; they fire `UserPromptExpansion`, not `PreToolUse(Skill)`.
- R2 exit 2 blocks; a timeout lets the call through, so the script owns a 5 s deadline.
- R3 other hosts: deferred, not claimed live. R4 meaning of "starts" without fan-out: minimum is the start line plus honouring `blocked`; dispatch wiring only in critique, audit, build. R6 mirror drift: deferred.
- R5 readiness source: `evaluateLaunch`; worker vendor authentication unverified and not claimed.
- R7/R10 budgets: hook timeout 8 s, script deadline 5 s, decision budget 4 s; hook prints JSON only when ready, text on stderr when blocked.
- R8 appetite: narrowed (A core plus hook now, B adapters later).
- R9 worker-side `orca`: found by live smoke. A Codex worker finished its read-only task but could not send `worker_done`: its shell resolved `orca` to `/usr/local/bin/orca`, a root-owned symlink that fails with "Unable to determine Orca.app path from symlink", while the coordinator's PATH found the working `/Applications/Orca.app/Contents/Resources/bin/orca`. Also seen: workers reuse the coordinator checkout, and an unsettled attempt holds a `maxConcurrentWorkers` slot. Shipped: worker-PATH resolution check under the worker env allowlist.
- R11 worker identity: no env marker exists (observed identical `ORCA_*` pane variables); flag plus terminal-handle lookup in `orca orchestration worker-list`; unverifiable means blocked.
- R12 refusal after ready: build/audit/ship prose changed to stop and ask; dispatch core untouched.
- R13 bypass grammar: whole token only, one call, ignored when quoted or embedded, only after the switch is true; tested.
- R14 off path: the hook keeps `runDirect` (invariants require it) but its command forces `AI_WORKFLOW_RUNNER=node`, so a missing optional runner cannot fail open (found and fixed in audit).
- R15 validator overlap: production files clean; test files' direct `node:*` imports were a followup (migrated later, see open items).
Pushed to no-go: the 12-skill block rollout (24 canonical files plus mirrors), host adapters, making any worker answer trust prompts, approve gates or ship, and a persistent "always bypass" setting (would recreate the silent fallback).

## Build log facts

- P0: `evaluateLaunch` allowed codex and opencode; two stale ledger records (`attempt-smoke-test-2`, `attempt-live-smoke-opencode-1`) were moved to `failed` through the ledger library, not deleted, freeing both slots.
- S0 (observed in the session): `PreToolUse` matcher `Skill` carries `tool_input.skill`, `tool_input.args`, `tool_name`, `tool_use_id`, `session_id`, `permission_mode`, `cwd`, `prompt_id`; it did NOT fire for a typed `/state`. A subagent's skill call does fire it, with `agent_id` and `agent_type`. Typed `/state` fires `UserPromptExpansion` (`command_name`, `command_args`, `command_source`, `expansion_type`, `prompt`) then `UserPromptSubmit`; `UserPromptSubmit` also fires for `<agent-message` notifications and plain text. A settings.json hook edit applied without restart; the temporary hook was removed and settings restored byte-for-byte.
- S1: Codex via Orca; coordinator reran node 29/29, bun 29/29, invariants 5/5; real run against Orca 1.4.222: ready in 520 ms, bypass honoured, quoted token ignored. S2 and S3 ran in parallel; live the hook printed `Orca: ready (coordinator claude, workers codex, opencode)`; by-hand: no policy gives exit 2 policy-missing, bypass exit 0, non-phase and switch-off silent exit 0, bad stdin with switch on exit 2. S4 documented the code where it differs from the plan; S5 (OpenCode) changed only marker blocks, the coordinator rewrote the sentence in build's Orca section that still said every other case runs normally and re-copied the Cursor mirror.

## Deviations

- S3: hook keeps `runDirect`, so the plan's "plain Node, no re-exec" was only partly met (closed by the runner prefix).
- S2/S4: `start` requires `--root`.
- S5: the worker edited only the marker blocks; the coordinator finished build's second Orca section.
- S1 evaluates the gate once with the coordinator vendor then checks worker membership and presence, not one `evaluateLaunch` per worker (confirmed against `dispatchScope`).

## Audit triage

Cycle 1 (three Orca workers: security and code review on Codex, test-coverage on OpenCode; all independent; no UI, strings or prompts so ux, i18n, eval n/a). Canary: the bypass check moved before the switch check in a scratch copy only (`orca-start.mts:123`, fails 2 scratch tests); all three workers caught it; that finding is the canary, not a defect. Read-only verified by `review-bench guard check`.
- M1 (security): the probe ran bare `orca` with the full parent env; `resolveExecutable` inspects absolute PATH entries only but the child resolved through the original PATH including relative entries, so a project-local `./orca` with `.` on PATH forged the worker list and made `decideStart` return `worker`, skipping readiness. Reproduced by the coordinator. Fix: spawn only the absolute realpath returned by `resolveExecutable`, with `buildWorkerEnv` (allowlisted env, absolute PATH only), for both the worker-list lookup and status probe; tests for a forged `orca` in a relative PATH entry and the project root, an empty PATH entry, and an unchanged real lookup. See [the issue](../../knowledge/issues/a-probe-child-ran-a-bare-command-with-the-parent-path.md).
- M2 (security/code): the hook goes through `runDirect`, which re-execs the configured runner; with switch on, `AI_WORKFLOW_RUNNER=bun` and no bun on PATH it exited 1 (non-blocking), so the phase proceeded unchecked. Fix: both hook commands (`.claude/settings.json`, `ai-framework/hooks/hooks.json`) start with `AI_WORKFLOW_RUNNER=node `; the hook test reads the command from the settings file, asserts the prefix, expects exit 2 with switch on and runner bun without bun on PATH, and exit 0 silent with switch off; docs limitation updated (POSIX shell prefix, not valid in Windows cmd). See [the pattern](../../knowledge/patterns/a-blocking-hook-owns-its-runner-and-its-deadline.md).
- S1: build/audit/ship prose ran `start --phase <name>` without `--root` and stopped only on exit 3/4; fixed to `--root .` and stop on 1, 2, 3 and 4 in canonical and Cursor files. S2: hook branch coverage 57% (untested non-slash `UserPromptExpansion`, unknown `hook_event_name`, non-string phase; in orca-start: malformed pagination object, `gate-error` to `internal`, win32 path); tests added. S3: an invalid runner value was echoed raw (first 40 chars) in the pre-main error; resolved by M2.
- Acknowledged: test files' direct `node:*` imports (cross-pitch with the runtime-boundary validator); repeated whole `orca=normal` tokens and Unicode whitespace separators accepted as the token (harmless, the user typed it); coordinator-side `evaluateLaunch` children still see the parent env (existing launch gate, out of scope).
Cycle 2 (one OpenCode security re-review, independent, narrowed to the changed area; test-coverage and code reviewers not re-dispatched, their items verified by the coordinator rerunning every suite on Node and Bun). Canary: worker lookup restored to the bare command and full parent env (`orca-start.mts:148`); caught. Coordinator verification: finding 1 was the canary; finding 2 (`runtime/cli.mts:21/35`) reproduces only without the configured `AI_WORKFLOW_RUNNER=node` prefix; through the exact settings command under `sh` the result is exit 2 (switch on) or exit 0 silent (off). Reruns: Node orca-start 33, orca-run 26, hook 17, invariants 5, workflow-doctor 6 (+1 skipped), skill-defaults 27, grader 10; Bun orca-start 33, orca-run 26, hook 17; setup-validator READY; mirrors identical. Result: no must-fix after 2 of 3 cycles. Residual: a hook entry copied without the prefix (another host, hand-edited settings) fails open when the runner is missing.

## Verification history

Node full suite 1149 tests, 1148 pass, 0 fail, 1 skipped; Bun 1140 tests, 1139 pass, 0 fail, 1 skipped; setup-validator READY, graphify CLEAN; no build, typecheck, lint or i18n command exists here. One intermittent `token-consumption` failure appeared only while the Bun suite ran concurrently (passes 3/3 alone and in the final run; also fails on a clean HEAD sometimes). Live evidence for Claude Code only.

## Lessons and where they live

[Decision](../../knowledge/decisions/orca-auto-start-design.md), [pattern](../../knowledge/patterns/a-blocking-hook-owns-its-runner-and-its-deadline.md) and [issue](../../knowledge/issues/a-probe-child-ran-a-bare-command-with-the-parent-path.md) were extracted at ship. Earlier the same day: `status-dispatch-ready-false-is-not-launch-authority` and `orca-workers-differ-from-the-coordinator-environment`. Method lesson recorded only here: plant a canary in a scratch copy and require every reviewer to cite it; reproduce each finding on the real tree before fixing.

## Open items and later status

As recorded at ship (also in [followups](../../pitches/_followups.md)): (1) fail-closed exit code in `runDirect` for hook scripts; (2) move `orca-start-hook.test.mts` and `orca-start.test.mts` off direct `node:*` imports, since resolved by the 2026-10-17 migration of 49 test files (the leftover bullet itself was not struck); (3) 12-skill start-block rollout plus Codex, OpenCode and Cursor adapters, later pitches (a Codex coordinator adapter shipped separately in 2.22.0); (4) coordinator-side launch-gate probe env. Found after ship: `lookupWorker` requests `--limit 100` worker rows and the local receipt (268,003 bytes) exceeds the 262,144-byte output cap, so Orca-requested phases can block with `worker-identity-unavailable`; backlog candidate pitch `orca-bounded-control-receipts`.

## Historical contradictions

- Typed commands: shaping assumed `PreToolUse(Skill)` would see them; observation showed only `UserPromptExpansion` does. Shipped on both events.
- Bypass: the shaped table made it `off` with a note; the plan contract names a `bypassed` state.
- The plan promised a plain-Node hook without `runDirect`; shipped keeps `runDirect` and forces the runner by command prefix.
- The plan said one `evaluateLaunch` per worker; shipped does one gate check plus membership.
- Timeouts: the pitch says a 5 s hook timeout; the plan says a 4 s decision budget and 8 s hook timeout; the pattern records 5 s script, 8 s hook, 4 s budget.
- The shaped-only followup line saying the pitch is "shaped (critique pending)" is stale; it shipped as 2.20.0.
- The retiring done-work narrative says each of twelve phase skills already runs decideStart, then says the twelve-skill blocks are deferred. The source run record confirms the narrower core-plus-Claude-hook delivery; both statements are preserved as conflicting historical scope claims.

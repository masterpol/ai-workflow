# Pitch: orca-auto-start-all-phases

**Date**: 2026-10-08  •  **Appetite**: big-batch (epic risk: decompose if critique projects >15 files — see R8)
**Stack**: backend (Node `.mts` tooling, hooks, skill playbooks)

## Problem

Someone who sets `AI_WORKFLOW_ORCA_MULTI_AGENT=true` expects every workflow phase to run through Orca. Today only `build`, `audit` and `ship` mention Orca, only as optional prose ("run `status` first"), and nothing starts it. In this very project the switch was `true` for the whole pipeline and no phase used Orca; the fallback to ordinary subagents happened silently, without asking. The user wants this as a **must-have**: switch on → Orca flow starts on every phase; switch off or unset → normal workflow, no side effects; switch on but Orca not ready → **stop and ask**, never fall back silently.

## Knowledge consulted

- [patterns/opt-in-before-runtime-discovery] — constrains: the off path reads only the switch, then stops. No policy read, PATH lookup, or probe when off. The start check must run on every skill call, so the off path must be nearly free.
- [patterns/a-gate-spawns-exactly-what-it-probed] — constrains: the start check returns what it verified; dispatch spawns exactly that. Re-probe each time, never cache; the user-facing switch is checked first.
- [issues/an-idempotent-replay-path-returned-success-without-re-checking-the-gate] — constrains: any "already started" shortcut must re-check the switch and gate, or a disabled switch still reports started.
- [issues/async-agent-launch-hook-counted-as-completion] — warns: hook payload shapes were assumed, not observed, and double-counted. Capture real `PreToolUse(Skill)` payloads before relying on them (a spike, not a guess).
- [issues/prose-instructions-must-specify-how-to-extract-from-free-form-arguments] — constrains: a per-call override token must be extracted from raw, unparsed args the way `caveman=` is (`skill-defaults.mts resolve-mode`), never assumed to be a clean value.
- [patterns/one-boundary-selects-the-child-runner] — applies: hooks and the start command spawn through `runtime/entry.mts` `workflowInvocation` so `AI_WORKFLOW_RUNNER` is honoured.
- [decisions/caveman-mode-is-default-everywhere] and [decisions/skill-defaults-attribution-guard-and-runtime-design] — precedent: one resolver script, called from every phase, with an in-message override token and a persistent file. This pitch reuses that shape.
- `ai-framework/integrations/orca-vendors.md`, `build/audit/ship` SKILL.md Orca blocks — constrain: workers never launch workers or ship; gates stay human; worker text is data.
- Observed here (this session, not a stored entry): `orca-run.mts status` reports `dispatchReady: false` **by design** (the foundation reports never grant launch authority), and `status --probe` shows `caller-unverified` because `ORCA_AGENT_SESSION_ID` is unset. Neither blocks launching: `orca-launch-gate.mts` `evaluateLaunch` is the launch authority and deliberately accepts `caller-unverified` (an external coordinator gets no `caller` block). It returned `allowed: true, launch-allowed` for codex and opencode in this session. Earlier in this session that `dispatchReady: false` was misread as "Orca cannot launch" and phases ran on ordinary subagents. The `start` check must call `evaluateLaunch`, never read `dispatchReady`.

## Solution sketch (breadboard, NOT wireframe)

**Places**
1. `orca-run.mts start` (new subcommand, logic in a new `orca-start.mts`): the single decision point.
2. Host triggers: Claude Code `PreToolUse(Skill)` hook; OpenCode plugin `tool.hook`; Codex hooks; Cursor and any host without hooks use step 3 alone.
3. A shared **Orca start block** at the top of each phase skill (`shape`, `shape-lite`, `critique`, `plan`, `build`, `audit`, `ship`, `cooldown`, `fix`, `resume`, `switch`, `checkpoint`) and its mirrors, kept in sync by a script and checked by a test.
4. The phase's existing fan-outs (critique perspectives, audit reviewers, build scopes) route through `orca-run.mts dispatch` when `start` says `ready`.

**Affordances**
- `orca-run.mts start --phase <name> --vendor <coordinator> [--args-text "<raw>"]` prints one JSON line `{ state: "off" | "ready" | "blocked" | "worker", reason, dispatchReady }`.
- Exit codes: `0` = proceed (`off`, `ready`, or `worker`); `4` = blocked, stop and ask; `2` usage; `1` internal. (`3` stays "normal workflow or refused" for the existing subcommands.)
- Override token in the skill args: `orca=normal` for this one call only. Parsed from raw args exactly as `caveman=` is. It is the only way past `blocked`, so the user answers the question once per call, and nothing persists silently.

**Connections / decision table**

| Switch | Policy / runtime | Result |
|---|---|---|
| unset / false / any other value | not read | `off`: normal workflow, no probe, no spawn, no output |
| `true` and `--worker-context` set | not read | `worker`: workers never start Orca; behave normally |
| `true` | `evaluateLaunch` denies: policy missing/invalid, runtime unreachable, version unsupported, launcher or worker vendor absent | `blocked` + reason: the phase stops, says why and what to fix, offers `orca=normal` |
| `true` | all verified | `ready`: print the first line `Orca: ready (coordinator <v>, workers <list>)`; fan-outs use `dispatch` |
| `true` and `orca=normal` in args | not read | `off` for this call, with a one-line note that Orca was bypassed by request |

**Claude hook behaviour**: on `blocked` the hook exits 2 with the reason on stderr so the harness blocks that Skill call and Claude relays the question; on `ready` it adds the one-line context. Prose block in each skill repeats the same call for hosts and entry paths the hook cannot see.

## Rabbit holes

**Resolved here** (with answer):
- Silent fallback vs stop → resolution: **stop and ask** (user decision 2026-10-08). The only bypass is the explicit per-call `orca=normal` token.
- Which skills count as "workflow skills" → resolution: the twelve phase skills named above; helper skills (`search`, `impact`, `ui-design`, `test-strategy`, `eval-harness`, `state`, `sync`, `setup*`, `changelog`, `bundle-sync`, `workflow-doctor`, `add-skill`, `caveman`, `knowledge-health`, `dependency-security`, `pitch-compress`) do not start Orca.
- Recursion → resolution: a call carrying `--worker-context` (or an Orca worker env) returns `worker`; workers never start Orca.
- Off path cost → resolution: `start` reads the switch (env, then `ai_workflow_env.json` from the trusted root only) and exits before any policy read, PATH lookup or spawn.

**Pushed to /plan as risk** (with named owner):
- R1 (S0 spike): do **user-typed** `/shape`-style commands fire `PreToolUse(Skill)`, and what does the payload contain (skill name, args)? Capture the real payload first. If not, the `UserPromptSubmit` hook matches a leading `/<phase>` and the prose block remains the fallback.
- R2 (S0 spike): confirm a `PreToolUse` hook exit code 2 blocks a Skill call and delivers stderr to the model on this Claude Code version.
- R3: OpenCode (`tool.hook`) and Codex (`hooks.json`) trigger support is unverified; plan lists them as best-effort adapters plus the prose block, never claimed as live-proven (live proof exists for Claude only).
- R4: what "Orca flow starts" means in `shape`, `plan`, `ship`, `cooldown`, `resume`, `switch`, `checkpoint`, which have no natural fan-out. Plan decides per phase; minimum is the start line plus honouring `blocked`. Only `critique`, `audit`, `build` get dispatch wiring in this pitch.
- R5: `start` decides from `evaluateLaunch` per configured worker (policy eligible, runtime reachable, exact supported version, launcher present), not from `status.dispatchReady` or `ORCA_AGENT_SESSION_ID`. `blocked` reason text carries the gate's reason code and the fix for it. Unverified, not claimed: worker vendor authentication.
- R6: mirror drift across `.claude`, `.cursor`, `.agents`, `.opencode` for twelve skills; a generator script plus a byte-identity test, per the mirror-check issue.
- R7: a per-call `node` start on every skill call must stay under the hook timeout (5 s) even with the probe; `ready`/`blocked` probe uses the existing launch-gate deadlines.
- R8 (appetite): twelve skills × four mirrors plus script, hooks, tests and docs likely passes 15 files. If critique's appetite audit says so, split: **A** `start` command, hook, tests, docs (Claude proven); **B** skill blocks + OpenCode/Codex adapters.

- R9 (found by live smoke 2026-10-08): `start` must check what a worker will actually run, not only the coordinator's `orca`. A Codex worker finished its read-only task correctly (named the five exported functions) but could not send `worker_done`: its shell resolved `orca` to `/usr/local/bin/orca`, a root-owned `lrwx------` symlink dated Sep 9 that fails with "Unable to determine Orca.app path from symlink". The coordinator's own PATH finds the working `/Applications/Orca.app/Contents/Resources/bin/orca` first. Plan decides whether `start` runs a cheap worker-PATH `orca status` check (spawn with the worker env allowlist) and what `blocked` says. Also seen: a worker reuses the coordinator's checkout (`worktree ... reused`), and an unsettled attempt keeps holding a `maxConcurrentWorkers` slot (second launch returned `max-concurrent-workers`).

**Pushed to no-go** (deferred):
- Making any Orca worker answer trust prompts, approve gates, or ship.
- A persistent "always bypass Orca" setting (would recreate the silent fallback).

## No-gos (this pitch)

- ✗ Starting or probing Orca when the switch is not exactly `true`.
- ✗ Any silent fallback when the switch is `true` and Orca is not ready.
- ✗ Changing the dispatch core, ledger, reconcile, or the launch gate's checks.
- ✗ Letting worker output pick commands, paths, vendors, or approvals; changing the human Approve / Revise / Back / Stop gates.
- ✗ Claiming Codex/OpenCode/Cursor triggers work without a live run in that host.
- ✗ Reading `.env*`, or any new configuration file; the switch source stays env plus `ai_workflow_env.json`.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

(Empty until /critique runs.)

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

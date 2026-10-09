# Pitch: orca-auto-start-all-phases

**Date**: 2026-10-08  •  **Appetite**: big-batch, narrowed after critique to batch A+B (core `start` + Claude hook, about 9 files). The 12-skill rollout and the Codex/OpenCode/Cursor adapters are separate pitches (see Critique A1).
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
- [issues/status-dispatch-ready-false-is-not-launch-authority] — **core**: the pitch exists because this misread ran whole phases without Orca. `start` must call `evaluateLaunch`, never read `dispatchReady`.
- [issues/orca-workers-differ-from-the-coordinator-environment] — constrains `start`: a ready gate does not prove the worker can report back (worker-side `orca` path, stale vendor servers, `collect` rejecting out-of-project report paths, idle workers holding slots, shared checkout).
- [patterns/a-report-never-overwrites-a-file-it-did-not-write] — applies to anything `start` writes (a startup note must not replace a user's file).
- [issues/a-local-workflow-env-file-changes-which-runner-path-tests-spawn] — applies: tests for `start` must pin the runner in the child env; run them under Node and Bun.
- Added by critique (knowledge-historian): [patterns/a-thin-cli-keeps-every-guard-in-the-library] (`start` stays a thin JSON CLI over `orca-start.mts`), [patterns/parse-untrusted-values-and-re-emit-them] (parse `orca=normal`, never a raw substring), [patterns/a-gate-must-not-trust-its-own-author] and [patterns/settle-only-with-proof-bound-to-this-patch] (no cached "already started"), [patterns/keep-the-fakes-guarantee-the-thing-they-replace] and [patterns/prove-a-guard-test-with-an-in-memory-mutant] (guard tests), [patterns/git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded] (worker-PATH probe in a shared checkout), [issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check], and `ai-framework/rules/{security.md §9,testing.md}`.
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

- R10 (critique S1): one cumulative deadline for `start`. Preflight allows three 5 s probes (`orca-preflight.mts`) against a 5 s hook timeout; the hook must fail closed to `blocked: timeout` (never hang, never a silent pass), and its stdout must separate machine JSON from the human line (`orca-run.mts` emits JSON; the pitch promised silence/text).
- R11 (critique S2): trusted worker identity. `WORKER_ENV_MARKERS` are unverified guesses, are excluded from the child env, and a Skill call carries no `--worker-context`. `start` must get worker identity from a transport it controls (the dispatch brief names an env marker or a ledger lookup), else a worker's phase skill could start Orca and recurse.
- R12 (critique S3): after `ready`, a later refusal must not fall back silently. `dispatchScope` returns `normal` on cap, drift or gate refusal and `orca-run` maps that to exit 3; `build/audit/ship` SKILL.md still prescribe "continue normally". Under stop-and-ask these become `blocked` outcomes with the reason, which changes those three playbooks' wording (inside batch B, prose only; no change to the dispatch core's checks, see no-gos).
- R13 (critique S4): define the bypass grammar: `orca=normal` only as a whole token, once, from the user's own invocation; ignore quoted or embedded occurrences; handle empty and `--` args; a nested skill call (`/switch` calling `/checkpoint`, `/resume`) inherits the decision instead of re-asking.
- R14 (critique S5): the off path is not free. `runtime/cli.mts` selects and re-execs the runner before `main`, and `runtime/entry.mts` reads the runner file, so a disabled Orca with `AI_WORKFLOW_RUNNER=bun` and no Bun on PATH still fails. Either read the switch before any re-exec, or narrow the promise to "no Orca probe or spawn" and test the real entry under Node and Bun with an empty PATH (cf. the runner/PATH test issue).
- R15 (cross-pitch): `runner-aware-runtime-boundary-validator` scans new `.mts`; new orca/hook files must go through `RuntimeDeps` or the validator allowlist is negotiated first.

**Pushed to no-go** (deferred):
- The 12-skill block rollout (24 canonical files plus mirrors) and the Codex, OpenCode and Cursor host adapters: separate pitches after this one lands (critique A1).
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

Run 2026-10-08 through Orca workers (coordinator claude; Codex for skeptic + appetite, OpenCode for knowledge-historian + cross-pitch), on a scratch copy; `review-bench guard check` clean (read-only: verified). No canary was planted: pre-bet critique is advisory, so these count as `independent: no` under the audit contract. Advisory, not gating.

| ID | Perspective | Severity | Type | Suggestion | Disposition |
|----|-------------|----------|------|------------|-------------|
| A1 | appetite-auditor | high | scope-overrun | Optimized projection 41 files / about 1800-2800 lines (65 files if the four skill surfaces are stamped literally) against 15 / about 1500; split into core, Claude hook, host adapters, then 3-phase rollout batches | Address: narrowed to core + Claude hook (about 9 files); the rest become later pitches (no-go) |
| S1 | skeptic | high | rabbit-hole | Cumulative hook deadline, fail-closed; separate JSON from human output | Address: R10 |
| S2 | skeptic | high | rabbit-hole | Trusted worker identity transport; env markers are unverified guesses | Address: R11 |
| S3 | skeptic | high | rabbit-hole | After `ready`, refusal must stop/inspect, not fall back; build/audit/ship prose still says "continue normally" | Address: R12 |
| S4 | skeptic | medium | rabbit-hole | Bypass-token grammar and nested-call scope | Address: R13 |
| S5 | skeptic | high | rabbit-hole | Off path re-execs the runner before `main`: not free; test real entry under Node and Bun | Address: R14 |
| A2 | appetite-auditor | medium | mirror-contract | Cursor skills are byte copies, Codex/OpenCode are pointer stubs; the sync tool only creates missing copies | Defer to the rollout pitch |
| K1-K12 | knowledge-historian | low-medium | missed-knowledge | 12 patterns/issues and two rules not listed | Address: added to Knowledge consulted |
| X1 | cross-pitch | medium | overlap | Validator globs scan new orca files | Address: R15 |

## Bet decision

☑ **Bet** (→ /plan) — approved 2026-10-08, narrowed scope (batch A+B: core `start` + Claude hook, about 9 files). Critique A1, S1-S5, K1-K12 and X1 addressed in the pitch (R10-R15, no-gos); A2 deferred to the rollout pitch. The 12-skill rollout and host adapters are separate later pitches.  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

# Optional Orca vendor policy

Orca orchestration is opt-in. The optional local policy is `.project/orchestration.json`;
the bundle does not create it during setup or doctor repair. Start from
[orca-vendors.example.json](orca-vendors.example.json), which sets
`"use-orca-orchestration": false`. Keep this instance file out of version control.

The policy and preflight commands below are read-only diagnostics: every result uses the normal workflow
and reports `dispatchReady: false`. Launching is a separate opt-in library, described under
[Dispatch core](#dispatch-core-opt-in-library-only); peer messaging and reconciliation of worker changes are
not part of it. Quality, latency, and cost improvements require measurements; splitting work does not guarantee them.

## Switch: `AI_WORKFLOW_ORCA_MULTI_AGENT`

Orca is used only when `AI_WORKFLOW_ORCA_MULTI_AGENT` is exactly `true` (case-insensitive, surrounding spaces ignored).
Unset, empty, `false`, `1`, `yes` or anything else keeps the normal workflow. Set it in the process environment or in the
project-root `ai_workflow_env.json` as `"AI_WORKFLOW_ORCA_MULTI_AGENT": true` (the environment wins; the file is read from
the trusted root only, a symlink leaving the root is ignored, and `.env` is never read). With the switch off the launch gate returns `orca-multi-agent-disabled` first, before reading the policy,
probing Orca or spawning anything; `dispatchScope` and `dispatchWithRetries` return the normal workflow without a claim;
`orca-preflight --probe` does not contact Orca. The static policy and presence diagnostics still work. The switch is
necessary but not sufficient: dispatch also needs an opted-in policy and a supported Orca runtime.

## Policy contract

| Field | Contract |
|---|---|
| `schemaVersion` | Required integer `1` |
| `use-orca-orchestration` | Optional boolean; missing means `false` |
| `maxConcurrentWorkers` | Required integer from `1` to `3`; future dispatch ceiling |
| `maxRetriesPerTask` | Required integer from `0` to `2`; future retry ceiling |
| `coordinators` | Required object keyed only by `claude`, `codex`, or `opencode` |
| Coordinator `workers` | Required array of at most two unique other vendors |
| Coordinator `roles` | Required object; optional `implementation` and `review` routes must name a configured worker |

The vendor supplied to the report selects its coordinator entry; the configuration does
not replace the vendor executing the task. An absent coordinator or empty worker list
keeps the normal workflow. Unknown fields, self/duplicate workers, unknown vendors or roles,
invalid bounds, and nonboolean flags are rejected. There are no model overrides in this schema.

The reader accepts only a regular local file, at most 64 KiB, below the project root.
Symlinked policy files or ancestors, unsafe file replacements, inaccessible paths, and
nonregular files are refused. Missing, disabled, malformed, unsupported-schema, and refused
outcomes are distinct. Diagnostics omit policy contents and raw process errors.

## Inspect without execution

```sh
node ai-framework/scripts/orca-policy.mts report --vendor codex --json
node ai-framework/scripts/orca-preflight.mts report --vendor codex --json
```

Both commands accept `--root <project-directory>`; the default is the current directory.
The vendor is required. A false or absent flag prevents all Orca executable selection,
PATH availability checks, and runtime probes, including when `--probe` is supplied.
An enabled policy permits static executable-presence checks. Presence is informational
and does not prove vendor authentication or an available Orca runtime.

## Explicit runtime inspection

With a valid opted-in policy and a configured alternate vendor present:

```sh
node ai-framework/scripts/orca-preflight.mts report --vendor codex --json --probe
```

The only subprocess argv are `skills get orca-cli --json`,
`skills get orchestration --json`, and `status --json`. Calls use no shell, with a
five-second per-call timeout, twenty-second total budget, and 256 KiB output limit.
The selected launcher is never replaced after failure. Selection precedence is an explicit
`ORCA_CLI_COMMAND` executable (not command text), then `orca-dev` when `ORCA_DEV_REPO_ROOT`
is set, then `orca`. On Linux outside an identified Orca session, use `orca-ide` to avoid
selecting the unrelated screen reader. Unsupported selection keeps the normal workflow.

Runtime diagnostics conservatively target the inspected Orca 1.4.223 contract (first verified against 1.4.222). Guide
markers establish documented capabilities only. A reachable local runtime, matching version,
and live caller session matching `ORCA_AGENT_SESSION_ID` provide limited session evidence;
they do not prove an enabled orchestration feature, authenticated vendors, or safe dispatch.
Unknown fields and experimental-feature assertions do not supply that proof. Successful
fixture receipts are test evidence. The live coordinator observations below establish only
the inspected runtime and flows; other versions remain unverified until their contract is reviewed.

`--worker-context` prevents coordinator selection and all probes when the caller is an
existing worker. This is an explicit caller guard; session presence alone does not identify
the coordinator. The preflight and policy commands never launch workers; the dispatch core adds the flag to every brief.

## Workflow doctor

Doctor reads the policy through the guarded reader and never calls preflight or Orca.
Absent/disabled policy is informational; valid opt-in is reported with runtime unverified
and dispatch disabled. Present malformed, unsupported, or refused policy is a diagnostic
failure. Correct or remove the local policy; doctor `--fix` does not create or rewrite it.
Unavailable Orca or vendor tools do not make the installation fail.

The orchestration interfaces are described by the
[official Orca guide](https://www.onorca.dev/docs/cli/orchestration) and
[maintained coordinator guide](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration.md).
The installed-source contract and live-verification limits are recorded in the foundation
pitch's S2 evidence. Each new dispatch flow must obtain live proof before relying on this policy;
the coordinator observations below do not establish every host or authentication state.

## Automatic start (every workflow phase)

`orca-start.mts` makes a fresh readiness decision for each invocation; it does not launch workers.
The CLI and host adapters recognize twelve phases: `shape`, `shape-lite`, `critique`, `plan`,
`build`, `audit`, `ship`, `cooldown`, `fix`, `resume`, `switch`, and `checkpoint`.
Other skills pass through the hook. Checks run in this fixed order: switch, bypass token,
worker identity, then gate. Nothing is cached between calls.

| State | Condition | Human line (`line` in the CLI result) |
|---|---|---|
| `off` | Switch is off; no Orca policy read, executable lookup or probe | Empty |
| `bypassed` | Switch is on and raw arguments contain the whole token `orca=normal` | `Orca: bypassed by request (orca=normal)` |
| `worker` | Switch is on, no bypass, and explicit worker context or terminal lookup identifies a worker | Empty |
| `ready` | Coordinator gate and worker checks pass | `Orca: ready (coordinator <v>, workers <list>)` |
| `blocked` | A check refuses, identity lookup cannot be verified, a probe times out, or an internal error occurs | `Orca requested but not ready: <reason>. Fix it, or re-invoke with orca=normal to run this phase without Orca.` |

`orca=normal` must be an unquoted, unescaped, whitespace-delimited whole token in the raw
invocation arguments. Embedded or quoted occurrences do not match. It bypasses this one call,
is never persisted, and is ignored when the switch is off. Because bypass precedes worker
identity, a worker invocation carrying this token returns `bypassed`.

Worker identity comes from the brief's `--worker-context` flag (passed as `workerContext` to
the decision library), or from matching `ORCA_TERMINAL_HANDLE` against agent terminal handles
in `orca orchestration worker-list` for an open dispatch. No identifying worker environment
marker exists in the observed coordinator and worker environments. A terminal lookup that
cannot be verified blocks rather than assuming the caller is a coordinator.

The decision calls `evaluateLaunch` with the coordinator vendor. It then checks that workers
named by that coordinator's policy roles belong to its worker list and have executables in
the worker environment. Worker-side `orca` must resolve to the same executable the gate
probed, and `orca status --json` in that environment must report a local, ready, reachable
runtime at the supported version. Neither `status.dispatchReady` nor `ORCA_AGENT_SESSION_ID`
is the start decision's authority. Executable presence does not verify vendor authentication.

```sh
node ai-framework/scripts/orca-run.mts start --root . --phase <name> [--vendor v] [--args-text raw]
```

`--root` and a recognized `--phase` are required; `--vendor` defaults to `claude`.
The CLI prints one JSON object containing `state`, `reason`, `line`, and, when ready, `workers`.
It exits 0 for `off`, `worker`, `bypassed`, or `ready`, and 4 for `blocked` (2 for usage errors).
On `blocked`, stop the phase and ask the user to fix the reason or re-invoke with `orca=normal`;
do not silently continue with the normal workflow.

Claude Code wiring in `ai-framework/hooks/hooks.json` uses `PreToolUse` with matcher `Skill`,
reading `tool_input.skill` and `tool_input.args`. Typed slash commands do not fire that hook;
`UserPromptExpansion` handles them through `command_name` and `command_args` when
`expansion_type` is `slash_command`. Calls with `agent_id` set pass through, including Claude
subagent calls. The hook is silent for `off` and `worker`; `ready` and `bypassed` add the line
as `hookSpecificOutput.additionalContext`. A blocked decision writes the line to stderr and
exits 2, preventing the phase invocation.

The decision budget is 4 seconds, the hook script deadline is 5 seconds, and each configured
hook timeout is 8 seconds. The script enforces its own deadline with a timer and an elapsed-time
check after synchronous probes, exiting 2 itself so blocking does not depend on a host timeout
that can allow the invocation to continue.

Automatic start is proven live for Claude Code only. The Codex adapter is described below;
its host activation requires separate proof. OpenCode and Cursor adapters and start blocks
in each phase skill remain later pitches. Startup hook commands force
`AI_WORKFLOW_RUNNER=node` before invoking Node, so a configured Bun runner that is missing
cannot bypass readiness checks. This environment assignment prefix requires a POSIX shell;
it is not valid in Windows cmd. Workers share the coordinator checkout;
automatic start provides no checkout isolation.

### Codex startup and coordinator preparation

Codex registers `UserPromptSubmit` in `.codex/hooks.json`, preserving the existing
`SubagentStop` metrics registration. Its adapter is
`ai-framework/hooks/scripts/orca-start-codex-hook.mts`. It uses the same `decideStart`
library with `vendor: "codex"`, not the CLI's default `claude`. It recognizes only an explicit
leading `/phase` or `$phase` with an exact supported phase name. Quoted examples, unrelated
skills, embedded command names and ordinary prose do not trigger it. Arguments after the
phase name are passed through unchanged, so quoted or escaped `orca=normal` remains data.

The trusted registration resolves the invocation checkout with Git and supplies that same
root for the script path and `--root`. A failed Git lookup exits 2 with a fixed
`project-root-unavailable` reason before starting Node. This registration requires Git and
a Git checkout. Root lookup precedes the adapter switch check, so a failed Git lookup blocks
any prompt even when Orca is off; the adapter's off/no-probe guarantee applies once bootstrap
succeeds. Payload `cwd`
and other vendors' root environment variables cannot select the policy root. Input is
bounded to 64 KiB. Off and worker decisions are silent; ready and bypass decisions add
`hookSpecificOutput.additionalContext` for `UserPromptSubmit`. A blocked decision emits
the safe reason to stderr and exits 2. The adapter enforces the same four-second decision,
five-second script and eight-second host budgets described above. It never creates a Run
or launches workers.

Codex requires review and trust of changed hook definitions through `/hooks`; use a fresh
session to verify activation. Configuration presence and shell fixtures do not prove that
the host ran a hook. If activation is unavailable, record it as **unverified**. Never bypass
hook trust or alter global Codex configuration to manufacture proof. The POSIX registration
pins Node; missing Node, unsupported shells, and bootstrap failures before the adapter starts
are not proven blocking paths.

The entry instructions in `AGENTS.md` require the Codex coordinator to run startup before
**every** phase, including phases chosen from conversation and sessions without trusted hooks:

```sh
node ai-framework/scripts/orca-run.mts start --root . --phase build --vendor codex --args-text ""
```

Supply the actual phase and unchanged invocation arguments via structured tool arguments or
safe quoting; never interpolate free-form prompt text into shell code. On blocked/error/refused
outcomes stop and ask; only an explicit per-call `orca=normal` selects the normal workflow.
Dispatched workers follow their live brief instead of coordinating.

Before any dispatch after `ready`, inspect `orca orchestration run-current --json` with the
same selected executable. If absent, create and bind a Run for the pitch using
`orca orchestration run-create --objective "<pitch objective>" --json`. Preserve its ID in
local evidence. Reuse an existing binding only after checking the objective and coordinator;
do not replace an unrelated binding silently. A readiness decision does not establish a bound
Run. A live Codex session with no bound Run passed readiness but could not dispatch; binding
the Run resolved that prerequisite.

Dispatch input names `coordinator: "codex"` and an alternate configured `vendor`. Collect the
attempt's own authoritative `worker_done`, independently inspect edits and rerun exit commands,
then release settled workers and acknowledge deliveries. Unknown-liveness attempts retain
ownership until inspected; never retry merely because a launch receipt is missing.

**Observed evidence:** Codex coordinated read-only Claude and OpenCode reviews through the
existing dispatch library, accepted each worker's own report, and released and settled all
four workers. Two editing workers and nine audit workers also completed through this Codex
coordinator; shared-checkout edits were independently verified and every terminal released.
This proves those coordinator paths for the inspected runtime. It does not prove
hook activation, isolated editing-worker reconciliation, every authentication state, or other runtime
versions. The separate host hook case remains unverified until a trusted fresh invocation
is observed. Existing projects receive entry-file changes through manual bundle-sync review;
sync does not automatically replace their `AGENTS.md`/`CLAUDE.md`.

## Dispatch core (opt-in, library only)

`orca-dispatch.mts` sends one scope to one alternate vendor through `orca orchestration worker-start`.
It is a library for the build phase, not a command, and stays inert unless the policy opts in.

- **Roles**: the `coordinator` is the vendor running the task and selects the policy entry; the worker (`vendor`) must be
  one of that coordinator's configured workers. A coordinator is never launched as its own worker.
- **Launch gate** (`orca-launch-gate.mts`): re-reads the policy and re-probes the runtime immediately before every
  launch; allowed only for an eligible policy and the exact supported Orca version. It spawns exactly the executable the
  probe selected (`ORCA_CLI_COMMAND`, `orca-dev` or `orca`); a different `launcher` is refused. An external coordinator
  has no `caller.orcaSessionId`, so the gate does not require it. A worker (the `--worker-context` flag, or a worker env
  marker, which is unverified) is always denied. The child environment is an allowlist with absolute PATH entries only.
  Briefs start with a plain-text line, carry the flag on its own line, and are bounded (4 KiB per field, 16 KiB total).
- **Placement**: only the typed fields `worktree`, `repo`, `name`, `baseBranch`, `setup`, `model` and `effort` become
  flags, each value matching a strict grammar. Free-text flags are refused.
- **Ownership ledger** (`orca-ledger.mts`): one record per attempt under `.project/metrics/orca-ledger/`. Reads report
  `missing`, `refused` or `corrupt` separately and a writer never treats the last two as missing; symlinks, FIFOs and
  oversize files are refused. Completion requires the worker's own report id, and a dispatch id is set once.
- **Dispatch**: a claim precedes the spawn and the deadline is checked before it; a replayed or crashed attempt is
  inspected, never relaunched; one live attempt per task. A failure at `agent_readiness` or with residual resources is
  returned to the user. A timeout, output overflow, signal exit, unreadable receipt or missing dispatch id means unknown
  liveness. Only a readable receipt with no failed stage and an explicitly empty `residualResources` list is retryable, capped by the smaller
  of the caller's value, the policy's `maxRetriesPerTask` and 5, each retry with a new attempt id.
  The policy's `maxConcurrentWorkers` caps the attempts that are claimed, launched or of unknown liveness; a further
  dispatch returns the normal workflow.
- **Mail**: only a `worker_done` whose dispatch id matches the ledger completes an attempt; ids, payloads and file lists
  are parsed against a grammar (file lists may not name `.git` or `.project`), text is stripped of control and bidi
  characters, and a report that contradicts the recorded outcome is refused. A settled attempt accepts only a replay of its own completion report.
- **Runtime**: the Node and Bun adapters set `errorCode` `ETIMEDOUT` or `ENOBUFS` for async `run`, and a deadline is not
  extended by a grandchild process that keeps a pipe open.

Observed live (Orca 1.4.222, `runtime-contract.md` in the dispatch pitch): Claude launch, completion, settlement and
isolation. Not observed: Codex and OpenCode completion, and peer messaging. Those remain live-smoke criteria.

## Reconcile core (opt-in, library only)

`orca-reconcile.mts` brings completed workers' changes onto the coordinator checkout. It is a library, off unless
`AI_WORKFLOW_ORCA_MULTI_AGENT=true`; the phases reach it through the CLI below. Everything before the apply is side-effect free.

- **Order**: switch, ledger state (only an attempt completed by its own `worker_done`; a corrupt or refused slot stops
  everything), hardened diff admission, claims versus the measured diff, check-definition guard, baseline check run,
  snapshot and apply of all workers, post-apply checks, hash-verified evidence, ledger `settled`, then cleanup.
- **Diff admission** (`orca-diff-admit.mts`): reads the worker tree through git with hooks, attributes, filters,
  textconv, fsmonitor and global config disabled. The changed set comes from `git diff --raw` plus untracked files, never
  from worker mail. It rejects symlinks, submodule entries, bad or aliased paths, case collisions, special modes,
  oversize diffs, a baseline that is not an ancestor, an unmerged index, and anything under `.project/metrics/` (local
  data); binary files round-trip. The no-filter guarantee holds for admission only: later steps are guarded separately (below).
- **Apply** (`orca-apply.mts`): refuses when HEAD moved or an admitted path overlaps the user's uncommitted work
  (no merge, no conflict markers). Overlap is judged from `git status` and also from the bytes on disk against the
  baseline blob and the index flags (assume-unchanged, skip-worktree), because a worker sharing the repository can make
  `git status` blind to an edit; the executable bit counts as part of an edit. It refuses when any `filter.*` driver is
  configured in the repository (clean/smudge drivers run worker-chosen commands during `git status` and `git apply`,
  and `git status` scans the whole tree, so a driver on an untouched file still runs; this also blocks Git LFS
  repositories), when a patch declares a symlink or submodule mode, and when a path lies under `.project/metrics/`. It runs `git apply --check` for every worker before any write; snapshots only the touched
  paths; refuses symlinked ancestors; a later failure rolls back only those paths. It never uses stash, reset, checkout of
  the tree, clean, restore or force.
- **Checks**: only commands from a catalog the trusted caller passes in, with the worker env allowlist and a deadline.
  They run on the baseline first; a check that passed there and fails after the apply is worker-caused and rolls the change
  back (`rollbackOnFailure: false` keeps it and reports `failedChecks`). A diff that touches check definitions (package
  and lock files, config, `node_modules/`, test directories, `ai-framework/scripts/`, hooks, adapters, evals), a path the
  coordinator ignores, or a different file set than the worker claimed needs `humanConfirmed`. Checks run worker-authored
  code with your home directory readable; without a sandbox that cannot be prevented, so review diffs first.
- **Evidence and cleanup** (`orca-evidence.mts`): patch, manifest with file hashes and check output are copied under
  `.project/metrics/orca-evidence/` and verified. A worker tree is removed (plain `git worktree remove`, never force or
  prune) only with positive proof: verified evidence, a parsed release receipt with `state: "released"` (not `retained` or
  `user_takeover`), a clean tree registered under an allowed workspace root, and no commits the evidence does not cover.
  Evidence verification also checks each file's executable bit. Otherwise the attempt ends `integrated-uncleaned` with the leftover paths. A repository with any configured `filter.*`
  driver, or a nested repository (gitlink) in the worker tree, keeps that tree (cleanup would run `git status` against it,
  and `performCleanup` honours only a decision from `decideCleanup` that pins the evidence hash and the worker HEAD, and re-verifies the evidence, the HEAD, the filter and nested-repository guards and that the tree is clean, ignored files included, immediately before `git worktree remove`), and git runs with absolute PATH entries only. A rerun re-admits the worker's diff, detects that it is already in the tree (contents and executable
  bit), runs the checks (a resumed attempt is settled only if every check passes, even in a batch with new workers, and a resumed change in the tree means no check is excused as already failing at the baseline), and reuses evidence only if it was written for exactly that patch and those entries; a settled attempt whose worker tree is gone is trusted only on verifying evidence.
- **Limits**: a path could be swapped for a symlink between the check and `git apply` (which itself refuses to write
  through one); snapshot directories are not pruned; a worker that leaves edits uncommitted keeps its tree.

## CLI, grader and live-smoke status

**CLI.** `node ai-framework/scripts/orca-run.mts <status|dispatch|collect|reconcile> --root <dir> [--input <file>] [--vendor <id>]... [--check <name>]...`
parses arguments, validates input, makes one library call and prints one JSON object. Every switch, launch, path and apply
guard stays in the libraries. `--input` is a regular file of at most 64 KiB inside `--root` (no symlinks). `--vendor` is
`status`-only and may be repeated to report several coordinators in one call; every other subcommand takes at most one.
`status` is
read-only (`--probe` opts into an Orca call). `--check` selects from a fixed catalog by name only: `workflow-doctor`,
`setup-validator`, `graph-check`, `node-tests`; command text cannot be supplied.

A `resume` outcome is re-checked against the current policy before it is returned: an attempt that already exists is only
handed back for inspection while the switch and the launch gate still permit the worker. Once the policy is disabled or the
switch is off, a repeated attempt id returns the same refusal a first attempt would get, not a success-shaped resume.

| Exit | Meaning |
|---|---|
| 0 | launched, resumed, accepted or integrated |
| 3 | normal workflow or refused with no side effects (switch off, ineligible, a guard refused) |
| 2 | usage error |
| 1 | internal error |

**Phase wiring.** `/build` (dispatch, collect), `/audit` and `/ship` (reconcile) carry one removable opt-in block each,
off unless `AI_WORKFLOW_ORCA_MULTI_AGENT=true`. Worker text is data and never chooses commands, paths, vendors or approvals;
the Approve / Revise / Back / Stop gates stay human.

**Grader.** `node ai-framework/scripts/orca-eval-grader.mts --root .` runs `.project/evals/datasets/orca-vendor-orchestration.json`
and reports each case as `executes` (run through the real libraries with fakes or temporary git repos), `parses-only`, or
`live-only` (always not-run). The summary keeps the three counts separate and never merges them. `static-fixtures-do-not-prove-runtime`
stays `liveCompatibility: "unverified"`; a smoke record cannot turn it into a pass.

**Live smoke status.** Nothing counts `not-run` as a pass.

| Target | Status |
|---|---|
| Claude (coordinator and worker) | observed |
| Codex coordinator | observed: Claude/OpenCode review dispatch, authoritative collection, release and ledger settlement |
| Codex startup hook | unverified: requires a trusted fresh host invocation |
| Codex worker | observed under Claude coordination; see the automatic-start design record |
| OpenCode worker | observed under Claude and Codex coordination |
| OpenCode coordinator | unverified |
| Peer messaging | not-run |

Manual smoke checklist: set the switch in a scratch project; run `status --probe`; dispatch one scope to an alternate vendor
with a spend cap you set in advance; `collect` after `worker_done`; `reconcile` with `--check workflow-doctor`; save the JSON
outputs under `.project/metrics/orca-smoke/` (local, Git-ignored) and record pass, fail or not-run per target in the pitch.

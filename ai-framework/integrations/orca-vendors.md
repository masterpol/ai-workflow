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
Unset, empty, `false`, `1`, `yes` or anything else keeps the normal workflow. Set it in the process environment or the
project-root `.env` (the environment wins; `.env` is read from the trusted root only and a symlink leaving the root is
ignored). With the switch off the launch gate returns `orca-multi-agent-disabled` first, before reading the policy,
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

Runtime diagnostics conservatively target the inspected Orca 1.4.222 contract. Guide
markers establish documented capabilities only. A reachable local runtime, matching version,
and live caller session matching `ORCA_AGENT_SESSION_ID` provide limited session evidence;
they do not prove an enabled orchestration feature, authenticated vendors, or safe dispatch.
Unknown fields and experimental-feature assertions do not supply that proof. Successful
fixture receipts are test evidence; no successful live Orca probe has been recorded here.
Other versions remain unverified until their contract is reviewed.

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
pitch's S2 evidence. Future dispatch work must obtain live proof before relying on this policy.

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
`AI_WORKFLOW_ORCA_MULTI_AGENT=true`, and wires into no phase yet (the audit/ship wiring and the executable grader belong
to the separate `orca-vendor-reconcile-integration` pitch). Everything before the apply is side-effect free.

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


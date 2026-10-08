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


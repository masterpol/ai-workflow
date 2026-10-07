# Optional Orca vendor policy

Orca orchestration is opt-in. The optional local policy is `.project/orchestration.json`;
the bundle does not create it during setup or doctor repair. Start from
[orca-vendors.example.json](orca-vendors.example.json), which sets
`"use-orca-orchestration": false`. Keep this instance file out of version control.

This release provides policy validation and read-only preflight diagnostics. Every result
uses the normal workflow and reports `dispatchReady: false`. Worker dispatch, peer messaging,
recovery, and reconciliation belong to the separately gated dispatch capability. Quality,
latency, and cost improvements require measurements; splitting work does not guarantee them.

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
node ai-framework/scripts/orca-policy.js report --vendor codex --json
node ai-framework/scripts/orca-preflight.js report --vendor codex --json
```

Both commands accept `--root <project-directory>`; the default is the current directory.
The vendor is required. A false or absent flag prevents all Orca executable selection,
PATH availability checks, and runtime probes, including when `--probe` is supplied.
An enabled policy permits static executable-presence checks. Presence is informational
and does not prove vendor authentication or an available Orca runtime.

## Explicit runtime inspection

With a valid opted-in policy and a configured alternate vendor present:

```sh
node ai-framework/scripts/orca-preflight.js report --vendor codex --json --probe
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
the coordinator. Foundation does not launch workers or inject worker context.

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

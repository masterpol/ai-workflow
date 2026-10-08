# Plan: orca-vendor-foundation

**Pitch**: pitch.md • **Appetite**: big-batch • **Hill**: hill.md
**Status**: approved. User's “next” accepted the foundation bet on 2026-10-07; subsequent approvals acknowledged impact/plan and authorized foundation build start. S1 and S2 continuation gates were approved. S3 is complete with evidence in `s3-evidence.md`; external audit completed; user confirmed ship on 2026-10-07; foundation is closed.

## Result and boundaries

Deliver a dependency-free, read-only policy/preflight utility and workflow diagnostics. It reports potential eligibility while the normal workflow remains active. It cannot launch workers, send messages, change Orca settings, install tools, commit changes, or authorize dispatch. The dispatch pitch activates delegation separately.

No UI, build system, LLM calls, or worker prompt edits belong to this foundation. Shared shaping fixtures are specifications; this plan converts only relevant policy/preflight cases into executed behavior tests. Dispatch/message/reconciliation fixture families remain assigned to the dependent pitch.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|---|---|---|---|---|---|---|---|
| S1 | Trusted policy contract and runnable inspection | `ai-framework/scripts/orca-policy.js`, `orca-policy.test.js`; `ai-framework/integrations/orca-vendors.example.json` | 400 | — | — | No; small cohesive contract, parent implements sequentially | — |
| S2 | Bounded read-only Orca preflight | `ai-framework/scripts/orca-preflight.js`, `orca-preflight.test.js` | 550 | S1 | — | No; settle policy API first; parent owns uncertainty handling | — |
| S3 | Diagnostic integration and portable documentation | `ai-framework/scripts/workflow-doctor.js`, `ai-framework/integrations/orca-vendors.md`, `.gitignore`, `VERSION`, `CHANGELOG.md` | 250 | S1, S2 | — | No; existing doctor edits and release records require one integration owner | — |

**Count**: 6 new + 4 modified files = 10 unique implementation files; approximately 1200 LOC. Pitch/hill/run records are tracked separately from the implementation estimate. Recount before build and stop for decomposition if >15 implementation files or >1500 LOC. Foundation's original 7-file/550-LOC estimate was optimistic; this plan includes hostile-input tests and release records without exceeding the batch cap.

## Policy contract

- Instance path: `.project/orchestration.json`, resolved only under the explicit real project root. Do not create it automatically. Missing policy means delegation disabled and normal workflow.
- Portable example lives in `ai-framework/integrations/orca-vendors.example.json`, with `"use-orca-orchestration": false`. Keep it outside `templates/project`: workflow-doctor currently requires every scaffold template in installed projects, which would incorrectly make this optional policy mandatory.
- Version 1 fields: `schemaVersion`, optional `use-orca-orchestration` (boolean, default false), `maxConcurrentWorkers` (integer 1–3), `maxRetriesPerTask` (integer 0–2), `coordinators` (only `claude`, `codex`, `opencode`). Each configured coordinator contains `workers` (unique alternate vendor IDs) and `roles` (only `implementation`, `review`; values must be enabled workers). Omitted coordinator means normal workflow. Empty worker list is valid but ineligible. Reject unknown fields and unsafe object keys. The boolean replaces the initial proposed `mode` field per the user's explicit build-time correction.
- Models and effort overrides are deferred; vendor configuration supplies defaults. No executable commands, shell snippets, secrets, arbitrary file paths, or executable selection in policy.
- Guard reads: check ancestor paths, reject symlinks/non-regular files, enforce realpath containment and a 64 KiB limit before parsing. Outcomes distinguish missing, refused, malformed, unsupported schema, disabled, and valid. Apply `security.md` §9; use a bounded descriptor read with no-follow/nonblocking protections where supported. Do not import a transaction writer just to read policy.
- `node ai-framework/scripts/orca-policy.js report --root <project> --vendor <vendor> --json` reports a normalized allow-listed result. Fallback is a successful diagnostic, not a process failure. Invalid invocation or unexpected internal failure exits nonzero; never expose raw file contents, CLI output, or exception messages.

## Preflight contract

- `node ai-framework/scripts/orca-preflight.js report --root <project> --vendor <vendor> --json` performs static checks only. Add `--probe` for bounded read-only runtime inspection. Doctor never passes `--probe`.
- `use-orca-orchestration` must be explicitly true before any Orca executable resolution, PATH availability check, or runtime probe. False or missing skips Orca checks entirely, even with `--probe`; malformed/refused policy also performs no Orca checks.
- Result separates coordinator/worker role, policy validity, static eligibility, runtime evidence, reason codes, vendor availability, and `dispatchReady: false`. Foundation always reports the execution route as normal; a candidate verdict is informational, not delegation authority.
- Trusted invocation supplies actual harness identity. Active worker context takes precedence and produces `worker-context`, preventing recursive coordinator selection. Future adapters must establish identity from their native entry point; this utility cannot prove an arbitrary caller's `--vendor` assertion.
- Resolve executable once per probe using the installed Orca skill's precedence: `ORCA_CLI_COMMAND`, dev session `orca-dev`, Linux external-session `orca-ide`, otherwise `orca`. Treat the override as one executable path/name, never a shell command. No substitution or alternate executable after failure.
- Read-only probe allowlist: matching `skills get orca-cli --json`, `skills get orchestration --json`, `status --json`, and a documented read-only current-workspace/caller/orchestration query only after the selected guide proves its contract. Execute argument arrays with `shell: false`; 5-second limit per call, 20-second total limit, 256 KiB output cap per call. Timeout/overflow/refusal stays unknown and returns normal workflow.
- Positive runtime evidence requires reachability, a verified enclosing Orca caller/workspace, supported required interfaces, and an enabled orchestration feature. Environment variables alone, help text, an app executable, or a guide's existence cannot prove runtime readiness. Optional absent fields mean unverified. If version 1.4.222 has no read-only way to prove a prerequisite, report it unverified; never substitute a mutating test or claim ready.
- Confirm vendor executables by bounded PATH presence checks only; do not invoke agent CLIs or inspect credential files. Presence is not authentication/model proof. Record authentication as unverified and reserve actual launch acceptance for dispatch smoke tests.
- No persisted runtime cache, no recovery-state files, no direct Orca socket/database access, no source parsing in production, and no setting changes. Persisted recovery semantics belong to dispatch.

## Exit criteria per scope

### S1 — Policy

- `node --test ai-framework/scripts/orca-policy.test.js` exits 0.
- Tests cover all three coordinator permutations, off/missing/malformed policy, unsupported schema, unknown keys, self/duplicate workers, invalid role routes, concurrency/retry bounds, empty worker list, oversized input, symlinked ancestor/file, FIFO, and refused access. Assert no writes and refusal distinct from absence.
- Policy/preflight fixture family from `.project/evals/datasets/orca-vendor-orchestration.json` is translated into explicit test inputs with exact outcome assertions; fixture presence alone is not a passing grader.
- `node --check ai-framework/scripts/orca-policy.js` exits 0; example parses and validates as disabled policy. Test CLI output is normalized JSON with no input markers or raw errors.

### S2 — Preflight

- `node --test ai-framework/scripts/orca-preflight.test.js` exits 0.
- Inject a fake process runner and explicit fake receipt shapes. Assert fixed executable selection, allowed argv only, `shell: false`, time/output bounds, no calls on disabled/refused policy, no installation/settings changes, and no launch/message/lifecycle mutations.
- Grade static-only inspection, missing CLI, the observed broken-launcher error, malformed/oversized output, missing caller/capability fields, unreachable runtime, disabled experimental feature, missing alternate vendor, unsupported host, worker-context precedence, and positive informational candidate evidence. Every result retains `dispatchReady: false` and normal execution route.
- POSIX fixture proves slow subprocess cancellation/output overflow returns bounded unknown/fallback. Platform-specific checks are labeled and skipped where unsupported; do not claim cross-host live verification.
- `node --check ai-framework/scripts/orca-preflight.js` exits 0.
- Capture the installed guide/version and a response-shape contract note in the build record. Actual Orca probe is optional smoke evidence while the selected launcher remains broken; injected receipts cannot establish local readiness.

### S3 — Diagnostics and integration

- `node --test ai-framework/scripts/orca-policy.test.js ai-framework/scripts/orca-preflight.test.js ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/bundle-sync.test.js` exits 0.
- The new preflight test file includes doctor integration subprocess cases in disposable bundle copies: optional absent policy passes; disabled/valid policy is reported; malformed/refused present policy is diagnosed without mutation; no Orca process is launched by default doctor. Unavailable external tools do not make workflow installation fail.
- `node ai-framework/scripts/setup-validator.js`, `node ai-framework/scripts/graphify.js --check`, `node ai-framework/scripts/changelog.js --check`, and `git diff --check` exit 0.
- `.gitignore` excludes instance `.project/orchestration.json`; portable example remains tracked. Use changelog tooling to record the structural addition at build time; do not bump during planning.
- Independently review policy/preflight security and diagnostic behavior before dispatch work relies on them. Normal audit/ship gates remain required. Compare final changes with the pre-build dirty-file inventory so unrelated OpenCode/doctor edits survive.

## Impact analysis — acknowledged

| Surface | Downstream consumers | Required verification | Risk |
|---|---|---|---|
| `workflow-doctor.js` | `setup-validator.js`, setup/bundle-sync playbooks, `skill-defaults.test.js`, `skill-vendors.test.js` | Keep optional policy informational; preserve all prior checks; do not probe Orca by default | Medium; shared script already has uncommitted edits |
| New `orca-policy.js` | preflight and doctor's static report | Shared validator tests, guarded input tests | Medium; untrusted configuration |
| New `orca-preflight.js` | CLI users now; future dispatch adapter | Fake-receipt behavior and bounded subprocess tests | Medium; capability uncertainty |
| New integration example/document | portable `bundle-sync` integration directory | Existing sync tests; disabled example, instance policy never synced | Low |
| `.gitignore` | source bundle checkout | Ignore only instance file; example still tracked | Low |
| `VERSION`, `CHANGELOG.md` | bundle update reporting | Existing changelog tool check | Low |

Six new and four modified implementation files. No native phase adapters, prompts, hooks, `AGENTS.md`/`CLAUDE.md`, setup-validator source, or scaffold requirements change. Existing CommonJS package scope already covers new scripts. No external dependencies. Boundaries are valid: policy uses Node standard library; preflight depends inward on policy; doctor consumes the static policy report. No app code imports.

The template scan discovered a concrete compatibility hazard: putting an optional policy under the scaffold would make existing projects fail doctor until repaired. Keeping the example under integrations resolves this without expanding setup/doctor repair semantics. The already-modified doctor requires a narrow patch; existing OpenCode model changes are outside this pitch.

## Risks inherited from shaping

| Risk | Scope | Spike needed? | Mitigation / owner |
|---|---|---|---|
| Broken launcher and unknown installed runtime fields | S2 | Yes, read-only response contract | Builder pins guide/version; unknown stays unverified. No executable switch without authorization |
| Experimental flag not exposed by a safe read-only query | S2 | Yes | Builder returns unknown/fallback rather than toggling it or mutating lifecycle state |
| Unsafe policy input and refusal conflated with absence | S1 | No | Explicit tagged outcomes, bounded guarded reads, hostile-input behavior tests |
| Optional configuration becomes required scaffold | S3 | Resolved in impact | Example outside scaffold; missing instance file remains valid |
| Partial foundation mistaken for enabled delegation | S2, S3 | No | `dispatchReady: false`, normal route, documentation and doctor tests |
| Shared doctor edits and underestimated integration work | S3 | No | Snapshot dirty state, narrow integration, count release/test files; re-shape if caps exceed |

## Parallel dispatch plan

S1, S2, then S3 sequentially. No parallel writers or vendor dispatch in this pitch. Audit uses the existing required reviewer fan-out. Profile availability must be verified; the shaping adapters using `gpt-5.6` failed on this account, so use an available inherited model for the same constrained role when needed.

## Wireframes

Not applicable; this pitch delivers JSON diagnostics and documentation.

## Living-spec deviations log

Build-time correction: user requested `use-orca-orchestration` in the same JSON configuration, with no Orca checks by default. Replace `mode` with this opt-in boolean; full rationale in `deviations.md`.

## Confirmation gate

Impact, plan, and foundation build start approved by the user on 2026-10-07. S1 and S2 continuation approved. User requested ship after external audit. User selected ship; closed. See SHIPPED.md. Live dispatch remains outside this approval.

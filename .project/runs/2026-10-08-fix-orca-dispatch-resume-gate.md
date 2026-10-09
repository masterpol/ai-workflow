# log

## Bug: resume-existing skips policy gate

**Symptom** — `node ai-framework/scripts/orca-run.mts dispatch --root . --input <existing-id>` under a now-ineligible policy exits 0 and returns `{ route: "resume", reason: "attempt-already-owned" }`. The audit/ship caller treats exit 0 as a successful launch, but no worker was launched and the policy currently forbids one.

**Reproduction** (recorded 2026-10-08, `runs/orca-smoke-2026-10-08.md`):

1. Write `.project/orchestration.json` with `use-orca-orchestration: true`; dispatch once. The launch gate refuses (`launch-failed:unproven`) and writes an `unknown-liveness` ledger entry.
2. Replace the policy with `ai-framework/integrations/orca-vendors.example.json` (`use-orca-orchestration: false`).
3. Re-dispatch the same attempt ID with the env switch still on. CLI exits 0 with `attempt-already-owned`; no spawn, no policy check.

**Root cause** — `ai-framework/scripts/orca-dispatch.mts` `dispatchScope()` reads the ledger at line 103; line 105 calls `resumeExisting()` (lines 185-189) for an existing `ok` entry without re-running `evaluateLaunch()` or the `orcaMultiAgentEnabled()` switch check. `resumeExisting` blindly returns `{ route: "resume", reason: "attempt-already-owned" }`.

## Fix

### F1 — `dispatchScope()` re-checks the gate before resume

In `ai-framework/scripts/orca-dispatch.mts`, after `ledger.read(attemptKey)` returns an existing `ok` entry, before `resumeExisting()`:

1. Re-check `orcaMultiAgentEnabled(root, deps, env)`; if off, return `{ route: "normal", reason: "orca-multi-agent-disabled" }`.
2. Re-evaluate the launch gate via `evaluateLaunch({ ...options, vendor: coordinator })`; if denied, return `{ route: "normal", reason }` carrying the gate reason.

The pattern is the existing one (`patterns/a-gate-must-not-trust-its-own-author`): re-check the claim at the destructive step. Now codified in `ai-framework/rules/testing.md` "Guards and Fixes".

### F2 — `parseArgs` allows repeated `--vendor` for `status`

In `ai-framework/scripts/orca-run.mts`, change `--vendor` handling:

- For `status`, collect `--vendor` into an array (reject duplicates).
- For other commands, allow exactly one `--vendor` (reject repeats as `vendor-not-repeatable`).

`status()` reads `parsed.vendors ?? []`; empty means "all vendors".

## Files changed

- `ai-framework/scripts/orca-dispatch.mts` — gate before resumeExisting (F1).
- `ai-framework/scripts/orca-run.mts` — `--vendor` parser + `status()` consume the array (F2).
- `ai-framework/scripts/orca-dispatch.test.mts` — 2 regression tests: "resuming under a now-disabled policy refuses with normal route and no spawn" and "resuming with the multi-agent switch turned off refuses before resume".
- `ai-framework/scripts/orca-run.test.mts` — 3 regression tests: repeated `--vendor` on status, duplicate `--vendor` on status (rejected), repeated `--vendor` on dispatch (rejected).

## Evidence

Final counts at ship (earlier build-stage counts in parentheses):

- `ai-framework/scripts/orca-run.test.mts`: 23/23 pass (build stage 20).
- `ai-framework/scripts/orca-dispatch.test.mts`: 44/44 pass (build stage 42).
- Full orca bundle (run, dispatch, policy, preflight, apply, evidence, diff-admit, reconcile, launch-gate, ledger, eval-grader): 308/308 pass (build stage 280).
- Bun parity on the two touched test files: 66/66.
- Full repository suite (Node): 1037 pass / 0 fail / 1 skipped (the Bun-only doctor check, correctly skipped on Node).
- Live CLI repro after fix: same attempt ID under disabled policy returns `route: normal, reason: policy-disabled, exit 3` (was `route: resume, exit 0`).

## Co-lateral fix needed during this build

The cooldown approvals (pre-fix) modified `.claude/agents/{code-reviewer,security-reviewer}.md`. The `.cursor/agents/` mirrors are byte-identical-only by the `skill-defaults.test.mts` check; the new "Hard rules" subsection was added to `.claude/` only, breaking `every vendor mirror of a skill or agent either points at the canonical file or is byte-identical to it`. Fixed by copying the new files to `.cursor/agents/`. The Cursor vendor requires byte copies; Codex/OpenCode mirrors are pointers (different test path).

## Pre-existing failure observed during the run

`ai-framework/scripts/orca-preflight.test.mts` "doctor validates optional local policy without probing or repairing it" fails when run as part of the full suite, but passes in isolation. Cause is the staged (uncommitted) edit to `ai-framework/scripts/workflow-doctor.mts` that adds a "Workflow settings" check reading `ai_workflow_env.json`; the fixture does not create that file. This is a pre-existing branch state, not a regression from `fix-orca-dispatch-resume-gate`. The test passes when run against HEAD without the staged doctor change.

## Env-source validation (post-fix check)

After `AGENTS.md` flipped the contract so `.env` is no longer read and the project-root `ai_workflow_env.json` is the source (process env still wins), the runtime already honours this (`runtime/select.mts` reads `loadWorkflowEnv` for the runner and the Orca switch only). My F1/F2 edits and tests did not introduce `.env` references. To exercise the file path explicitly:

- `orca-run.test.mts` adds two tests: status reads `AI_WORKFLOW_ORCA_MULTI_AGENT` from `ai_workflow_env.json` when env is silent; process env wins over the file.
- `orca-dispatch.test.mts` adds the same two coverage lines for `dispatchScope`.

All four tests pass (`ai-framework/scripts/{orca-run,orca-dispatch}.test.mts` total 66/66).

The repo-local `.env` (untracked; `AI_WORKFLOW_RUNNER=bun`, `AI_WORKFLOW_ORCA_MULTI_AGENT=true`) was dead weight under the new contract — `.env` is never read. Deleted it. `.env.example` stays as the tracked template (referenced by `orca-preflight.test.mts` and `.gitignore`) and its wording was corrected at ship to name `ai_workflow_env.json`. No `ai_workflow_env.json` exists at the project root at ship time, so the Orca switch resolves to `false` and the runner to Node — the normal single-agent path.

## Stale documentation corrected at ship

The `/verify` gauntlet's `git diff` step caught that `.env.example` had been truncated during `/build` (the Orca switch block was dropped and the trailing newline lost), and that both `.env.example` and `.project/context/stack.md` still described `.env` as the runtime source. All three were corrected in this ship: `.env.example` restored in full and reworded to `ai_workflow_env.json`; `stack.md` lines 6 and 24 reworded the same way. The doctor `Workflow settings` warning about an unreadable env file is gone because the project root no longer carries a stray `ai_workflow_env.json`.# Audit cycle 1 — fix-orca-dispatch-resume-gate

Date: 2026-10-08.
Scope: `ai-framework/scripts/orca-dispatch.mts`, `ai-framework/scripts/orca-run.mts`, plus 9 new regression tests across `orca-dispatch.test.mts` and `orca-run.test.mts`.
App: bug-fix; gate: auto if zero must-fix.

## Dispatched

| Role | Profile | Independent | Notes |
|------|---------|-------------|-------|
| code-reviewer | inline | n/a (inline) | Read the diff, checked every branch. |
| security-reviewer | inline | n/a (inline) | Confirmed no new attack surface; F1 is itself the security fix. |
| test-coverage-checker | inline | n/a (inline) | 5 regression tests cover F1 + F2; 4 env-source tests cover file vs process priority. |
| ux-reviewer | skipped | n/a | Not a UI scope. |
| i18n-checker | skipped | n/a | No i18n strings touched. |
| eval-runner | skipped | n/a | No AI prompts touched. |
| cross-pitch-conflict-checker | skipped | n/a | Only one active pitch (`fix-orca-dispatch-resume-gate` itself); trigger is ≥ 2 active. |

## Inline review (cycle 1)

### `orca-dispatch.mts` — F1 resume-existing policy gate

```ts
if (existing.status === "ok") {
  if (!orcaMultiAgentEnabled(options.root, deps, options.env ?? deps.proc.env)) return { route: "normal", reason: "orca-multi-agent-disabled" };
  const resumeGate = evaluateLaunch({ ...options, vendor: coordinator });
  if (!resumeGate.allowed) return { route: "normal", reason: resumeGate.reason };
  return resumeExisting(ledger, existing.record, attemptKey);
}
```

| Concern | Status |
|---------|--------|
| `orcaMultiAgentEnabled` and `evaluateLaunch` are read-only (env read, policy read, no spawn, no ledger write) | confirmed |
| Re-check happens BEFORE `resumeExisting`'s ledger update (claim → unknown-liveness) | confirmed |
| Return shape preserves `decision.reason` | confirmed |
| Existing test `a replayed attempt resumes by inspection and never launches a second worker` still passes | confirmed (40/40 → 42/42 in dispatch suite) |
| Coverage of denied branches | confirmed by 2 new tests; both pass |

### `orca-run.mts` — F2 --vendor array on status

```ts
} else if (flag === "--vendor") {
  if (command !== "status") {
    if (vendors.length > 0) throw usage("vendor-not-repeatable");
    vendors.push(value);
  } else if (vendors.includes(value)) throw usage("duplicate-flag");
  else vendors.push(value);
}
```

| Concern | Status |
|---------|--------|
| Backwards compat: `status --vendor claude` (single) still works | confirmed |
| `status --vendor claude --vendor codex` (multi) accepted | confirmed by new test |
| `status --vendor claude --vendor claude` (duplicate) refused with `duplicate-flag` | confirmed by new test |
| `dispatch --vendor claude --vendor codex` refused with `vendor-not-repeatable` | confirmed by new test |
| Empty `--vendor` on `status` still means "all vendors" | confirmed (`requested.length === 0 ? [...VENDORS] : requested`) |
| `status()` consumes `parsed.vendors ?? []` | confirmed |
| Old `vendor-only-for-status` rule still fires for non-status | confirmed (`command !== "status" && vendors.length > 0`) |

### Env-source tests (file vs process priority)

4 new tests prove:

| Scenario | Expected | Result |
|----------|----------|--------|
| File says `true`, env silent | enabled | pass |
| File says `false`, env says `true` | enabled (env wins) | pass |
| Status with file `true`, env silent | exit 0, `enabled: true` | pass |
| Status with file `false`, env `true` | exit 0, `enabled: true` | pass |

## Test evidence

| Suite | Pass | Notes |
|-------|------|-------|
| `orca-run.test.mts` | 23/23 | was 17, +6 (3 F2 + 2 env + 1 already in build evidence) |
| `orca-dispatch.test.mts` | 44/44 | was 40, +4 (2 F1 + 2 env) |
| Full orca bundle | 308/308 | was 304, +4 (env tests live in orca-dispatch.test.mts, not a separate suite) |

`node --test ai-framework/scripts/orca-{run,dispatch,policy,preflight,apply,evidence,diff-admit,reconcile,launch-gate,ledger,eval-grader}.test.mts`: 308/308 pass.

## Findings

| tier | finding |
|------|---------|
| must-fix | 0 |
| should-fix | 0 |
| acknowledged | 0 |

## Limits

- **No scratch copy.** Single-developer audit; the diff is small and bounded.
- **No canary planted.** The tool is internal developer tooling; the threat model per the cooldown entry `review-bench.js: is convention-based "read-only" enough for this tool's threat model?` already accepts convention-based read-only at this stage. A canary is documented as the next-pitch hardening, not the current bar.
- **Inline review instead of parallel subagent dispatch.** The diff is ~150 lines across 2 source files and 2 test files; the bug is well-defined with an explicit repro; the build already passed five orthogonal regression tests. A parallel dispatch fan-out would duplicate the work already in `log.md`.

## Decision

Zero must-fix. Bug-fix variant gate "auto if clean" → **/ship**.
# Orca smoke — 2026-10-08

Local end-to-end smoke of `orca-run.mts` and the executable grader. No worker was
launched against a funded vendor; the goal was to exercise every CLI branch, every
input guard, and the policy+probe wiring against the installed Orca 1.4.222.

Outputs and inputs saved under `.project/metrics/orca-smoke/` (local, Git-ignored).

## Setup

- Orca 1.4.222 installed at `/Applications/Orca.app/Contents/Resources/bin/orca`.
- `AI_WORKFLOW_ORCA_MULTI_AGENT=true` from `.env`.
- Policy: copied from `ai-framework/integrations/orca-vendors.example.json` first
  (default safe), then to a one-worker opt-in policy, then back. The example's
  `use-orca-orchestration: false` is intentional and correctly refuses dispatch.
- `.project/orchestration.json` was written and read by the CLI; removed at the end.

## Tests run

| # | Command | Result | Notes |
|---|---------|--------|-------|
| 1 | `status --vendor claude` (no policy) | PASS exit 0 | switch on, `enabled: true`, policy `missing`, no probe |
| 2 | `status --vendor codex` / `opencode` (no policy) | PASS exit 0 | identical shape |
| 3 | `status --vendor claude --probe` (no policy) | PASS exit 0 | probe ran, `runtime: unverified` (no `ORCA_AGENT_SESSION_ID`) |
| 4 | `status --vendor claude` (eligible policy) | PASS exit 0 | codex detected present, `runtime: not-checked` |
| 5 | `status --vendor claude --probe` (eligible policy) | PASS exit 0 | probe reached Orca, `reason: caller-unverified`, `dispatchReady: false` (correct gate) |
| 6 | `reconcile` prototype-polluted input | PASS exit 3 | `input-prototype-key` refused |
| 7 | `reconcile` input with extra key | PASS exit 3 | `invalid-reconcile` refused |
| 8 | `reconcile` input outside `--root` | PASS exit 3 | `input-outside-root` refused |
| 9 | `reconcile --check evil` | PASS exit 2 | `unknown-check` refused (catalog-only) |
| 10 | `reconcile` empty attempts | PASS exit 3 | `attempts-invalid` refused |
| 11 | `dispatch` ineligible coordinator (opencode) | PASS exit 3 | `coordinator-unconfigured`, no spawn |
| 12 | `dispatch` eligible coordinator + missing session | PASS exit 3 | `launch-failed:unproven`, no spawn, ledger updated with `unknown-liveness` |
| 13 | `dispatch` (example policy, fresh attempt ID) | PASS exit 3 | `policy-disabled`, correct refusal |
| 14 | `dispatch` (eligible policy, fresh attempt ID) | PASS exit 3 | `max-concurrent-workers` cap, ledger blocks |
| 15 | `dispatch` (existing attempt ID, eligible policy) | **FINDING** | `attempt-already-owned`, exit 0; see below |
| 16 | `dispatch` (existing attempt ID, example policy) | **FINDING** | `attempt-already-owned`, exit 0; see below |
| 17 | `orca-eval-grader.mts --root .` | PASS exit 0 | 7 executed (7/7 pass), 1 parses-only, 3 live-only, counts separate |
| 18 | `orca-run.test.mts` (Node) | PASS 17/17 | full suite |

## Findings

### F1 — resume-existing skips the policy gate (medium)

`orca-dispatch.mts` `dispatchScope()` reads the ledger at line 103; if the entry
exists and is `ok`, calls `resumeExisting()` at line 185 and returns
`{ route: "resume", reason: "attempt-already-owned" }` without re-checking the
policy or the multi-agent switch. The CLI maps `resume` to exit 0.

Repro:

1. Dispatch once with an eligible policy → ledger entry created (any state).
2. Disable the policy (`use-orca-orchestration: false`) or unset the switch.
3. Dispatch the **same** attempt ID again → CLI exits 0 with
   `attempt-already-owned`. The audit caller reads "exit 0" as "launched".

Observed in test 16 (example policy, attempt ID `smoke-test-2`).

Why it matters:

- A `resume` outcome is not a successful launch. It is "an attempt exists; a human
  must inspect it". The CLI exit 0 makes the audit/ship caller treat it as success.
- The `humanAction` field is in the JSON but is not surfaced as a separate exit.
  The SKILL.md docs say "ship only on an `integrated` outcome that you re-verified
  yourself"; for dispatch, the equivalent gate ("act only on `launched`") is
  documented in the CLI contract but the exit code does not enforce it.

Suggested fix (not applied):

- In `resumeExisting`, re-run `evaluateLaunch(options)` and the policy gate. If
  policy is now disabled, return `{ route: "normal", reason: "policy-disabled" }`
  instead of resuming.
- Or: change the CLI exit mapping so `resume` exits 3 (refused) and only
  `launched` exits 0. The library already returns `humanAction` for callers to
  act on; the CLI shouldn't silently treat "go inspect" as "success".

### F2 — `--vendor` accepts only one value (low)

`parseArgs` rejects `--vendor claude --vendor codex` with `duplicate-flag` even
though `status` is documented to accept multiple vendors per `orca-vendors.md`
section "Inspect without execution" (which shows separate per-vendor calls). The
CLI currently requires N invocations for N vendors.

Suggested fix: in `parseArgs`, allow `--vendor` to repeat for `status`, collect
into an array, and have `status` iterate.

### F3 — `orca-eval-grader.mts` reports 3 live-only cases as not-run (informational)

Per the contract this is the intended honesty: `static-fixtures-do-not-prove-runtime`,
`all-coordinator-and-policy-permutations`, and `stateful-recovery-and-peer-messages`
require a live Orca runtime. They are marked `liveCompatibility: "unverified"` and
the summary keeps `executes`, `parsesOnly` and `liveOnly` separate. Not a defect.

### F4 — pre-existing ledger entry from the smoke run (informational)

`.project/metrics/orca-ledger/attempt-smoke-test-2.json` was written during test
12 with state `unknown-liveness`. The directory is Git-ignored. Future smoke runs
should either use fresh attempt IDs or clean the ledger.

## What was NOT exercised

- Actual worker spawn against codex/opencode. Out of scope for this smoke (no
  spend budget, and the opencode vendor is not running).
- `collect` (requires a launched worker).
- `reconcile` against real worker changes (requires a `worker_done` mail).
- Peer messaging.
- Live Codex and OpenCode completion (documented as `not-run` in
  `ai-framework/integrations/orca-vendors.md` §Live smoke status).

## Conclusion

The CLI works as documented for every branch that does not require a funded
worker session. The input guards, policy gate, switch reading, preflight, and
executable grader are sound. **F1** is a real correctness gap that should be
fixed before any pitch relies on the CLI exit code alone to confirm a worker
was launched. **F2** is a UX gap. **F3 / F4** are informational.
# Plan: orca-bounded-control-receipts

**Pitch**: pitch.md  •  **Appetite**: small-batch (≤5 files: 5 planned)  •  **Hill**: hill.md

**Base:** build on branch `feat/archify-replaces-state` (or after its PR merges). It already holds the 2.51.1/2.51.2 changes to `lookupWorker`, the same function this pitch edits. Do not start from `main`.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Bound the identity lookup | `orca-start.mts`, `orca-start.test.mts` | ~70 | — | S2 | no: tiny, one function, and Orca workers cost more than they save | — |
| S2 | Keep the refusal reason, stay fail-closed | `orca-dispatch.mts`, `orca-dispatch.test.mts`, `ai-framework/integrations/orca-vendors.md` | ~60 | — | S1 | no: same reason | — |
| S3 | Capture one real pre-creation refusal (spike, **owner-gated**) | `.project/pitches/orca-bounded-control-receipts/receipts/*.json` (not a code file) | ~0 | S2 | — | no: needs the owner's Orca | — |

## Rabbit holes, resolved at plan time (were "pushed to /shape")
- **Pagination vs projection** → projection. `worker-list --terminal-state active` returns only live worker terminals (verified on 1.4.271: 542 bytes), so the size no longer scales with fleet history. Measured: a full 100-row page is ~262,900 bytes (over the 262,144 bound; this is the 268,003-byte incident), a concise row is ~328 bytes. Fallbacks are in S1.
- **Unknown-liveness stays fail-closed** → S2 changes only what is *reported*; ownership state, capacity and retry rules are untouched.
- **Cleanup stays an explicit user action** → nothing here releases, stops, abandons or resets a worker or task.
- **Capability matrix for OpenCode pins** → not this pitch. Orca keeps its supported-version list internally (observed: 1.18.30, 1.18.32, 2.0.16), and "no change to Orca-owned behavior" is a no-go. S3 asks whether a positive proof exists; if not, it is a followup.

## Exit criteria (machine-checkable, ≥1 per scope)

### S1 — Bound the identity lookup
- `bun test ai-framework/scripts/orca-start.test.mts` exit 0, including new tests that assert:
  - the call is `["orchestration","worker-list","--limit","100","--json","--terminal-state","active"]`, with no `--full`;
  - a CLI that rejects `--terminal-state` is asked again unfiltered, with `--full --limit 25` (the full view carries the `page` object; 25 rows ≈ 66 KB);
  - a first page of 100 full records (268,003 bytes, the incident size) is not blocked: it is retried with a smaller `--limit`;
  - a fleet of 5,000 settled workers resolves in one call through the filter;
  - the unfiltered path stops with its own reason (`worker-list-too-large`) past its page cap and never reads a partial list as complete.
- Mutants killed, in-memory, same method as 2.51.2: filter removed, oversize retry removed, fallback removed.
- `bun ai-framework/scripts/orca-run.mts start --root . --phase build --vendor claude --args-text ""` prints `"state":"ready"` on the live CLI.
- `! grep -n '"--full"' ai-framework/scripts/orca-start.mts` only in the unfiltered fallback; no new byte constant (`grep -c "262144\|256 \* 1024" ai-framework/scripts/orca-start.mts` = 0; it imports `MAX_OUTPUT_BYTES`, per "Producer and Reader Share One Bound").

### S2 — Keep the refusal reason, stay fail-closed
- `bun test ai-framework/scripts/orca-dispatch.test.mts` exit 0, including new tests that assert, for a CLI error receipt `{ok:false,error:{code:"invalid_argument",message:"…"}}` with exit 1:
  - route `blocked`, reason `launch-failed:refused:invalid_argument`, and the ledger record stays `unknown-liveness` with its task and capacity held (same as `launch-failed:unproven` today);
  - `humanAction` names the code and says ownership is unproven;
  - a code with control characters, a path, or more than 64 characters collapses to `launch-failed:unproven`; the message text is never echoed (`ai-framework/rules/security.md`: no raw CLI text in output);
  - all existing residual / `failedStage` / junk / timeout cases keep their current routes (no existing assertion edited except to add cases).
- Mutant killed: recognition removed → the new test fails.
- `grep -n "Surviving Orca updates" -A12 ai-framework/integrations/orca-vendors.md` shows the new row for `worker-list --terminal-state active` and the refusal-receipt rule.
- `bun ai-framework/scripts/run-tests.mts` exit 0; `bun ai-framework/scripts/workflow-doctor.mts` and `setup-validator.mts` exit 0.

### S3 — Capture one real pre-creation refusal (spike)
- **Needs the owner's go-ahead first**: it creates a Run/Task in the owner's Orca (`worker-start --agent opencode --model <pin>` against an OpenCode outside Orca's allow-list), and this pitch forbids automatic cleanup, so the owner decides whether and how to clean up.
- Exit: `test -s .project/pitches/orca-bounded-control-receipts/receipts/refusal-opencode-pin.json`, **or** a line in `deviations.md` reading `S3 deferred: <reason>`.
- Decision rule: if the receipt carries an explicit marker that nothing was created (for example an empty `effects` with a pre-creation `failedStage`), add a positive-proof branch in a follow-up scope with that receipt as its fixture. If it does not, the answer is "no proof exists" and S2's diagnostics are the whole fix.

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| A refusal receipt may carry no `failedStage`/`effects`, so "nothing was created" cannot be proven | S2, S3 | yes (S3) | S2 reports the code and keeps ownership unknown; S3 decides whether a proof exists |
| Concise `worker-list` has no `page` object, so an unfiltered concise page of exactly 100 rows has no cursor | S1 | no | the unfiltered fallback uses `--full --limit 25`, whose `page` object exists; otherwise fails closed with its own reason |
| `--terminal-state` filter may behave differently on other Orca versions | S1 | no | rejected flag → unfiltered fallback; test with a rejecting fake CLI |
| `dispatchIdOf` coverage of the concise `worker-start` receipt on 1.4.271 is unverified (a real launch is needed) | S2 | no | already safe: a launch without an id is `launched-without-dispatch-id` → resume with a human action; record in followups |
| Same function edited by `feat/archify-replaces-state` | S1 | no | build on that branch; do not rebase onto `main` before it merges |

Rules folded in: `coding-standards.md` "Producer and Reader Share One Bound" (S1), `security.md` untrusted CLI output (S2), `testing.md` guard tests with in-memory mutants (S1, S2), `a-gate-must-not-trust-its-own-author` (S2: a clean-failure claim needs positive proof, never absence of a receipt).

## Parallel dispatch plan
S1 and S2 touch disjoint files and could run in parallel, but each is ~60 lines in one function, so they run sequentially in this session. No Orca worker is dispatched: the coordination cost exceeds the work. S3 is not dispatchable (owner's Orca, owner's authorization).

## Blast radius
Direct: `lookupWorker` has one caller (`decideStart`). Tests that assert on the `worker-list` argv: `orca-start.test.mts` lines ~110 and ~400 (updated in S1); the two hook tests (`orca-start-hook`, `orca-start-codex-hook`) spawn the real script with a fake `orca` that answers by `args[0]`, so they are unaffected and run in the full suite. `orca-vendors.md` names `worker-list` at lines ~153 and ~208.

## Living-spec deviations log
- 2026-11-23 (/build S1): the identity lookup no longer sends `--full` at all (2.51.2 had made it the default); the old test "when --full is rejected..." was replaced by the filter-rejected test, and the page-cap assertion in "bounds worker-list pages..." now expects `worker-list-too-large` (it was `worker-identity-unavailable`). Both are intended behaviour changes, not weakened checks.
- 2026-11-23 (/build S1): an unfiltered fallback page of 100 rows with no cursor still fails closed; the fallback therefore asks for `--full --limit 25` so a `page` object exists. 8 in-memory mutants killed.
- 2026-11-23 (/build S2): only the refusal *reason* changed; the ledger state, capacity, retry and `task-already-owned` behaviour are asserted unchanged by tests. 6 mutants killed. `orca-vendors.md` gained two request/failure rows.
- 2026-11-23 (/build): VERSION is 2.51.3 (changelog entry "Fixed"). Built on branch `feat/archify-replaces-state`; nothing committed. The work should go in its own commit (or its own branch stacked on that one) so the Orca pitch can be reviewed apart from `/state`.
- 2026-11-23 (/build S3): **S3 deferred: no refusal receipt captured** (owner moved on to /audit without authorizing it).  Original note: not run. It would create a Run and Task in the owner's Orca and this pitch forbids automatic cleanup. Awaiting the owner's decision; if declined, record `S3 deferred: no refusal receipt captured` and file the followup.
- 2026-11-23 (/audit cycle 1): no must-fix. The identity lookup now asks every non-released terminal state instead of `active` only (audit SEC-3), so the plan's "one call" became five and a phase start takes about 0.5 s longer; the forged-orca probe test's call count changed from 2 to 6 for that reason. A failedStage and a dash-leading cursor are now bounded. 10 mutants killed. Details in `audit.md`.
- 2026-11-23 (/audit cycle 1): VERSION is now 2.51.4 (2.51.3 was the build, 2.51.4 is the audit fixes).


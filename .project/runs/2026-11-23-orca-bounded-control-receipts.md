# Run: orca-bounded-control-receipts (2026-11-23)

Shipped 2026-11-23, 2.51.3 and 2.51.4. Pitch folder: `.project/pitches/orca-bounded-control-receipts/` (pitch, plan, audit and per-reviewer records, SHIPPED). Hill chart: `runs/2026-11-23-orca-bounded-control-receipts-hill.md`.

## Timeline
1. `/plan` on a draft pitch (the owner's explicit `/plan` stood in for the bet); the pitch's rabbit holes were resolved with facts from the live Orca CLI (full 100-row page is about 262,900 bytes, concise about 33 KB, `--terminal-state` filters server-side).
2. `/build` S1 and S2 (54 and 89 tests, 8 and 6 mutants), docs, 2.51.3. S3 deferred: it creates Orca state.
3. `/audit` cycle 1: 4 reviewers (3 with canaries, all caught), 0 must-fix, 5 should-fix fixed, 1 open for ship; 2.51.4.
4. `/ship`: verified with the stack's real commands, knowledge extracted, followups filed.

## Owner decisions
Treat `/plan` on a draft as the bet; defer S3 (no Orca state created); move on to `/audit` and `/ship` without a second cycle.

## Evidence
Full suite 2104 tests, 2101 pass, 0 fail, 3 skipped; `setup-validator`, `workflow-doctor`, graph, relations and changelog checks pass; 10 mutants killed; live Orca 1.4.271 ready.

## Deviations (copied from plan.md)
## Living-spec deviations log
- 2026-11-23 (/build S1): the identity lookup no longer sends `--full` at all (2.51.2 had made it the default); the old test "when --full is rejected..." was replaced by the filter-rejected test, and the page-cap assertion in "bounds worker-list pages..." now expects `worker-list-too-large` (it was `worker-identity-unavailable`). Both are intended behaviour changes, not weakened checks.
- 2026-11-23 (/build S1): an unfiltered fallback page of 100 rows with no cursor still fails closed; the fallback therefore asks for `--full --limit 25` so a `page` object exists. 8 in-memory mutants killed.
- 2026-11-23 (/build S2): only the refusal *reason* changed; the ledger state, capacity, retry and `task-already-owned` behaviour are asserted unchanged by tests. 6 mutants killed. `orca-vendors.md` gained two request/failure rows.
- 2026-11-23 (/build): VERSION is 2.51.3 (changelog entry "Fixed"). Built on branch `feat/archify-replaces-state`; nothing committed. The work should go in its own commit (or its own branch stacked on that one) so the Orca pitch can be reviewed apart from `/state`.
- 2026-11-23 (/build S3): **S3 deferred: no refusal receipt captured** (owner moved on to /audit without authorizing it).  Original note: not run. It would create a Run and Task in the owner's Orca and this pitch forbids automatic cleanup. Awaiting the owner's decision; if declined, record `S3 deferred: no refusal receipt captured` and file the followup.
- 2026-11-23 (/audit cycle 1): no must-fix. The identity lookup now asks every non-released terminal state instead of `active` only (audit SEC-3), so the plan's "one call" became five and a phase start takes about 0.5 s longer; the forged-orca probe test's call count changed from 2 to 6 for that reason. A failedStage and a dash-leading cursor are now bounded. 10 mutants killed. Details in `audit.md`.
- 2026-11-23 (/audit cycle 1): VERSION is now 2.51.4 (2.51.3 was the build, 2.51.4 is the audit fixes).



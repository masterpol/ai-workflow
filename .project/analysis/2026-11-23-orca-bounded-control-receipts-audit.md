# Audit cycle 1 — orca-bounded-control-receipts

Dispatched: code (4, independent: yes) | security (5, independent: yes) | test (4, independent: yes) | ux (n/a, no UI scope) | eval (n/a, no AI-prompt scope) | i18n (n/a) | cross-pitch (3, independent: no)
Independence: three reviewers worked on scratch copies each holding a different planted canary; all three were caught (`review-bench canary-check`), and `review-bench guard check` found the repo unchanged after dispatch. The cross-pitch checker reads the live repo, so no canary was possible (`independent: no`). Models: security and code sonnet, test and cross-pitch haiku. Orca: ready; no alternate-vendor scopes were planned, so no workers were dispatched.

## Must-fix (blocks /ship)
None. Four reviewer-reported must-fix items were checked against the real repo and refuted: SEC-1, COD-1 and TST-1 are the planted canaries (their real counterparts are correct and the real suites passed), and X-1 was re-tiered (below).

## Should-fix
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| SEC-3 | security | orca-start.mts lookup | fail-open: an active-only query can miss a worker whose terminal is kept open or being released while its dispatch is open | fixed by design: every non-released state is queried (5 calls, about +0.5 s per phase start); tests + 3 mutants |
| SEC-2 | security, code | orca-dispatch.mts | a failedStage went unbounded into a reason (existing code) | fixed: plain token only; test + 2 mutants |
| COD-2 | code | orca-vendors.md | stale `--full` claim | fixed |
| TST-2 | test | orca-start.mts | oversize stderr untested | fixed; mutant killed |
| TST-3 | test | orca-start.mts | settled-by-state untested | fixed; mutant killed |
| X-1 | cross-pitch | the Orca files, CHANGELOG, VERSION | same lines as archify-replaces-state's committed Orca changes | **open, for /ship**: this work is a stacked follow-on; it must ship as its own commit (or a branch stacked on `feat/archify-replaces-state`), merged after it |

## Acknowledged
A dash-leading cursor (fixed anyway, cheap); resource bounds all hold; the humanAction wording is pinned as copy text; a cursor reused after the limit changes mid-walk is unconfirmed on Orca (followup; walks are now one short state at a time).

## Evidence
- Full suite after fixes: 2104 tests, 2101 pass, 0 fail, 3 skipped. `setup-validator` and `workflow-doctor` pass; graph, relations and changelog checks exit 0.
- Mutation check (author-run): 10 mutants killed, including both survivors the test reviewer found; files hash-restored.
- Live Orca 1.4.271: shape, build, audit and ship return `ready` (about 1.2 s each); a released worker terminal handle stays coordinator-ready.
- The forged-`orca` probe test now expects 1 status and 5 worker-list calls and keeps every executable and environment assertion.

## Not reviewed / unverified
Whether Orca 1.4.271's `--terminal-state` filter lists a worker's terminal in every state an open dispatch can have (inferred from the six documented states; S3 and a real worker would settle it); the concise `worker-start` receipt shape (needs a real launch); no second review cycle ran, so the SEC-3/SEC-2 fixes are author-verified, not independently re-reviewed.

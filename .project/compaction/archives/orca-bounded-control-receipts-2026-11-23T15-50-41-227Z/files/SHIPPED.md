# Shipped: orca-bounded-control-receipts
Bet: 2026-11-23 (implied by the owner's explicit `/plan`)  •  Shipped: 2026-11-23  •  Appetite: small-batch (5 files, within budget; one session)

Release: 2.51.3 (the build) and 2.51.4 (the audit fixes). Built and audited on top of the committed 2.51.0 to 2.51.2 changes on branch `feat/archify-replaces-state`.

## Scopes
| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-11-23 | Bounded identity lookup: concise view, per-terminal-state queries, halve `--limit` on an oversize page, full-record fallback in small pages, `worker-list-too-large` reason. Deviation: the audit widened the single `active` query to every non-released state |
| S2 | shipped | 2026-11-23 | `launch-failed:refused:<code>` for a structured CLI refusal; ownership unchanged and asserted by tests. Deviation: the audit also bounded `failedStage` (existing code) |
| S3 | deferred | — | Capturing one real pre-creation refusal receipt needs the owner's authorization (creates Orca state). Followup filed |

## No-gos honored
- ✅ no automatic cleanup or reset of workers or tasks (nothing in the change releases, stops, abandons or resets anything)
- ✅ no weakening of fail-closed ownership: a refusal keeps `unknown-liveness`, the task and its capacity; tests assert the ledger state, the second attempt's `task-already-owned` and the absence of a retry. The identity lookup became stricter, not looser
- ✅ no change to Orca-owned behaviour: only this repo's adapter code and docs changed

## Rabbit holes
- ✅ resolved at plan time: pagination vs projection (projection, per terminal state), unknown-liveness stays fail-closed, cleanup stays explicit, the OpenCode pin capability matrix is Orca's and out of scope
- ⚠️ surfaced new and resolved in the audit: an `active`-only filter is fail-open for a worker whose terminal is kept open or being released; an existing unbounded `failedStage` echo; a dash-leading cursor
- ⚠️ surfaced new, open: whether Orca accepts a cursor reused after the page size changes; whether `--terminal-state` lists a worker in every state its dispatch can have; phase start is about 0.5 s slower

## Verification
`pre-ship-verify.mts` cannot run in this package-less bundle (known issue, owned by `package-less-ship-verification`), so the stack's commands ran directly: full suite 2104 tests, 2101 pass, 0 fail, 3 skipped; `setup-validator` and `workflow-doctor` pass; `graphify --check`, `graphify-relations --check` and `changelog --check` exit 0; 10 in-memory mutants killed (including both survivors the audit found); live Orca 1.4.271 returns `ready` for the phases tried and for a released worker terminal. No secret-bearing files, credential shapes or debug leftovers in the diff. No build, typecheck, lint or i18n command exists here.

## Audit
Cycle 1: 0 must-fix (three reported must-fix items were the planted canaries, one cross-pitch item was a stacked follow-on), 5 should-fix fixed, 1 open (ship as its own commit). The fixes are author-verified, not independently re-reviewed. See `audit.md` and the four `audit-*.md` records.

## Followups generated
8 items in `_followups.md` under "From orca-bounded-control-receipts (2026-11-23)" and the updated "Commit the Orca runner fixes separately" item.

## Knowledge
2 new patterns (`a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller`, `a-receipt-field-reaches-a-reason-only-as-a-bounded-token`), 2 issues and 1 pattern updated; graph 133 entries, clean.

## Doc updates
`ai-framework/integrations/orca-vendors.md` ("Surviving Orca updates": request and failure rows, the `worker-list-too-large` reason). No architecture change and no ADR needed beyond the pattern entries above.

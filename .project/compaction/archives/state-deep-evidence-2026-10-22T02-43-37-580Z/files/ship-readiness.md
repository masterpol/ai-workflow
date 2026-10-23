# Ship readiness: state-deep-evidence

2026-10-21. **Pending decision; not shipped.** The owner approved the audit's named exceptions. A separate required verifier-route failure was discovered afterward. No release bump, SHIPPED record, archive, commit, push, or publication has occurred.

## Accepted audit exceptions

The owner's “Approve” followed a summary requiring explicit written acceptance. `audit.md` records the appetite amendment to 1667 added lines and the accepted live-quality exceptions. `live-runs.md` preserves the failed and not-run rows and records that acceptance. Accepted risk is not a passing AI-quality claim.

## Required verifier failure

`node ai-framework/hooks/scripts/pre-ship-verify.mts` exited 1 before running checks:

> No package.json or Muro document verifier found. Define project checks before shipping.

This bundle intentionally has neither root package.json nor a Muro verifier. The existing knowledge card `package-less-bundle-ship-wrapper-cannot-select-checks` and backlog entries already own this issue. The wrapper was not patched and must not be reported as passing. The ship phase returned to audit cycle 3; no fourth audit cycle will be started automatically. Options are an explicit actual-command fallback exception for this pitch or a separately scoped durable route repair.

## Reconciliation prepared for closure

| Scope | Result |
|---|---|
| S1 graph | Implemented: validated bounded graph index, module/import facts and graph-derived risks |
| S2 history | Implemented: bounded history joins, recognized audit/revision formats, dated bullets and followup section counts |
| S3 entrypoints | Implemented: manifest main/bin facts with guarded real-file paths; audit adds scrub equality |
| S4 tokens | Implemented: copied totals, bounded model/flow rows, absent usage distinct from zero |
| S5 assembly | Implemented: shared reads, additive schema 1, source isolation, budgets and compatibility tests |
| S6 package map | Deferred to state-monorepo-packages; packages remains unavailable |
| S7 contract | Documented in state-report.md; source/test LOC exception accepted by owner |
| S8 live matrix | Recorded; owner accepts Claude failures/regressions and unrun OpenCode/Cursor evidence; no claim of a clean cross-vendor result |

Audit fixes: credential-shaped entrypoint paths rejected, schema rejection notes fixed, and deterministic injection specification narrowed to implemented owned sections. All no-go source files remain untouched against d225ce5. Existing structure.tree names remain outside the injection case; the schema is not bumped, pages/skills/hooks are not edited, and package parsing is not invented.

## Knowledge and followups prepared

At closure, link this incident to the existing package-less-verifier knowledge issue rather than create a duplicate. Reuse existing allow-list-at-ingest/render and parse-and-re-emit patterns for the two output fixes. The graph/history parser design and partial-versus-unavailable evidence are already covered by consulted knowledge; record the pitch as another concrete application rather than invent a duplicate rule.

Followups to reconcile with the backlog at closure: state-monorepo-packages; stable machine-readable audit counts; metrics/tokens module extraction; existing structure.tree label hardening; AI fact-path authoring guidance and live Claude reliability; OpenCode evaluation after quota recovery; review-bench-large-snapshot-read-cap. Serialize VERSION/CHANGELOG edits with test-execution-performance at actual ship. The verifier-route issue already has a knowledge card and repeated backlog entries; do not add another duplicate.

## Direct verification

Actual commands come from .project/context/stack.md. No build, typecheck, lint or i18n command exists here; those steps are not applicable and are not claimed as passes. Evidence is stored under .project/metrics/state-deep-audit-20261021/. Final results will be appended after the running full suite finishes.


### Completed actual-command evidence

| Check | Result |
|---|---|
| Full Node suite (73 co-located ai-framework test files, serial) | Exit 0; 2401 tests, 2398 pass, 0 fail, 3 existing skips; ship-node-full.txt |
| Bun graph/history/snapshot suites | Exit 0; 140 pass, 0 fail; ship-bun.txt |
| Setup validator | Exit 0; 23 checks, READY; ship-setup.txt |
| Workflow doctor | Exit 0; 757 checks, one pre-existing direct-Node-import test warning; ship-doctor.txt |
| Knowledge graph | Exit 0; CLEAN, 112 entries, 319 links |
| Scoped Markdown links | Exit 0; eight documents checked, no broken links; ship-docs-links.txt |
| Diff whitespace and source no-gos | Exit 0; audited source no-gos unchanged against d225ce5 |
| Required ship wrapper | **Exit 1; no checks executed. Still failed, not covered by the other passes.** |

The live AI results were not rerun or relabeled. The new verification failure is a known route limitation, distinct from the accepted live-quality risks and LOC amendment. The direct checks are a concrete fallback proposal, not an automatic waiver. An explicit owner decision to use this fallback and close the pitch is still required before release bookkeeping and shipment. The full Node suite completed in approximately 357 seconds without weakening timing assertions.


## Final owner decision — 2026-10-21

The owner answered **“Approve”** to using these direct checks as the fallback and closing the pitch. This explicitly authorizes the verification exception and closure. The earlier pending state above is historical; final reconciliation is in SHIPPED.md. v2.39.0 records the logical feature release; the wrapper remains failed and unresolved as documented.

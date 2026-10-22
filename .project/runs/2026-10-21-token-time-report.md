# Build log: token-time-report

## S1 started — 2026-10-21

Owner approved plan/impact and then separately approved build start. Build Run `run_3de93fe9dd4a`; S1 worker `ctx_74ffcf24e87a`, attempt `attempt:ttr-build-S1-20261021`, vendor Claude, requested model claude-sonnet-5-5. Only four new S1 files authorized; coordinator retains workflow-record ownership.

Baseline: `node ai-framework/scripts/run-tests.mts --runtime node ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics-report.test.mts` exited 0, 78 passed, 0 failed, 0 skipped, duration 8.540 s. Partial selection only.

## S1 preliminary review

Symptom: first source draft copied optional history.phase without credential scrubbing, dropped revisions and did not yet honor every Fact/nested availability state.
Cause: history projection was narrower than the approved output contract; these paths were not yet exercised by tests.
Action: sent exact findings to the owning worker before completion; requested regression cases and explicit unjoinable/excluded metadata. No parent edits to worker-owned files.

## S1 independent review resolved

Confirmed original JSON leaked the synthetic credential and printed unavailable audit counters; revisions were absent. Coordinator masked unavailable fields, scrubbed history labels, retained revisions/stale state, added lifecycle health and join-gap metadata, and added regressions. Node/Bun each pass 26 scoped tests; utility/CLI coverage exceeds targets. S1-evidence.md records commands and independent oracles.

## S2 started — 2026-10-21

Owner approved S1 scope gate (“Approve”). Reused build Run after verifying objective/coordinator. S2 worker owns flow-render.mts and its new tests plus flow-report.mts and its existing tests. S1 source is 869 lines; total remaining allowance is 631, with 96 reserved for S3. No collector/schema/release changes authorized in S2.

S2 launched as `ctx_7a37cbc9cb8a`, attempt `attempt:ttr-build-S2-20261021`, configured Claude Sonnet. Independent publication fixture prepared from the already verified S1 oracle; all three input hashes retained for read-only/source-preservation checks.

## S2 review and verification resolved

Initial staging cleanup could follow a substituted stage symlink after linking; the independent fixture reproduced outside-file deletion. Worker guarded every staging filesystem call, rechecked staged bytes and recorded successful publication before fallible cleanup. The same independent injection now preserves the outside file and reports incomplete publication accurately. Node/Bun 41 scoped tests pass; three report modules have 100% line coverage. Detailed evidence: S2-evidence.md.

## S3 started — 2026-10-21 local date

Owner approved S2 scope gate (“Approve”). Coordinator added the fixed flow-report link through the existing safe helper, extended its existing artifact test for present/missing/symlink targets and no generation/refresh, and documented the report contract. VERSION/CHANGELOG remain reserved for approved ship as planned. Scoped and full verification are pending.

## S3 full-suite attempt 1 — timing-bound failure

Symptom: full Node run failed one unchanged geometry stress test, `[reject-oversize-and-deep] 5 MB path d rejects as geometry when the other caps are raised`, at 1030.85225 ms against a strict 1000 ms bound. Totals: 2472 tests, 2468 passed, 1 failed, 3 skipped; full command exit 1.
Hypothesis: host contention (graph rebuild overlapped this run); correctness assertions passed before the time check. No parser or test-threshold edit is proposed.
Next: run the unchanged file in isolation, then retry the full command after background checks have finished. The full-suite failure counter is 1; scope remains incomplete.

## S3 full-suite failure resolved without code changes

The unchanged geometry test file passed 154/154 in isolation. With graph rebuilding finished, the identical full Node command passed: 2469 pass, 0 fail, 3 existing skips; 90.232 s. Scoped Node 207 and Bun 120 also pass. No threshold or runtime-worker setting changed. Live state rendering wrote only metrics.html and linked the existing joined report without refreshing it. S3-evidence.md carries the exact current-session outputs.

## Audit started — 2026-10-21

Owner approved S3 and build end (“Approve”). Audit cycle 1 covers code, security, test coverage, static report UX and cross-pitch ownership. No AI-prompt scope or configured locale system is touched, so eval-runner and i18n review are not applicable. Reviewers receive separate scratch copies, bounded commands and read-only repository guards; independent status requires a caught scratch canary and completed checklist.

## Audit launch refused — 2026-10-21

Audit Run `run_d637f70c7cec` was created and five separate scratch copies prepared; each baseline passed and its planted defect broke the scratch check. The first code-review launch was rejected before launch with `input-refused (invalid-authorizedPaths)`: the coordinator supplied an empty path list for a read-only reviewer, but Orca requires at least one authorized path. No reviewer launched. The guard snapshot was written, but its checker refused that snapshot as too large; read-only verification is not established and must be repaired before review claims. All five payloads now name a role-specific local report path and retain scratch-only review constraints; path and brief validators pass. No retry performed. Per the explicit Orca refusal contract, phase stops pending owner choice to fix/retry or invoke `orca=normal`.

## Orca recovery authorized — 2026-10-21

Owner requested “Fix orca”. Corrected nonempty reviewer authorizedPaths without granting implementation ownership. Repaired review-bench guard: its own generated snapshot exceeded the generic 256KiB report limit; snapshots now use a separate 16MiB read/write bound. Added round-trip/edit-detection and oversized-writer regressions, preserving the smaller report/manifest cap. These two files are included in code/security/coverage audit scope.

## Audit cycle 1 synthesis and limited retry

All five first-wave reports arrived through their own worker_done, were collected, independently inspected and released, and their ledger slots settled. The shared repository guard is clean. Planted ownership, keyboard and cross-pitch defects exist only in scratch; live code and pitch artifacts retain their original safeguards and disjoint ownership. Confirmed real should-fix findings are addressed in renderer escaping/provisional copy and specific guard-mutant assertions. Three required role checklists were incomplete, so one fresh narrowed retry per role follows; a focused UX recheck covers the display change. First-pass findings and limits remain preserved.

## Orca repair verified; audit remains open

Nine separate Orca reports arrived through their own worker_done and were accepted. Eight worker resources were released with captured archives. The coverage-retry resource returned retained/user_takeover; it remains human-owned and was not forcibly closed or retried. All nine attempt ledgers are settled and delivery batches acknowledged. Run: run_d637f70c7cec.

Guard snapshots now round-trip above 256KiB up to a bounded 16MiB, refuse oversized output before publication, and skip secret-shaped paths before reading. Node/Bun guard regressions pass 35 each. Full Node passes 2472 with 3 existing skips. Renderer fixes, stricter mutant assertions, and all evidence are preserved in audit.md and the nine audit-review records. Required review evidence remains incomplete after the allowed fresh retries; no ship, version bump or approval claim is made.

## Additional evidence pass explicitly approved — 2026-10-21

Owner replied “Approve” directly to the prepared proposal for one additional evidence-only audit pass beyond the automatic retry limit. Four fresh standard-model reviewers cover only M1–M5; visible-root contract files and concise inline requirements address the earlier context failure. No source changes are authorized. Earlier incomplete review records are preserved, and author verification is not substituted for independent evidence. No additional automatic retries or ship advancement are implied.

## Additional evidence pass completed — 2026-10-21

Four fresh reports completed their bounded checks and caught the scratch defects. Four own completions accepted; four worker resources released; four ledger slots settled; last delivery acknowledged. Original repository guard is clean, and all scratch manifest bytes match except exact canaries. The code review verified the substantive module rationale and identified its missing canonical ownership record; matching addenda now exist in plan.md/deviations.md. No source/test edits. M1–M5 closed; proof limitations and two misnumbered citations are preserved in audit-final-evidence.md and four checked records. Audit-end approval is still required before ship.

## Direct ship gauntlet explicitly approved — 2026-10-21

Owner replied “Approve” directly to the package-less verifier fallback request. The failed wrapper remains recorded; it is not represented as passing. Direct full Node diagnostics pass 2472 with 3 existing skips; scoped Bun passes 257/257; doctor exits 0 with the pre-existing state-graph.test.mts runtime-boundary warning; validator/graph/diff checks pass. No build/typecheck/lint/i18n commands exist in stack.md. No source/test changes require another identical full-suite run.

Prepared knowledge extraction: two new linked issues, one low-confidence pattern, six existing cards updated (two guard issues resolved), and four named followups appended. A generated graph rebuild and final record/release verification follow. Final ship/hold approval remains separate from this explicit verification-route approval.

## Release ready for final gate — 2026-10-21

Changelog script applied v2.41.0 (UTC entry date 2026-10-22); actual release delta is 10 lines, bringing implementation/test/contract/release changes to 1489 lines across 13 files. Direct verification is owner-approved; full Node 2472 pass / 3 existing skips, scoped Bun 257 pass, doctor/validator/graph/diff pass with the one existing doctor warning. Knowledge graph rebuilt to 119 entries / 336 links. Two new issue cards, one pattern, six card updates, four followups. Evidence archive has 218 individually verified entries. SHIPPED.md and concrete post-ship status/record contents are ready; final ship/hold approval remains pending.

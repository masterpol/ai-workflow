# Audit: Native safety feasibility

## Cycle 1 — 2026-09-26

Dispatched: code (gpt-6-sol, independent: yes) | security (gpt-6-sol, independent: yes) | test (gpt-6-luna, independent: yes) | cross-pitch (gpt-6-luna, independent: yes). UI, i18n and AI-prompt roles: not applicable.

All reviewers were fresh agents with constrained scratch copies, bounded commands/tool budgets and caught canaries. The repository guard returned `clean: true`, unchanged head/status and no changed files. Prompt texts, hashes, models, verified findings and cross-file results are in the per-role records; all four passed `record-check` and `canary-check`. Independence describes fresh agents with caught canaries in the same model family, not freedom from shared blind spots.

| ID | Tier | Source / location | Verified scenario | Disposition |
|---|---|---|---|---|
| M1 | must-fix | code / bench.test.js:89 (before fix) | Missing Python resolves unsupported; guard mutants incorrectly demanded rejection. Reproduction: unavailable-PATH focused tests, 1 pass / 1 fail, `Missing expected rejection`. This breaks the plan's unsupported refusal exit contract. | Fixed by validating capability baseline and explicitly skipping capability-dependent mutants. |

The reviewer labeled M1 medium; main-thread triage promoted it because it broke a required exit criterion. Re-ran normal suite: 4 pass / 0 fail. Re-ran full unavailable-PATH suite: 3 pass / 1 explicit skip / 0 fail. No guard mutant survived on the supported host.

Scratch-only canaries, excluded from real triage: false containment evidence (code), missing leaf `O_NOFOLLOW` (security), false immediate parent-death release (test), and an invented collector production-file overlap (cross-pitch). Each was verified against its scratch manifest; real deliverables retain the guard and accurate outcomes and do not edit production files. These are intentional reviewer probes, not production false positives.

Security walked section 9 and process ownership, scratch deletion, deadlines, error/secret handling and threat boundaries; no real security defect. Test review checked each exit criterion; individual absent API flags were not all separately injected (missing flock/runtime and all-capabilities gate covered). Cross-pitch review found disjoint implementation files; shared status bookkeeping must be merged by row, as performed here. Legacy production limitations remain acknowledged in report.md and parent pitches.

## Cycle 2 — 2026-09-26

Dispatched: code (gpt-6-sol, independent: yes), fresh narrow recheck. Guard again returned `clean: true`, unchanged head/status, no changed files; canary caught; record-check passed. Unsupported-runtime fix independently verified: focused unavailable-runtime tests, 2 pass / 1 skip / 0 fail. Capability gating, guard sensitivity, cleanup/deadline and cross-file agreement reviewed. No separate surviving-process inventory was performed; process-group teardown was inspected and exercised through failure paths.

Must-fix queue: **empty**. Should-fix queue: **empty**. Four deliverables now total 386 lines. Small-batch audit auto-flows to ship preparation; final closure is gated. No review of the original production fixes is implied by this spike audit.

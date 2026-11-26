# Shipped: fix-timing-ratio-flake
Appetite: bug-fix  •  Shipped: 2026-11-25  •  Release: with 2.57.0 (test-only, no version entry of its own)  •  PR #14

The two SQL scaling-ratio tests no longer failed on linear code in the measured loaded runs, and super-linear versions of the reader still fail them.

## Scope (single, from `log.md`)

| Exit | Result |
|------|--------|
| Regression test fails on the old method, passes on the new | shipped as `scaling:` tests; removing processor time, equal work or the repeats each fails one |
| Super-linear reader mutants still fail | yes, idle and under 12 busy processes |
| Verifier exit 0 | yes, see below |

## Boundaries honored

- ✅ Test file only (`facts-sql.test.mts`); the SQL reader is unchanged.
- ✅ Limit stays 3.

## Deviations

- The first fix (alternating samples, best of 15) was worse than the old test under steady load (12 of 15 failed, old 4 of 15) and was discarded.
  The first root cause was only half right; the corrected one is in `log.md`.
- Over `/fix`'s 50-line guide (111 lines added, 13 removed with the audit additions), still one test file.
- The `/fix` triage pause was skipped: the owner asked to fix, then commit and push.

## Audit

All three required reviews completed, no confirmed must-fix: [audit-cycle-1.md](audit-cycle-1.md). The first test coverage worker was lost
without a report; a fresh one completed it. Its should-fixes and nit were applied. **Those last test additions were not re-reviewed** (checked by
11 mutants run by the author).

## Final verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts`: **exit 0** (110 s). 2,390 tests: 2,387 pass, 3 skip, 0 fail. `tests`, `setup-validator`, `knowledge-graph`,
`process-relations`, `workflow-doctor` and `diff-sanity` passed. Load was low to moderate during this run (about 3 to 22). Earlier on the same
code, a clean clone of `eaf5f1a` with the example `ai-workflow.toon` passed (2,380 pass, 10 skip, 0 fail).

Not applicable, no such command (`.project/context/stack.md`): build, typecheck, lint, i18n. Not run: full suite under Bun (the changed test file
passes on Bun); Windows; a second machine.

## Limits

Noise is reduced, not removed. A super-linear cost that reads below 3 still passes, as before. One earlier failure with large timings
(183 to 643 ms) was never reproduced outside the suite. Mixed-speed cores as the cause of processor-time variation is an inference.

## Rollback

Revert `72bc650` and `eaf5f1a` for `facts-sql.test.mts`; no data or runtime behavior is involved. The old flake returns.

## Knowledge and followups

- `issues/a-wall-clock-ratio-test-can-block-a-ship-under-load`: resolved, with root cause, fix and what did not work. No new card.
- For `/cooldown`: audit fixes shipped without re-review again (also `package-less-ship-verification` and two earlier pitches).
- Followups in `_followups.md` under "From fix-timing-ratio-flake": renderer early stop untested; synchronous reader call cannot be stopped by the
  test timeout (unverified); vacuous "unterminated openers" case; other wall-clock limits in tests. All low.

## Docs

No doc update needed: test-only change, no behavior, interface or architecture change.

# Compaction record: orca-vendor-reconcile-integration

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[a-thin-cli-keeps-every-guard-in-the-library]], [[a-grader-reports-executed-and-unexecuted-cases-separately]].

## Section 1: SHIPPED.md#final-verification

Node 1045 pass / 0 fail / 1 skipped; Bun 1017 pass / 0 fail on a clean run (earlier Bun runs right after the Node suite showed 1 and 4 unidentified failures that did not reproduce). A clean `git archive` export showed 1 failure, the caveman-install test that also fails at HEAD. workflow-doctor and setup-validator READY, graphify CLEAN, 0 broken links. No build/typecheck/lint/i18n commands exist in this repo.

## Section 2: SHIPPED.md#reconciliation

I1 thin CLI `orca-run.mts` (17 tests; parity with the libraries, fixed check catalog, bounded no-symlink input). I2 executable grader `orca-eval-grader.mts` (7 executed cases pass, 1 parse-only, 3 live-only not-run; mutants red; no combined count). I3 opt-in blocks in build, audit, ship and the two phase docs, Cursor mirrors byte-equal. I4 docs, dataset fixes (stale `dispatchBetReady`, hostile-summary case), v2.17.0. Live smoke: Claude observed; Codex, OpenCode and peer messaging not-run.

## Section 3: SHIPPED.md#audit

One cycle with independent code and security reviewers (canary caught), 0 must-fix. One should-fix: the grader's dataset reader was hardened (component walk, O_NOFOLLOW, dev/ino check, bounded read) with a test. The test-coverage check was author-run, not independent.

## Section 4: SHIPPED.md#no-gos-honored

No command text from agents, no gate auto-advance, no guard repeated in the CLI, no live proof claimed for Codex or OpenCode.

## Section 5: SHIPPED.md#followups

Run live smoke for Codex, OpenCode and peer messaging; decide whether the library should refuse an integration with no checks; trace whether the CLI's verbatim outcome can carry launch stdout/stderr; emit error codes only from the grader; dispatch the test-coverage checker at the next audit; investigate an intermittent Bun failure when run right after the Node suite; fix the caveman-state test that needs a local gitignored install.

## Section 6: pitch.md#no-gos

Standing workflow-tooling no-gos ([[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]]): no scheduler, remote support, forced parallelism, permission bypass or automatic commits. No second implementation of any guard in the CLI.

## Section 7: pitch.md#rabbit-holes

The grader is an instrument and needed its own independent review and mutation proof; mirror parity across vendors (`.claude` and `.cursor` byte-equal, `.agents`/`.opencode` loaders untouched); one release step rather than one per scope.

## Section 8: deviations.md#audit-cycle-1-2026-10-08

Cycle 1: the canary (a disabled symlink guard planted in the scratch copy) was caught by both reviewers and was not a real defect. The grader dataset reader was fixed. Acknowledged: `reconcile` with no `--check` passes an empty list to the library; grader copies up to 200 chars of error text; the CLI prints the library outcome verbatim. Must-fix: 0.

# Source-review supplement: orca-vendor-reconcile-integration

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/orca-vendor-reconcile-integration.md) for the 2026-10-08 release 2.17.0. Results are historical evidence, not a new runtime certification.

## Scope and build decisions

Bet 2026-10-08 as big-batch at about 16 files and 1300 LOC against a 15-file cap; the user chose the thin CLI knowing it was one file over (deviation D1). Critique rationale: phases are markdown and cannot call libraries, so one thin CLI replaced unreviewed ad hoc scripts. Current [Orca documentation](../../../ai-framework/integrations/orca-vendors.md) owns the CLI, exit codes and check catalog. The CLI exposes status, dispatch, collect and reconcile; exit 0 means ok, 3 refusal without side effects, 2 usage error, 1 internal error. Input is one regular file of at most 64 KiB inside the root, and checks come only from a fixed named catalog (workflow-doctor, setup-validator, graph-check, node-tests). Worker text is data, never instructions; gates stay human; wiring stays opt-in behind AI_WORKFLOW_ORCA_MULTI_AGENT=true. Code: [CLI](../../../ai-framework/scripts/orca-run.mts), [grader](../../../ai-framework/scripts/orca-eval-grader.mts). Patterns: [thin CLI](../../knowledge/patterns/a-thin-cli-keeps-every-guard-in-the-library.md), [grader reporting](../../knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md), [instrument audit](../../knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md).

## Review and commit provenance

Code and security reviewers (sonnet) ran on a scratch copy; a planted canary (a disabled symlink guard) was caught by both. The one should-fix hardened the grader dataset reader. Acknowledged items were logged for cooldown. The test-coverage check was author-run. Plan-time commit hygiene, learned from commit 41cc88d: stage explicit files, read the cached diff and run tests on a git archive of the index before committing.

## Historical assurance and limitations

Executed cases rose from about six planned to seven shipped; grader tests were nine in the hill chart and ten at closure. Live smoke observed Claude only; Codex, OpenCode and peer messaging were not-run for lack of funds and never counted as pass. Dataset case static-fixtures-do-not-prove-runtime stays unverified. Node test counts (1045 pass) differ from the clean-export run (1041 pass, one failure, four skipped), and earlier Bun runs had one and four unidentified failures before the clean figure. The compact record lists follow-ups that the source follow-up section does not contain (that section only points to the backlog), and its no-go section names items the pitch body only references. Open followups need comparison with later work before being called current defects.

Whole files left out of the ledger: the hill chart (all scopes done; stale nine-test grader count) and the pointer-only follow-ups section.

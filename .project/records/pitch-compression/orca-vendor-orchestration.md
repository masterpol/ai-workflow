# Compaction record: orca-vendor-orchestration

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[a-thin-cli-keeps-every-guard-in-the-library]], [[a-grader-reports-executed-and-unexecuted-cases-separately]], [[prove-a-guard-test-with-an-in-memory-mutant]].

## Section 1: pitch.md#no-gos

No remote/SSH/WSL coordination, new providers, custom scheduler, IDE UI or cross-repository work. No automatic installation, login, permission bypass, historical rewrite or committed credentials. No forced parallelism, estimated savings, blind merges, recursive worker fan-out, or fallback over uncertain live edits. No broad rewrite of every phase or of the metrics collector; vendor model defaults are retained unless configured and supported. Standing no-gos: [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]]. All held across the four part pitches.

## Section 2: pitch.md#rabbit-holes

Feasibility was resolved at shaping: upstream documents all three vendors, supervised dispatch, isolated placement and peer messaging, but the installed CLI failed before discovery, so live compatibility stayed unverified. The rest was pushed to /plan and split across four pitches: foundation (policy, preflight, switch), dispatch (launch gate, ownership ledger, supervised dispatch), reconcile (diff admission, check-first apply, evidence, cleanup) and integration (CLI, grader, phase wiring). Runtime contract, baseline/reconciliation, failure ownership and appetite were each owned by one of them. All four shipped (releases 2.14.0 to 2.17.0); live smoke for Codex, OpenCode and peer messaging remains not-run.

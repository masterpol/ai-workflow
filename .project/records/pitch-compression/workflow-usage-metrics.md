# Compaction record: workflow-usage-metrics

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[metrics-ancestor-swap-during-async-lease]], [[pin-directory-identities-across-async-leases]], [[display-buckets-are-not-lifecycle-identities]], [[keep-the-fakes-guarantee-the-thing-they-replace]].

## Section 1: SHIPPED.md#scopes

S1 bounded useful event state with a guarded writer and record API/CLI (state, refusal, lifecycle and concurrency tests). S2 shared public JSON/Markdown/HTML report facts with attribution, gap and retention evidence and a safe report CLI. S3 contract guide, a link from the legacy docs, a compatibility smoke and a version record (2.16.0). All shipped 2026-10-08.

## Section 2: SHIPPED.md#verification

Final Node and Bun suites both pass 156/156 (38 metrics tests, 13 shared-helper tests, 88 collector/plugin/lease tests, 17 docs-links tests). Setup READY, links clean, Graphify rebuilt (44 entries, 124 links) with zero problems, whitespace clean. A CLI fixture smoke shows all formats agree and report reruns preserve state and legacy SHA256 hashes. The real report holds one manual build-skill event, which is not native capture proof. Audit passed in three cycles with zero open must-fix; no canary-qualified reviewer independence is claimed. Security fault-injection proves outside paths are refused across lease and operation interruption.

## Section 3: SHIPPED.md#no-gos-honored

No token, cost or resource fields; no prompts, responses or arguments; no transcript fallback, raw event journal, historical backfill or deletion, central upload, background repository discovery or automatic rollout. Legacy files and collectors unchanged; Orca ledger, evidence and path guards preserved. Missing attribution, overflow and incomplete collection stay visible; no fabricated coverage percentage or productivity metric.

## Section 4: SHIPPED.md#rabbit-holes-and-deviations

An explicit successful-pitch counter distinguishes ships without reconstructing history. Invalid display buckets cannot match lifecycle duration. Canonical encoded provider/model components prevent tuple collisions and invalid identities are refused. Concurrent safe initialization and ancestor identities are verified after the lease is acquired. Generic size and manual-validation conventions are reconciled in D4 and kept as a mechanical followup.

## Section 5: SHIPPED.md#knowledge-and-followups

Promoted issue `metrics-ancestor-swap-during-async-lease` and low-confidence patterns `pin-directory-identities-across-async-leases` and `display-buckets-are-not-lifecycle-identities`. Three followups: workflow-usage-capture (explicit lifecycle and native adapters, token-hook retirement with live evidence), workflow-usage-adoption (state, setup, doctor, bundle-sync and a separately scoped rollout) and metrics-core-maintainability. Only the approved core shipped; capture and adoption remain. No new ADR was needed.

## Section 6: pitch.md#no-gos

No prompts, responses or arguments; no history deletion, unlimited journals, billing reconciliation, savings estimates, central upload, background repository discovery or automatic fleet rollout. Preserve Orca ledger/evidence and metrics-path guards; leave active implementations alone. Configuration and fixtures are not live coverage.

## Section 7: pitch.md#rabbit-holes

Resolved: missing historical usage cannot be reconstructed and there is no transcript fallback. The planner owned event identity and timestamps, reversal and retention, migration and recovery, and the file count; shared writes use the existing lease; tests cover concurrent collectors, hostile persisted snapshots, symlinks, FIFOs and unsupported schemas, and never initialize over refused state. Split above 15 files / 1,500 LOC. Adapter contracts belong to capture.

## Section 8: deviations.md#d1-explicit-runner-for-compatibility-verification

The existing Node concurrent-writer test times out under ambient runner selection and passes with `AI_WORKFLOW_RUNNER=node`; compatibility commands select the runtime explicitly. No change to unrelated runtime code or collector tests.

## Section 9: deviations.md#d2-explicit-successful-pitch-counter

S2 needed a ship headline but S1's combined terminal outcomes could not identify successful pitch finishes. Added an optional backward-compatible `ships` counter: fresh summaries track it, pre-counter summaries with earlier finishes keep it unknown, and summaries with none initialize zero. Totals preserved; no past success invented.

## Section 10: deviations.md#d3-audit-hardening-and-path-check-boundary

Ancestor replacement across the asynchronous lease could follow external state or reports. Directory identities are pinned and filesystem effects guarded inside the lease; interrupted operations fail closed and release descriptors and the lease. Per-operation rechecks do not claim atomic protection against a malicious rename inside a syscall; if a directory is replaced after private temp creation, cleanup may leave the temp file rather than delete an external one.

## Section 11: deviations.md#d4-coupled-modules-and-explicit-schema-validation

Generic utility-size (<80 lines), function-size (<50), import-order and boolean-prefix conventions do not match the approved state and report modules; normalization, aggregation and guarded storage stay in the state module and rendering in the report module, with mechanical splitting deferred. Manual exact-schema validators are deliberate for this dependency-free bundle and covered by hostile persisted-state checks.

## Section 12: log.md#2026-10-08-s1-start

The user approved the revised useful-metrics-only plan and impact analysis; build start authorized with scope gates in force. Test strategy: deterministic state-transition unit tests plus real-file, subprocess and shared-lease integration tests. Unrelated runtime and Orca changes were outside ownership.

## Section 13: log.md#s1-verification-attempt-1

Node 18 passed, 2 failed: an assertion compared a prototype-free empty map with a plain object, and a fixture introduced an overflowing pitch so the expected overflow count was wrong. Corrected both; persisted maps now revive without prototypes.

## Section 14: log.md#s1-compatibility-run

New tests pass on Node and Bun (20/20), with Node coverage 100% lines and functions and 93.86% branches over the two new modules. One unchanged legacy concurrent-writer test timed out on a 5 s child barrier during simultaneous runtime suites and passed in isolation; no existing collector or test file was edited.

## Section 15: log.md#s1-exit-evidence-complete

S1 exit evidence: coverage run exit 0 with 20/20 pass; Bun run of the new tests plus the collector, plugin and lease checks passing 108/108.

## Section 16: log.md#s2-start-approved

The user approved S1 and continuation. Test strategy covers arithmetic across JSON/Markdown/HTML, empty, stale and malformed state, attribution gaps, report-only idempotence, excluded fields, unsafe destinations and state preservation after report failure. Inspection found a prerequisite: S1's combined terminal outcomes could not distinguish a completed pitch from a failed one, leading to deviation D2.

## Section 17: log.md#s2-exit-evidence-complete

S2 exit evidence: with the Node runner pinned, the three metrics test files pass 33/33 with 100% lines, 96.54% branches and 98.95% functions across all production modules; the Bun equivalents pass.

## Section 18: log.md#runtime-test-helper-integration-user-requested

On the user's request, the metrics tests were checked against the runtime-test-helpers API: they use `createTestDeps`, `tempFixture`, `captureIo` and `runScript`, with only node:assert/strict and node:test as direct Node imports. The async shared-lease concurrency test deliberately uses `deps.child.run` because `runScript` is synchronous.

## Section 19: log.md#s3-start-approved

The user approved S2 and continuation. S3 documents the event contract and report semantics, links it from the legacy collector docs, runs final compatibility and CLI checks and records one additive version entry after workflow-doctor passes. First final compatibility attempt: Bun 138/138; a simultaneous Node run 137/138 with a transient failure in the unchanged legacy collector.

## Section 20: log.md#s3-exit-evidence-complete

S3 exit evidence: standalone Node run (`--test-concurrency=1`) across the three metrics tests plus token-consumption, opencode-plugin, metrics-lock and docs-links tests: 138/138; equivalent Bun run 138/138; direct docs-links over the new guide and revised token docs: zero broken links.

## Section 21: log.md#audit-approved-three-cycles-complete

The user approved build to audit. Role reviews ran in a scratch copy with bounded commands, saved prompts and before/after repository guards; i18n and eval triggers were absent and no canary was planted, so independence is recorded as no. Fixed: ancestor substitution during the lease, safe concurrent initialization, invalid-scope duration collisions, hidden composite attribution loss and provider/model tuple collisions. One patched run passed 36/37 because the expected overflow total was wrong (75, not 70); corrected without removing any conservation assertion. Two transient failures in unchanged legacy tests were kept visible. Ten delivery files, about 1,275 lines, within the cap; zero open must-fix.

## Section 22: log.md#ship-approved-and-closed-2026-10-08

The user approved shipping the core from the audit gate. Final verify repeated the real Node and Bun eight-file commands: both exit 0 with 156/156. Build, typecheck, lint and i18n skipped (none configured). Extracted one resolved security issue and two low-confidence patterns (directory identity across async leases; display buckets versus lifecycle identities); no core scope deferred.

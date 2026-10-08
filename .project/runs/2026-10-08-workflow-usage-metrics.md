# Shipped: workflow-usage-metrics

Bet: 2026-10-08 • Shipped: 2026-10-08 • Appetite: big-batch core
Approval: user approved ship from the completed audit (“Approvwe”).
Release: 2.16.0. Ten delivery files, approximately 1,275 added/changed lines including tests/docs and release additions, within 15-file/1,500-line cap. Required pitch/evidence/knowledge records are separate bookkeeping as approved in the plan.

## Scopes

| ID | Status | Hill done | Evidence |
|----|--------|-----------|----------|
| S1 | shipped | 2026-10-08 | Bounded useful event state, guarded writer and record API/CLI; state/refusal/lifecycle/concurrency tests |
| S2 | shipped | 2026-10-08 | Shared public JSON/Markdown/HTML report facts, attribution/gap/retention evidence and safe report CLI |
| S3 | shipped | 2026-10-08 | Contract guide, legacy-doc link, compatibility smoke and version record |

## Verification

Final Node and Bun suites both pass 156/156: 38 metrics tests, 13 current shared-helper tests, 88 existing collector/plugin/lease tests and 17 docs-links tests. No build/typecheck/lint/i18n commands exist in this bundle. Setup READY; direct links clean; Graphify rebuilt 44 entries/124 links and reports zero problems; whitespace check clean. CLI fixture smoke proves all formats agree and report reruns preserve state/legacy SHA256 hashes. The current real report contains one manual build-skill event; this is not native capture proof.

Audit passed in three cycles, zero open must-fix. Exact prompts/hashes and scoped read-only guards are retained; no canary-qualified reviewer independence is claimed. Security fault-injection proves outside paths are refused across lease/operation interruption and later work recovers. Per-operation protection and possible private-temp retention after directory substitution are explicit in D3.

## No-gos honored

No token/cost/resource fields, prompts/responses/arguments, transcript fallback, raw event journal, historical backfill/deletion, central upload, background repository discovery or automatic rollout. Legacy files/collectors are unchanged. Orca ledger/evidence/path guards and unrelated active changes were preserved. Missing/overflow attribution and incomplete collection remain visible; no fabricated coverage percentage or productivity metric.

## Rabbit holes and deviations

Explicit counter distinguishes successful pitches without reconstructing historical success. Invalid display buckets cannot match lifecycle duration. Canonical encoded provider/model components prevent tuple collisions and invalid identities are refused. Concurrent safe initialization and ancestor identities are verified after lease acquisition. Generic size/manual-validation conventions are reconciled in D4 and retained as mechanical followup; no dependency expansion.

## Knowledge and followups

Promoted `metrics-ancestor-swap-during-async-lease`; added low-confidence patterns `pin-directory-identities-across-async-leases` and `display-buckets-are-not-lifecycle-identities`, with real graph links. Graph and index rebuilt. Trivial fixture/assertion/syntax incidents stay in log; existing legacy lease-flake class remains in the prior platform/collision followup.

Three appended followups: workflow-usage-capture (explicit workflow lifecycle/native adapters and token-hook retirement with live evidence), workflow-usage-adoption (state/setup/doctor/bundle-sync and separately scoped project rollout), and metrics-core-maintainability (cohesive module/validation-convention reconciliation). The full requested reform still needs capture and adoption; this record ships only the approved core.

Public docs already updated in S3; no additional product/architecture context or ADR is required for this additive local script/report surface. History copied to `runs/2026-10-08-workflow-usage-metrics.md` and `runs/2026-10-08-workflow-usage-metrics-hill.md`. No source commit or publication requested.

---

# Build log: workflow-usage-metrics

## 2026-10-08 — S1 start

User approved the revised useful-metrics-only plan and impact analysis. Build start is authorized; scope gates remain in force. Existing unrelated runtime and Orca changes are outside ownership.

Test strategy follows the already approved S1 exit criteria: deterministic state-transition unit tests plus real-file, subprocess and shared-lease integration tests. Validate exact counts, attribution/overflow, replay windows, lifecycle matching, hostile input and refusal-preservation behavior. No visual snapshots or native capture claims.

S1 persists workflow state and exposes the record API/CLI. Report generation belongs to S2 and is not yet available. Automatic collector replacement belongs to the dependent capture pitch.

## S1 verification attempt 1

Node: 18 passed, 2 failed. One assertion compared a prototype-free empty map with a plain object. Another fixture unintentionally introduced an overflowing pitch for all dimension events, so its expected overflow count was wrong. Corrected the empty-key assertion and pinned those events to an already-counted pitch; retained the overflow and conservation assertions. Persisted maps now explicitly revive without prototypes.

## S1 compatibility run

New tests pass: Node 20/20; Bun 20/20. Node coverage: 100% lines/functions, 93.86% branches across the two new production modules. Bun new plus existing collector/plugin/lease checks pass 108/108. Node existing compatibility checks pass 87/88: the unchanged collector's concurrent-writer test timed out waiting for a child barrier after 5 seconds during simultaneous runtime suites. Rechecking that test in isolation before claiming compatibility. No existing collector or test files have been edited.

The isolated retry reproduced the timeout. A minimal child probe printed before requiring the collector but never reached the barrier. Explicit `AI_WORKFLOW_RUNNER=node` makes the existing concurrency test pass (1/1, exit 0). The observed failure depends on runner selection during the existing `node -e` library probe, not the new writer. Compatibility verification now explicitly selects Node; no secret configuration was inspected and no unrelated runtime code was changed.

Explicit Node combined run: new 20/20 pass; total 107/108 pass. The earlier barrier case passed. A different unchanged collector test (`names are truncated to 80 characters...`) waited roughly 26 seconds and then found no snapshot; its best-effort loop ignores collector skip results. Rechecking this case alone in a fresh fixture before reporting final compatibility. No production patch made for this unrelated test failure.

## S1 exit evidence — complete

- `node --test --experimental-test-coverage --test-coverage-include='**/workflow-metrics-state.mts' --test-coverage-include='**/workflow-metrics.mts' ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics.test.mts`: exit 0, 20/20 pass; lines/functions 100%, branches 93.86%.
- `bun test ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics.test.mts ai-framework/hooks/scripts/token-consumption.test.mts ai-framework/hooks/scripts/opencode-plugin.test.mts ai-framework/hooks/scripts/metrics-lock.test.mts`: exit 0, 108/108 pass.
- Isolated existing name-overflow check: exit 0, 1/1 pass in a fresh fixture.
- `AI_WORKFLOW_RUNNER=node node --test --test-concurrency=1 ai-framework/hooks/scripts/token-consumption.test.mts ai-framework/hooks/scripts/opencode-plugin.test.mts ai-framework/hooks/scripts/metrics-lock.test.mts`: exit 0, 88/88 pass. Final clean compatibility run explicitly selects the runner and sequences test files; prior failures remain recorded above.
- `node ai-framework/scripts/setup-validator.mts`: READY, 22 checks passed; 92 TypeScript entries parse.
- `git diff --check`: exit 0.

Four new delivery files, 625 lines including behavior tests. The record command writes only `workflow-usage.json`; identifiers are hashed for bounded bookkeeping. Tests prove excluded resource/free-text fields never reach it. Fixture CLI and concurrent-writer checks are not proof of native vendor capture. No application, legacy collector, runtime adapter or existing history changed by this scope. Reports remain S2; docs/version record remain S3.

S1 marked done with this evidence. Awaiting user per-scope approval before S2.

## S2 start — approved

User approved S1 and continuation to S2. The approved test strategy covers arithmetic across JSON/Markdown/HTML, empty/stale/malformed state, attribution gaps, report-only idempotence, excluded fields, unsafe destinations and state preservation after report failure. Reports remain static and claim no verified native adapter.

Inspection found a reporting prerequisite: S1 aggregated terminal outcomes across different event kinds, so a completed pitch could not be distinguished from a failed pitch using totals alone. Add an explicit ship counter. Earlier snapshots without that counter report ships unavailable when prior pitch finishes exist; no historical success is inferred. This is an S2 correctness fix within the existing state file, with migration/compatibility tests.

### S2 initial check

The first Node test attempt caught a missing closing bracket in the renderer's dimension specification. Corrected the syntax before continuing verification. No data was written by the failing module load.

## S2 exit evidence — complete

- `AI_WORKFLOW_RUNNER=node node --test --experimental-test-coverage --test-coverage-include='**/workflow-metrics*.mts' --test-coverage-exclude='**/*.test.mts' ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics-report.test.mts ai-framework/scripts/workflow-metrics.test.mts`: exit 0, 33/33 pass; 100% lines, 96.54% branches, 98.95% functions across all three production modules.
- `bun test ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics-report.test.mts ai-framework/scripts/workflow-metrics.test.mts`: exit 0, 33/33 pass.
- `node ai-framework/scripts/setup-validator.mts`: READY, 22 checks; 94 TypeScript entries parse.
- `git diff --check`: exit 0.

Tests independently verify event-unit arithmetic and all three public report formats; hostile persisted state and unsafe destinations are refused; report regeneration preserves counters and legacy files. Both view destinations are preflighted before either is written. Multi-file write failures may still leave different report generations, which source timestamps expose; event state remains valid. Older summaries without a ship counter retain unknown historical ship totals rather than inferred successes (D2).

Generated this project's ignored Markdown and HTML reports from one genuine manual `skill.used` event for Codex/build on this pitch, collected during S2. This is observed manual use, not fixture history or native adapter proof. Re-running report preserved the recorded collection timestamps and count of one. Automatic capture remains explicitly unconfigured. No legacy files were imported or changed.

Six delivery files total 1,004 lines including tests, leaving the approved S3 documentation/version budget inside the 1,500-line cap. S2 marked done; awaiting its required big-batch scope approval before S3. Audit, ship, automatic capture and adoption are still pending.

## Runtime test-helper integration — user requested

Checked the current `runtime-test-helpers` pitch and its shared API against all three new metrics test files. They already use `createTestDeps` and `tempFixture`; CLI tests use `captureIo`, and synchronous script integration tests use `runScript`. Only `node:assert/strict` and `node:test` remain as direct Node imports. The asynchronous shared-lease concurrency test deliberately uses `deps.child.run` to preserve simultaneous execution; the shared `runScript` helper is synchronous. Production scripts already accept injected `RuntimeDeps` and use the runtime CLI entry point, so test helpers remain confined to tests. No additional source refactor was necessary.

Verified the shared helper's eight tests together with all 33 metrics tests: explicit Node and Bun runs both exit 0, 41/41 pass. This confirms integration with the current helper implementation. S3 remains pending the existing S2 approval gate.

## S3 start — approved

User said “next,” approving S2 and continuation to S3. Document the useful event contract and report semantics, link it from legacy collector documentation, run final compatibility/CLI checks, and record one additive version entry after workflow-doctor passes. Automatic capture/adoption remain separate. Runtime test-helper integration is retained.

First final compatibility attempt: Bun passes 138/138 (new metrics, existing collector/plugin/lease, docs-links). Simultaneous Node run passes 137/138; unchanged legacy test `a caveman mode from modes.json is one short lowercase word or it is not stored` finds no snapshot after about one second. Its best-effort event may skip under the shared endpoint; no new metrics test failed. Rechecking the entire Node command without a simultaneous Bun run before concluding compatibility. No unrelated collector patch.

Isolated initialized-project CLI smoke passes: two explicit fixture events (skill use and successful pitch finish), all three report formats agree on totals, repeated reporting preserves event-state and legacy-file SHA-256 hashes. Fixture-only CLI proof, not native adapter coverage. Direct link validation: two changed docs, zero broken links. Setup READY (22 checks), graph CLEAN (41 entries), workflow doctor READY (729 checks). No knowledge entries were edited.

## S3 exit evidence — complete

- Final standalone `AI_WORKFLOW_RUNNER=node node --test --test-concurrency=1` across the three workflow-metrics tests plus `token-consumption.test.mts`, `opencode-plugin.test.mts`, `metrics-lock.test.mts`, and `docs-links.test.mts`: exit 0, 138/138 pass. The preceding transient legacy failure is retained above; no production correction was needed.
- Equivalent explicit Bun command: exit 0, 138/138 pass.
- Direct `docs-links.mts` on the new integration guide and revised token documentation: two files, zero broken links.
- Setup validator READY (22 checks); graph check CLEAN (41 entries); workflow doctor READY (729 checks).
- Isolated fixture CLI smoke: JSON/Markdown/HTML agree; report regeneration preserves state and legacy checksums.
- Changelog skill: checked current 2.15.1 after unrelated Orca changes, then recorded one minor additive entry through `changelog.mts`: 2.16.0. Existing changelog entries preserved.

All three scopes meet their exit criteria. Ten delivery files, approximately 1,130 added/changed lines including tests and docs, within the approved 15-file/1,500-line cap. Useful state and public reports exclude resource and raw-payload data; existing automatic collectors and legacy history remain untouched. Automatic native capture, `/state` adoption and application rollout are dependent work, not completed by this core.

Build complete and awaiting user approval to enter audit. No new scope deviation beyond D1 (explicit runtime verification) and D2 (backward-compatible successful-pitch counter).

## Audit — approved, three cycles complete

User approved build → audit. Parallel applicable role reviews used a scratch copy, bounded commands, exact saved prompts and before/after repository guards. I18n and AI eval triggers were absent. No canary was planted; independence is recorded no throughout, with author-run verification identified separately.

Confirmed and fixed directory ancestor substitution during the lease, safe concurrent initialization, invalid-scope duration collisions, hidden composite attribution loss, provider/model tuple collisions and encoded invalid model identities. Added actual CLI unsafe-destination proof, every-headline format checks, keyboard table scrolling and top-level first-use guidance. Audit report records triage and reviewer rechecks.

First patched metrics runs passed 36/37: overflow expectation was still 70, but five invalid skill labels now correctly contribute to overflow health; corrected independently counted expected total to 75. Subsequent runs passed. No count-conservation assertion was removed.

Final compatibility verification encountered two transient unchanged legacy failures: Node `a reported cost of 0 is not counted as priced` found no snapshot; Bun `lease parity (bun adapter): a stale legacy lock...` received busy-lease skip instead of legacy-lock skip. Both best-effort cases depend on endpoint availability. Earlier post-hardening Node155 and Bun156 runs passed; final standalone reruns after canonical validation passed Node156/156 and Bun156/156 without modifying the collector. Keep these attempts visible rather than claim every run was clean.

Final eight-file suites comprise 38 metrics tests, 13 current shared-helper tests, 88 existing collector/plugin/lease tests and 17 docs-links tests. Setup22, graph41, direct docs links and diff whitespace checks pass. Current project views regenerated while preserving event-state SHA256 and its one manual build use. Capture remains unconfigured. Ten delivery files remain inside the 1,500-line cap (~1,275 lines including docs/tests and release additions).

Audit has zero open must-fix. Awaiting user approval to ship the core; no ship extraction, historical deletion, native capture or rollout has been performed.

## Ship — approved and closed 2026-10-08

User approved shipping the core from the audit gate (“Approvwe”). Final verify repeated the real non-watch Node and Bun eight-file commands: both exit 0, 156/156 pass. Build/typecheck/lint/i18n are skipped because stack.md declares no such commands. Whitespace and owned-source debug/secret-filename checks pass. Three scope exits reconcile with the approved plan; no core scope deferred.

Extracted one resolved security issue and two low-confidence reusable patterns covering directory identity across async leases and lossy attribution versus lifecycle identities. Full Graphify rebuild exits 0: 44 entries, 124 links; follow-up check has zero problems, broken links or orphans. Project-local reports and existing legacy history are preserved; automatic capture remains unconfigured.

Closed workflow records, copied full log/hill into immutable run records, and added three followups: native capture/retirement, project adoption/rollout, and mechanical module/validation-convention reconciliation. No commit, merge, deployment or application rollout is part of this ship. Version 2.16.0 records the logical core change. This fifth ship triggers a proposal-only cooldown; no proposed rule, archive or candidate pitch is applied without per-item approval.

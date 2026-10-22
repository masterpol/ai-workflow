# Shipped: token-time-report

**Version: 2.41.0. Status: SHIPPED LOCALLY — owner approved final closure.** Bet: 2026-10-21. Local workflow date: 2026-10-21 (America/Bogota); changelog date: 2026-10-22 UTC. Appetite: big-batch, 13 implementation/test/contract/release files, 1,489 changed lines, within the 15-file / 1,500-line cap. No Git commit, push or public publication is represented by this local release record.

## Result

`node ai-framework/scripts/flow-report.mts --root .` previews JSON. `--format markdown|html` selects another preview; `--apply` publishes all three fixed `.project/metrics/flow-report` files, only when existing targets are owned. The existing /state metrics page safely links a report that exists, without generating or refreshing it.

The pure joiner matches exact canonical pitch/phase/scope identities and retains source-specific and one-sided rows. It shows vendor token reporting coverage, stored cross-vendor interval-union timing, lower-bound wait time, provisional activity, source windows/freshness/health, bounded transitions/trace, history availability/revisions, omitted counts and unavailable metrics. Missing coverage is not zero. No productivity/effort/cost/comparability estimate is fabricated.

## Scopes

| Scope | Status | Evidence |
|---|---|---|
| S1 joined JSON and guarded reads | shipped | S1-evidence.md, source validation and independent CLI fixtures |
| S2 Markdown/HTML and owned publication | shipped | S2-evidence.md, stage/target swap fixtures, render and publication tests |
| S3 state link and portable contract | shipped | S3-evidence.md, safe existing-target integration, workflow-metrics.md and release entry |

Review-bench repairs were explicitly authorized by the owner's “Fix orca”: the snapshot writer/reader now share a bounded 16MiB limit and skip secret-shaped paths before reading. Reports/manifests keep their 256KiB bound. Thirty-five Node/Bun cases, including a read-refusing secret spy, pass.

## Verification

| Check | Current result |
|---|---|
| Full Node | exit 0, 2472 pass, 0 fail, 3 existing skips; 2475 total, 90.421s |
| Scoped Bun | exit 0, 257 pass across six flow/guard/state files; 8.965s |
| Report module coverage | independent 100% lines; branches join 95.49%, render 96.63%, CLI 90.97% |
| Workflow doctor | exit 0, 757 checks; one pre-existing runtime-boundary warning in state-graph.test.mts (node:fs/os/path), outside this scope |
| Setup validator | READY, 23 checks |
| Knowledge graph | CLEAN, rebuilt: 119 entries, 336 links |
| Diff and source review | diff --check passes; tracked/untracked sensitive paths and production debug output absent |
| Default pre-ship wrapper | FAILED: no package.json or Muro verifier; failure preserved; owner explicitly approved the documented direct-check gauntlet |
| Build/typecheck/lint/i18n | N/A: this bundle has no such commands, per stack.md |

The failed default wrapper is not labelled passed. No temporary package manifest, Muro verifier or wrapper patch was fabricated. Fresh ship source tests passed; later edits are release and workflow records, so no identical full-suite repeat is claimed or needed.

## Audit and evidence boundaries

Audit completed in three cycles including the owner-approved additional evidence-only pass. M1–M5 are closed in audit-final-evidence.md. All 13 reviewer reports caught their scratch defects; the last security/coverage raw citations were misnumbered, so manual semantic/POC verification is explicitly distinguished from automated citation matching. No claim of all-automated citation success or independence from model-family blind spots is made.

Confounded 1e12 reader-cap mutant failures were discarded. A finite 4MiB-to-8MiB coordinator check failed at the intended size assertion and is labelled author-run supplementary evidence. Secondary per-file read caps are not claimed to have independently isolated mutant proofs. A stalled-write mutant is caught by timeout; target-mtime is a documented redundant layer. Earlier incomplete/failed reports and timing-bound full-suite attempts remain preserved.

Shared-checkout worker changes were independently inspected and exits rerun; none remain unintegrated, so no reconcile call was needed. All completed attempt ledgers are settled. The one previously retained human-owned terminal was not forcibly closed. /ship needed no new workers.

## No-gos and rabbit holes

No collectors/hooks/prompts, source schema migration, backfill, journals/transcripts, productivity ranking, estimated usage, implicit state generation or historical record rewrite. Existing flow dimensions and capture windows were reused. No arbitrary output destination, external resource or active untrusted HTML link was added.

Source-specific overflow and legacy identities, missing history, unequal windows, pending intervals and safe publication boundaries were resolved as bounded reporting semantics. Comparable-window ratios require separate capture work. Publication is one file at a time, not an atomic set; generation IDs reveal mixed results. The OS path-check-to-syscall race remains without anchored filesystem APIs. A substituted stage is preserved for operator recovery.

## Knowledge and follow-ups

Two new linked issues: history-projection availability/privacy and staging-substitution cleanup. One new low-confidence exact-identity/window-aware metrics pattern. Six existing cards updated, including resolution of snapshot-size mismatch and secret-file hashing; generated graph/index rebuilt. Reviewer packet completeness and mutation-proof quality are flagged for cooldown; no rules auto-promoted.

Four followups are recorded as TTR-A1–A4: trusted-root Git execution hardening, strict appetite counting, bounded path/error/snapshot tooling polish, and optional static-report usability. Existing wrapper/timing issues retain their backlog ownership. The two repaired guard issues are resolved without deleting their original entries. Neutral multi-table styling and static accessibility assertions are retained; no browser geometry/contrast measurement is claimed.

## Documents and recovery

workflow-metrics.md documents the new commands, exact joins, ownership, unsafe/missing distinctions, provisional timing, staging recovery and limits. No other product/architecture/ADR change is needed: the bundle's existing inward import/runtime model is unchanged. Matching cohesive-module exceptions are recorded in plan.md and deviations.md.

The full preparation log and hill snapshot are copied to runs/2026-10-21-token-time-report.md and its -hill.md sibling. Bounded top-level verification/dispatch evidence is archived in runs/2026-10-21-token-time-report-evidence.tar.gz with an adjacent SHA-256 manifest; 218 members were individually verified. Nested fixture trees, nonregular files and secret-shaped names were excluded. Only the post-secret-fix read-only snapshot was retained; old protected-name hashes were not archived.

A concrete compacted status index is prepared at `.project/metrics/token-time-report-ship/status-after-ship.md`. Applying it closes this pitch, keeps the five most recent ships and advances the cooldown counter to three ships since the last review (next due after two). No cooldown runs at this closure.

## Final closure

Owner approved the final ship gate. The compacted status index moves this pitch into recent ships; cooldown is due after two more ships. No commit, push, public publication or human-owned terminal cleanup was performed.

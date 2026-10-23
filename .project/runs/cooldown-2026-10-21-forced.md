# Cooldown report — 2026-10-21 (forced)

Run with `--force` at 3 ships since the earlier cooldown (state-deep-evidence, test-execution-performance, token-time-report). Coordinator review; no workers dispatched.

## Knowledge health
Graph check: 119 entries (16 decisions, 53 patterns, 2 entities, 48 issues), 336 edges; 0 broken links, 0 orphans. No entry is 60 days old; no archives.

## Per-item decisions (user-approved individually)

| ID | Decision | Result |
|----|----------|--------|
| C4 | Closed, already promoted | `ai-framework/workflow/phases/3-audit.md` "Measurement over assertion" |
| C5 | Promoted | `coding-standards.md` "Producer and Reader Share One Bound"; hit in 4 pitches, code already fixed in token-time-report |
| C8 | Promoted | `testing.md` "Schema bumps move with their dependents"; 5 pitch/run refs |
| C9 | Closed, already promoted | `testing.md` "macOS tmpdir realpath" |
| C6 | Bundled | candidate pitch `package-less-ship-verification` in `_followups.md` |
| C7 | Bundled | candidate pitch `orca-bounded-control-receipts` in `_followups.md` |

C1–C3 and October 17 proposals remain pending and unchanged.

## Parked pitches
`_parked/` is empty. Index-only `restore-vendor-adapters` row still stale; unchanged.

## Followups
TTR-A1–A4 are already recorded; their security-leaning items (A1 fsmonitor execution, A2/A3 review-bench hardening) could be bundled into one review-bench hardening pitch in a later cooldown. Nothing deleted.

## Addendum 2026-10-22 (individual approvals by the owner)

| Item | Decision |
|------|----------|
| 10-17 candidates `agent-model-sweep-bet-3`, `mandatory-fixture-seeding`, `doc-sweep-stale-claims`, `bundle-sync-stale-ledger` | Approved as candidate pitches (already bundled in `_followups.md`; marked there). Not yet shaped or bet. |
| C6 `package-less-ship-verification` | Moved to a pitch draft: `pitches/package-less-ship-verification/pitch.md` |
| C7 `orca-bounded-control-receipts` | Moved to a pitch draft: `pitches/orca-bounded-control-receipts/pitch.md` (guard-reader half already fixed) |
| Stale `restore-vendor-adapters` row in `status.md` | Removed |
| C1 `review-guard-secret-exclusion` | Approved; **closed as already implemented**. Verified 2026-10-22: `review-bench.mts` excludes secret-shaped names (`SECRET_NAME`) before reads, `review-bench.test.mts` passes 35/35 including a credentials-file spy case, issue `review-guard-hashes-ignored-secret-files` is `resolved: true`. No work remains. |
| C2 `codex-trusted-hook-smoke` | Approved as a candidate pitch in `_followups.md`; needs owner hook trust at a fresh Codex host |
| C3 `workflow-coverage-instrumentation` | Approved as a candidate pitch in `_followups.md` |


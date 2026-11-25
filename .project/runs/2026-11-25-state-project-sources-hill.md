# Hill chart: state-project-sources

**Initialized**: 2026-11-24

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S1 | done | 2026-11-24 | claude sps-s1-1 collected+released; 420 lines (spike passed); 16 tests Bun+Node re-run; live: LAH 13 tables/7 fks, climbing 29/30, RN 3+1, no lexical incompletes |
| S2 | done | 2026-11-24 | opencode sps-s2-1 collected+released after ~2h (slow model; coordinator live-check feedback fixed 4 defects); 609 src lines, 52 tests Bun+Node re-run; live: LAH 13 tables stale, RN 3 tables, climbing observed, docs-only unconfigured |
| S3 | done | 2026-11-24 | codex sps-s3-1 collected+released; +44/-12 src, +112 tests; Bun 169 / Node 114 pass; live drafts for LAH, RN, climbing, comuna pass real archify validate |
| C1 | done | 2026-11-24 | contract + skill (+Cursor mirror, identical) reconciled; doctor list + every-facts-file test; decision entry; followups; doctor READY; docs links 0 broken; graph CLEAN. 2.55.0 + changelog deferred to /ship (serialized after the Orca ship) |

## Hill positions reference

- `uphill 0%` — not started
- `uphill 25%` — exploring code, reading constraints
- `uphill 75%` — approach decided, key unknowns resolved
- `over the hill` — about to execute
- `downhill 25%` — implementing
- `downhill 75%` — implemented, verifying exit criteria
- `done` — all exit criteria evidenced

## Stuck-uphill watch

(Auto-populated if a scope sits at the same uphill position across 3 session updates.)

## Audit
2026-11-24: 3 cycles, 0 must-fix open; cycle-3 fixes unreviewed (cap). Record `.project/analysis/2026-11-24-state-project-sources-audit.md`; raw reports `audit-reports/`.

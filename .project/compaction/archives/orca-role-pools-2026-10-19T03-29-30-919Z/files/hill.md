# Hill chart: orca-role-pools

**Initialized**: 2026-10-16

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S1 | done | 2026-10-16 | policy pools, 66 policy tests, truncation + 2-cap fixed |
| S2 | done | 2026-10-16 | orca-start probes every member; 3 new tests |
| S3 | done | 2026-10-16 | config already rejected empty/dup pools (pin tests), example pool, docs; S0 baseline repair added |
| S4 | done | 2026-10-16 | SKIPPED live spike: unverified above 3 live workers, default stays 3 (no vendor workers spawned unsupervised) |
| S5 | done | 2026-10-16 | orca-assign.mts, 9 tests, 2 mutants caught |
| S6 | done | 2026-10-16 | assign in dispatch + CLI, rotation only on proven-clean failure, overlap guard; 3 mutants caught |
| S7 | done | 2026-10-16 | grader cap + pickImplementer, build skill + cursor mirror, vendors doc, 2.27.0 |

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

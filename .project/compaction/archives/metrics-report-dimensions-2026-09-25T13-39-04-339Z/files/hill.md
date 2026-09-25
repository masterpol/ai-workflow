# Hill chart: metrics-report-dimensions

**Initialized**: 2026-09-24

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S0 — Payload-field spike | done | 2026-09-24 | 6 sections; Claude fields verified live; deviation D1 found |
| S1 — Collector core (schema v2, reversible dimensions, skill branch, safe keys) | done | 2026-09-24 | 45 tests pass; 91.3% coverage; see s1-evidence.md |
| S2 — Report renderer and usage headline | done | 2026-09-24 | 14 renderer tests; 100% coverage; median 6 ms/render; see s2-evidence.md |
| S3 — Harness feeders | done | 2026-09-24 | CLI and stubbed OpenCode checks pass; see s3-evidence.md |
| S4 — Docs, doctor, end-to-end | done | 2026-09-24 | doctor 738 checks READY; e2e replay clean; see s2-s4-evidence.md |

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

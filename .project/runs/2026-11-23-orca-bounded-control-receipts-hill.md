# Hill chart: orca-bounded-control-receipts (final, shipped 2026-11-23)

**Initialized**: 2026-11-23

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S1 | done | 2026-11-23 | bounded identity lookup; widened to every non-released state by the audit |
| S2 | done | 2026-11-23 | refusal code kept, ownership unchanged; failedStage bounded by the audit |
| S3 | deferred | 2026-11-23 | needs the owner's authorization to create Orca state |

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

# Hill chart: toon-machine-data

**Initialized**: 2026-10-18

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S0 — Agent-load inventory | done | 2026-10-18 | inventory.md written; Decision: NO-GO (S5 dropped). Evidence: greps quoted in inventory.md |
| S1 — Data grammar + parser | done | 2026-10-19 | toon-data.mts + 26 tests; 8/8 mutants caught; config.test unchanged |
| S2 — Shared reader/writer | done | 2026-10-19 | data-file.mts + 14 tests; 7/7 mutants caught |
| S3 — Converter + token report | done | 2026-10-19 | converter + 15 tests; mutants caught; real-file round trip in temp copy; dry-run report on repo files printed |
| S4 — Rule | done | 2026-10-19 | machine-data-format.md + eval-harness pointer; validator READY, doctor READY, contracts 14/14 |
| S5 — Convert proven dataset | dropped | 2026-10-18 | S0 NO-GO: no existing dataset is agent-loaded and eligible |
| S6 — Golden cases + close-out | done | 2026-10-19 | 9 cases added (7 enforced by named tests, 2 live-only not-run); 2.32.0; graph CLEAN; full suite 1738 pass / 0 fail / 3 skipped |

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

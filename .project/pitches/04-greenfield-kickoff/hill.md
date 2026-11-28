# Hill chart: greenfield-kickoff

**Initialized**: 2026-11-27 (part A; part B is planned after A ships). [Plan](plan.md)

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| A1 | done | 2026-11-27 | Exit criteria evidenced in `log.md`; approved by the owner. |
| A2 | done | 2026-11-27 | Option 3: instructions state the current limit; exit commands and verifier pass. Owner smoke test and the live-only golden case are not run. |
| B1-S1 | done | 2026-11-27 | [Plan B1](plan-b1.md); exit criteria evidenced in `log.md`. No independent review yet. |
| B1-S2 | done | 2026-11-27 | Check-before-copy; exit commands and route trial evidenced in `log.md`. Owner live smoke and `check-before-copy` not-run. No independent review yet. |

## Hill positions reference

- `uphill 0%` — not started
- `uphill 25%` — exploring code, reading constraints
- `uphill 75%` — approach decided, key unknowns resolved
- `over the hill` — about to execute
- `downhill 25%` — implementing
- `downhill 75%` — implemented, verifying exit criteria
- `done` — all exit criteria evidenced

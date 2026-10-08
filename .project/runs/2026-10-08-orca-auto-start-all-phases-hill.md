# Hill chart: orca-auto-start-all-phases

**Initialized**: 2026-10-08

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| P0 | done | 2026-10-08 | two stale records moved to failed via the ledger library; all slots free |
| S0 | done | 2026-10-08 | payloads observed live; settings restored byte-for-byte |
| S1 | done | 2026-10-08 | node 29/29, bun 29/29, invariants 5/5 re-run by coordinator; real Orca run: ready in 520 ms |
| S2 | done | 2026-10-08 | node 26+10+5, bun 26 re-run by coordinator; collect accepted |
| S3 | done | 2026-10-08 | hook 16/16 node+bun; live in this session: Orca: ready; blocked/bypass/off/bad-stdin paths run by hand |
| S4 | done | 2026-10-08 | docs section verified against the code; validator READY, graph CLEAN |
| S5 | done | 2026-10-08 | 3 canonical + 3 cursor mirrors identical; build's second Orca section fixed by coordinator |

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

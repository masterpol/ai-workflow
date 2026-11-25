# Hill chart: orca-balanced-role-pools

**Initialized**: 2026-11-24

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| P1 | done | 2026-11-24 | opencode obrp-p1-1 (by hand); 18 assign tests; no-load result identical to old round-robin |
| P3 | done | 2026-11-24 | codex obrp-p3-1 (by hand); runId input + duplicate-key check (unplanned, see deviations) |
| P2 | done | 2026-11-24 | assign (old round-robin) picked opencode obrp-p2-1; ledger runId, loadOf, admit under the lock; mutants fail |
| P4 | done | 2026-11-24 | assign+runId picked codex obrp-p4-1 (all loads 0, tie-break); golden case executes 9/9; required settling r5c-1 (owner-approved) |
| C1 | done | 2026-11-24 | orca-vendors.md owns the rule, 2-build pointer, contract test; live smokes s1 claude (tie), s2 opencode (load beat round-robin); 2.54.0 |

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

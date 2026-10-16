# Hill chart: upstream-project-drift

**Initialized**: 2026-10-16

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S0 | done | 2026-10-16 | drift-ledger.md: 178 rows; deviations D3, D4 |
| S1 | done | 2026-10-16 | OpenCode worker updrift-s1-4 (rules) + coordinator (graphify); graphify 16/16 node + bun; check exit 0 |
| S2 | done | 2026-10-16 | climbing runtime + 3 coordinator fixes (D7); GAUNTLET node 1284/2 flaky, bun 1281/1 known timeout; Linux 69/0 |
| S3 | done | 2026-10-16 | Pulled forward (D6): isSupportedVersion floor 1.4.224, 4 sites; 198/198 node + bun; mutant fails 4 |
| S4 | done | 2026-10-16 | OpenCode worker updrift-s4-1 (ledger schemaVersion) + coordinator: climbing dispatch/reconcile, worker wrappers dropped (D9) |
| S5 | done | 2026-10-16 | coordinator copy (D9); Orca suite 356/356 bun, node 355 + 1 load flake |
| S6 | done | 2026-10-16 | OpenCode worker updrift-s6-2 + coordinator writer-runner pin; 141/141 node + bun; doctor exit 0 |
| S7 | done | 2026-10-16 | OpenCode worker updrift-s7-1, applied by git apply (D9); regex fix + test; 201/202 node/bun |
| S8 | done | 2026-10-16 | OpenCode worker updrift-s8-2 + coordinator restores (ledger S8 notes); docs-links 0; skill-defaults OK
| S10 | done | 2026-10-16 | opencode-service free + dispatch hook; 38/38 node + bun; live smoke freed PID 40797 |
| S9 | uphill 0% | 2026-10-16 | Release + sync proof — not started |

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

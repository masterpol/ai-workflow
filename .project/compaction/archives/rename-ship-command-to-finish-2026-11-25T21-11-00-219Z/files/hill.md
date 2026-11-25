# Hill chart: rename-ship-command-to-finish

**Initialized**: 2026-11-25

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S0 | done (not verified) | 2026-11-25 | owner chose `ship-pitch`; availability in host built-ins not verified |
| S1 | done | 2026-11-25 | codex rsc-s1-1 collected+released; one shared mapping; re-run Bun and Node |
| S2 | done | 2026-11-25 | claude rsc-s2-1 collected+released; 4 adapters moved, Cursor copy identical |
| S3 | done | 2026-11-25 | opencode rsc-s3-1 collected+released; later amended: --apply removes unmodified old ship files (owner) |
| S4 | done | 2026-11-25 | coordinator: 28+3 files swept; guard test found 4 missed lines |
| C1 | done | 2026-11-25 | doctor list, 2.56.0 changelog, followups; clone suite 2342 pass, 10 skip, 0 fail |

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
2026-11-25: 2 cycles, 0 must-fix open; cycle-2 fixes not re-reviewed. Record `.project/analysis/2026-11-25-rename-ship-command-audit.md`; raw reports `audit-reports/`.

# Hill chart: review-bench-hardening

**Initialized**: 2026-11-25

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S1 | done | 2026-11-26 | codex; coordinator: 49 pass node+bun, 7 marker routes ran nothing, 3 own mutants fail |
| S2 | done | 2026-11-26 | 54 pass node+bun; rows 3-6 rerun by coordinator via CLI |
| S3 | done | 2026-11-26 | opencode (second launch); 63 pass node+bun; rows 7-8 rerun by coordinator; full verifier exit 0 (2,415 pass, 3 skip) |
| S4 | done | 2026-11-26 | codex build; claude review (canary caught); executable-bit fix by coordinator, not re-reviewed |

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

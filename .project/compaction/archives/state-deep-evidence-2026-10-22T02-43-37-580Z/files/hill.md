# Hill chart: state-deep-evidence

**Initialized**: 2026-10-19

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S1 | done | 2026-10-21 | state-graph.mts 237 lines, 20 tests, 6 of 6 mutants killed; merged |
| S2 | done | 2026-10-21 | state-history.mts 259 lines, 18 tests, 5 of 5 mutants killed; merged |
| S3 | done | 2026-10-21 | entryPoints() in state-structure.mts (S5 wires into architecture); allow-list guard test + 2 mutants; 163 state tests pass |
| S4 | done | 2026-10-21 | tokensSection (totals, byModel, flows with slug join and scope divergence); token file read once; 5 tests, 3 of 3 mutants killed |
| S5 | done | 2026-10-21 | assembly, shared graph parse, slug hardening, budgets, schemaVersion contract, skew tests, dataset mapping; 646 tests pass (Node), Bun 137; 5 of 5 mutants killed |
| S6 | cut | 2026-10-21 | LOC gate 1636 > 1240 headroom; architecture.packages ships unavailable; followup state-monorepo-packages due at /ship |
| S7 | done | 2026-10-21 | state-report.md "Deep evidence" section, allow-list line; doc, no-go, validator checks pass; LOC cap gate FAILS (open, owner decision) |
| S8 | done (record) | 2026-10-21 | live matrix run: claude-code 25/34 pass, codex 34/34, OpenCode not-run (provider quota), Cursor not-run; known-bad seeds failed 15/15 for both graders; AI-prompt gate BLOCKED (see live-runs.md) |

## Hill positions reference

- `uphill 0%`: not started
- `uphill 25%`: exploring code, reading constraints
- `uphill 75%`: approach decided, key unknowns resolved
- `over the hill`: about to execute
- `downhill 25%`: implementing
- `downhill 75%`: implemented, verifying exit criteria
- `done`: all exit criteria evidenced

## Stuck-uphill watch

(Filled in automatically when a scope stays at the same uphill position across 3 session updates.)


## Closure — 2026-10-21

Owner-approved local ship v2.39.0. Historical scope positions above remain unchanged. S6 is deferred; S8 is a completed evidence record with accepted failures and unrun vendor cases. The owner accepts the LOC amendment and direct-check verifier fallback. See SHIPPED.md for reconciliation and exact validation results.

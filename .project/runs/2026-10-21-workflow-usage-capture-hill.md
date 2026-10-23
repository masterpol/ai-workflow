# Hill chart: workflow-usage-capture

**Initialized**: 2026-10-19

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| P0 | done | 2026-10-20 | owner accepted documented sanitizer baseline exception; state 63 Node/Bun tests, 21 metrics/report tests and validators pass; log.md has evidence |
| S1 | done | 2026-10-20 | G1 mapping and amended A1 contract approved by owner; eight Claude groups, prompt-id turns, OpenCode wait unavailable, 250 ms budget |
| S2 | done | 2026-10-20 | 12 Node/Bun tests; 8 runtime invariants; 14 mutants killed; all source guards 0; 98.26% line coverage; evidence log.md; approved |
| S3 | done | 2026-10-20 | 94 combined Node tests, 25 Bun tests, 8 invariants, setup READY, 4 mutants killed; approved; log.md evidence |
| S4 | done | 2026-10-20 | 866c68e contains both wiring files; 222 Node pass/1 existing skip, 45 Bun pass; p95 100 ms <=250, 0/60 skips; log.md evidence; approved |
| S5 | done | 2026-10-20 | Node 71 pass/1 existing skip, Bun 72 pass; 6 mutants killed; live doctor 0 failures; setup READY; approved |
| S6 | done | 2026-10-20 | 43 Node / 16 Bun pass; 98% plugin line coverage; lease failures 0/12 before and after; setup READY; approved |
| S7 | done | 2026-10-20 | docs/rollout pass; Bun 2338 pass/3 skip/0 fail; Node only accepted sanitizer baseline; validators/privacy/budget pass; build approved; audit reviewed; v2.38.0 prepared; verifier fallback gate pending |

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


## Final closure — 2026-10-21

The owner explicitly approved the documented package-less verification fallback and closing v2.38.0 with “Approve”. V1 is resolved by that approved exception, not by a wrapper repair: pre-ship-verify.mts still exits 1 because neither package.json nor a Muro verifier exists. The actual repository checks passed: Node 2360 passed / 3 existing skips / 0 failed; Bun 2338 passed / 3 existing skips / 0 failed; release contracts 38 passed; doctor 0 failures; setup READY; graph CLEAN (112 entries, 319 links); privacy marker scan 0 files. The final Node run needs no sanitizer exception. No production source changed after audit.

Release 2.38.0 is shipped locally; all P0/S1–S7 scopes are complete. SHIPPED.md records reconciliation and limits. The status index is compacted; historical pitch, run and audit evidence is preserved. The durable wrapper repair remains in the followups backlog. No tag, push, publication or application rollout is implied. The due cooldown review follows without applying unapproved proposals.

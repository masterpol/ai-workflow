# Hill chart: runtime-test-helpers (archived)

**Initialized**: 2026-10-08  •  **Closed**: 2026-10-08 (shipped)

## Positions

| Scope | Position | Last moved | Notes |
|-------|----------|------------|-------|
| S1 | done | 2026-10-08 | helper module + self-tests; Node 13/13, Bun 13/13 (8 at build, +5 from audit fixes) |
| S2 | done | 2026-10-08 | docs-links pilot; 17/17 both runners, count unchanged |
| S3 | done | 2026-10-08 | graphify pilot; 15/15 both runners, count unchanged |
| S4 | done | 2026-10-08 | orca-apply pilot; 20/20 both runners, count unchanged |

All four scopes reached `done` without a stuck-uphill warning; no scope sat at the same uphill
position across three session updates.

## Notes

- S2-S4 were planned as parallel subagents and ran sequentially: the harness's nested-dispatch
  support was unverified and the refactors were mechanical (see `deviations.md`).
- Audit cycle 1 reopened work on all four scopes' shared surface (`test-helpers.mts`), not on the
  pilot files themselves. Pilot assertion counts were unchanged by the audit.
- The macOS `/var`-alias guard in S4 was found inert during the audit and re-proved with a mutant;
  see `runs/2026-10-08-runtime-test-helpers.md`.
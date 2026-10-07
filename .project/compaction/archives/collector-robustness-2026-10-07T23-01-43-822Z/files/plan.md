# Plan: Collector robustness

**Pitch**: pitch.md  •  **Appetite**: small-batch  •  **Hill**: hill.md

**Approval**: User approved this plan with “Approve all” on 2026-09-26.

## Scope

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|---|---|---|---:|---|---|---|---|
| S1 | Make lock and event identity robust | `token-consumption.js`, `token-consumption.test.js` | ≤400 | — | — | no — lock and dedup semantics interact | — |

### S1 — Make lock and event identity robust

- Reclaim only stale locks after a fresh comparison that cannot delete a replacement lock.
- Bound lock age, handle live/reused/permission-denied PIDs, and preserve hook best-effort behavior.
- Use structured identity keys without changing readability of legacy snapshots.
- `node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/opencode-plugin.test.js` exits 0.
- Add tests for live old locks, reused-PID-equivalent old locks, replacement-lock safety, and colon-collision identities.
- Mutation check: remove stale-age or structured-identity guard; focused test fails.

## Impact analysis

Direct: 1 implementation file, 1 test. `token-report.test.js`, OpenCode plugin tests, and
`skill-defaults.test.js` consume collector state or exports. No new files or boundary changes. Risk: medium.

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|---|---|---|---|
| Legacy identity keys exist in snapshots | S1 | no | Keep stored records readable; test v1/v2 fixtures and replacement behavior. |

## Parallel dispatch plan

Run S1 sequentially. Correct lock ownership and duplicate detection require one coherent state model.

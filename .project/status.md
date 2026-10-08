# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| fix-workflow-runner-env | done | Build verified; awaiting approval for audit | bug-fix | 2026-10-08 |
| orca-vendor-reconcile-integration | — | shaped; reconcile-core shipped, ready to bet | small-batch | 2026-10-08 |
| orca-vendor-orchestration | — | foundation + dispatch-core + reconcile-core shipped; integration pending | decomposed: foundation + dispatch + reconcile + integration | 2026-10-07 |

## Parked pitches
_none_

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| runtime-test-helpers | 2026-10-08 | Shared test helpers (`createTestDeps`, `tempFixture`, `runScript`, `memoryFs`, `captureIo`) plus 3 pilots migrated off direct `node:*` imports; `FsDeps.symlinkSync` added; Node/Bun 65/65 on touched files; audit 1 cycle, 3 must-fix fixed (2 were self-inflicted: vacuous macOS alias guard, wrong `memoryFs` symlink semantics). See `runs/2026-10-08-runtime-test-helpers.md`. |
| workflow-usage-metrics | 2026-10-08 | Useful project/pitch/vendor/skill/phase/agent metrics core; v2.16.0; Node/Bun 156/156; audit 3 cycles; native capture/adoption pending. See `runs/2026-10-08-workflow-usage-metrics.md`. |
| orca-vendor-reconcile | 2026-10-08 | Orca reconcile core (hardened diff admission, check-first apply with touched-path rollback, hash-verified evidence, positive-proof cleanup, orchestration) behind `AI_WORKFLOW_ORCA_MULTI_AGENT=true`; v2.15.0-2.15.1; Node 982, Bun 966; audit 3 cycles (13 must-fix fixed); accepted LOC overrun. See `runs/2026-10-08-orca-vendor-reconcile.md`. |
| orca-vendor-dispatch | 2026-10-08 | Orca dispatch core (launch gate, ownership ledger, supervised dispatch) behind `AI_WORKFLOW_ORCA_MULTI_AGENT=true`; v2.14.0-2.14.1; Node 846, Bun 817 pass; audit 2 cycles (4+1 must-fix fixed). Live proof Claude only. See `runs/2026-10-08-orca-vendor-dispatch.md`. |
| ts-runtime-injection | 2026-10-08 | Every workflow script, hook and the OpenCode plugin is direct `.mts` on injected `RuntimeDeps` (Node or Bun via `AI_WORKFLOW_RUNNER`); no `.js` shims; `runtime/migrate.mts` upgrades old installs; v2.13.0; Node 762, Bun 731 pass; audit 3 must-fix (symlink escapes) fixed. See `runs/2026-10-08-ts-runtime-injection.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four Orca foundation followups; prior history retained)

## /cooldown due in: 4 ships
Review completed 2026-10-08 (`runs/cooldown-2026-10-08.md`); rule/backlog proposals remain pending per-item approval. Ships since: runtime-test-helpers.

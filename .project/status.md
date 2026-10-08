# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|
| workflow-usage-metrics | S1 done; S2 uphill 75%; S3 pending | S1 approved; building useful usage reports | big-batch (core; capture/adoption separate) | 2026-10-08 |
| runtime-test-helpers | done (4 scopes) | built; awaiting /audit | small-batch | 2026-10-08 |
| orca-vendor-reconcile-integration | — | shaped; reconcile-core shipped, ready to bet | small-batch | 2026-10-08 |
| orca-vendor-orchestration | — | foundation + dispatch-core + reconcile-core shipped; integration pending | decomposed: foundation + dispatch | 2026-10-07 |

## Parked pitches
_none_

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| orca-vendor-reconcile | 2026-10-08 | Orca reconcile core (hardened diff admission, check-first apply with touched-path rollback, hash-verified evidence, positive-proof cleanup, orchestration) behind `AI_WORKFLOW_ORCA_MULTI_AGENT=true`; v2.15.0-2.15.1; Node 982, Bun 966; audit 3 cycles (13 must-fix fixed); accepted LOC overrun. See `runs/2026-10-08-orca-vendor-reconcile.md`. |
| orca-vendor-dispatch | 2026-10-08 | Orca dispatch core (launch gate, ownership ledger, supervised dispatch) behind `AI_WORKFLOW_ORCA_MULTI_AGENT=true`; v2.14.0-2.14.1; Node 846, Bun 817 pass; audit 2 cycles (4+1 must-fix fixed). Live proof Claude only. See `runs/2026-10-08-orca-vendor-dispatch.md`. |
| ts-runtime-injection | 2026-10-08 | Every workflow script, hook and the OpenCode plugin is direct `.mts` on injected `RuntimeDeps` (Node or Bun via `AI_WORKFLOW_RUNNER`); no `.js` shims; `runtime/migrate.mts` upgrades old installs; v2.13.0; Node 762, Bun 731 pass; audit 3 must-fix (symlink escapes) fixed. See `runs/2026-10-08-ts-runtime-injection.md`. |
| readme-split | 2026-10-08 | README split into a 64-line index + 11 topic docs in `ai-framework/docs/`; `docs-links.js` link checker; doctor and bundle-sync retargeted; v2.11.0; 514 tests passed; audit 1 cycle, 0 must-fix. See `runs/2026-10-08-readme-split.md`. |
| orca-vendor-foundation | 2026-10-07 | Opt-in JSON policy, bounded read-only preflight, static doctor; v2.10.0; 109 final tests passed; external audit 2 cycles. Dispatch disabled. See `runs/2026-10-07-orca-vendor-foundation.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four Orca foundation followups; prior history retained)

## /cooldown due in: 1 ship
Review completed 2026-10-07; two followup bundles remain proposals. See `runs/cooldown-2026-10-07.md`.

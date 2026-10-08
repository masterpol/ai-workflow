# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
_none_


## Parked pitches
_none_

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| fix-orca-dispatch-resume-gate | 2026-10-08 | `dispatchScope()` re-checks the switch and launch gate before `resumeExisting()`, so a replay under a disabled policy exits 3 instead of a success-shaped 0; `status` accepts repeated `--vendor`; Node 1037 pass / 0 fail, Bun 66/66 on touched files; audit 1 cycle, 0 must-fix. See `runs/2026-10-08-fix-orca-dispatch-resume-gate.md`. |
| orca-vendor-reconcile-integration | 2026-10-08 | Thin CLI `orca-run.mts`, executable grader, inert audit/ship/build wiring behind `AI_WORKFLOW_ORCA_MULTI_AGENT=true`; closes the `orca-vendor-orchestration` umbrella; v2.17.0; Node 1045 pass; audit 1 cycle, 0 must-fix. Live smoke: Claude only. See `runs/2026-10-08-orca-vendor-reconcile-integration.md`. |
| fix-workflow-runner-env | 2026-10-08 | `AI_WORKFLOW_RUNNER` honored at every entry and child boundary via `runtime/entry.mts`; inline hooks became `workflow-notice.mts`; v2.16.2; Bun 985/985; audit 1 cycle, 0 must-fix (not independent). See `runs/2026-10-08-fix-workflow-runner-env.md`. |
| runtime-test-helpers | 2026-10-08 | Shared test helpers (`createTestDeps`, `tempFixture`, `runScript`, `memoryFs`, `captureIo`) plus 3 pilots migrated off direct `node:*` imports; `FsDeps.symlinkSync` added; Node/Bun 65/65 on touched files; audit 1 cycle, 3 must-fix fixed (2 were self-inflicted: vacuous macOS alias guard, wrong `memoryFs` symlink semantics). See `runs/2026-10-08-runtime-test-helpers.md`. |
| workflow-usage-metrics | 2026-10-08 | Useful project/pitch/vendor/skill/phase/agent metrics core; v2.16.0; Node/Bun 156/156; audit 3 cycles; native capture/adoption pending. See `runs/2026-10-08-workflow-usage-metrics.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four Orca foundation followups; prior history retained)

## /cooldown due in: 4 ships
Last review 2026-10-08 (`runs/cooldown-2026-10-08.md` and `runs/cooldown-2026-10-08-manual.md`); all 10 per-item proposals approved and applied to `ai-framework/rules/{testing,security,coding-standards}.md`, `ai-framework/workflow/phases/3-audit.md`, `.claude/agents/{security-reviewer,code-reviewer}.md`. Five candidate bundles remain pending shape/bet. Ships since last cooldown: runtime-test-helpers, fix-workflow-runner-env, orca-vendor-reconcile-integration, fix-orca-dispatch-resume-gate.

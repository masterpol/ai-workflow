# Status

> Index only — hard cap **100 lines**. Detail lives per-pitch in `pitches/{slug}/`; history in `runs/`.

## Active pitches
_none_

## Parked pitches
_none_

## Recent ships (last 5)
| Pitch | Shipped | Notes |
|-------|---------|-------|
| runner-aware-runtime-boundary-validator | 2026-10-08 | `validateRuntimeImports` (`runtime/validate.mts`), a workflow-doctor `Runtime boundary` check (production and unparsed sources fail, 43 test files warn as one line) and a stricter invariants test; v2.21.0; Node 1238/1239, Bun 1229/1230; audit 2 cycles via Codex/OpenCode workers, 9 valid-JS evasions closed. See `runs/2026-10-08-runner-aware-runtime-boundary-validator.md`. |
| orca-auto-start-all-phases | 2026-10-08 | Orca decision runs automatically on the 12 workflow phases when the switch is true (`decideStart`, `orca-run start`, Claude hook on `PreToolUse(Skill)` + `UserPromptExpansion`); blocked means stop and ask, `orca=normal` bypasses one call; v2.20.0; Node 1148/1149, Bun 1139/1140; audit 2 cycles, built and audited through real Codex/OpenCode workers. See `runs/2026-10-08-orca-auto-start-all-phases.md`. |
| state-multipage-report | 2026-10-08 | Multipage `/state` report (index, structure, skills, metrics, knowledge, pitches): project-type folder diagram with decisions, base vs project skills, links to graph and metrics; v2.19.1; Node 1094/1095, Bun 1085/1086; audit 3 cycles (2 via real Orca workers). See `runs/2026-10-08-state-multipage-report.md`. |
| fix-orca-dispatch-resume-gate | 2026-10-08 | `dispatchScope()` re-checks the switch and launch gate before `resumeExisting()`, so a replay under a disabled policy exits 3 instead of a success-shaped 0; `status` accepts repeated `--vendor`; Node 1037 pass / 0 fail, Bun 66/66 on touched files; audit 1 cycle, 0 must-fix. See `runs/2026-10-08-fix-orca-dispatch-resume-gate.md`. |
| orca-vendor-reconcile-integration | 2026-10-08 | Thin CLI `orca-run.mts`, executable grader, inert audit/ship/build wiring behind `AI_WORKFLOW_ORCA_MULTI_AGENT=true`; closes the `orca-vendor-orchestration` umbrella; v2.17.0; Node 1045 pass; audit 1 cycle, 0 must-fix. Live smoke: Claude only. See `runs/2026-10-08-orca-vendor-reconcile-integration.md`. |

## Open rabbit holes across active pitches
- Legacy source access, content and media totals, and school-site ownership.
- Identity, privacy, data residency, infrastructure, and operational vendor decisions.
- Canonical paths and redirect treatment for current school domains.

## Followups backlog
→ `.project/pitches/_followups.md` (includes four Orca foundation followups; prior history retained)

## /cooldown due in: 1 ship
Last review 2026-10-08 (`runs/cooldown-2026-10-08.md` and `runs/cooldown-2026-10-08-manual.md`); all 10 per-item proposals approved and applied to `ai-framework/rules/{testing,security,coding-standards}.md`, `ai-framework/workflow/phases/3-audit.md`, `.claude/agents/{security-reviewer,code-reviewer}.md`. Five candidate bundles remain pending shape/bet. Ships since last cooldown: runtime-test-helpers, fix-workflow-runner-env, orca-vendor-reconcile-integration, fix-orca-dispatch-resume-gate, state-multipage-report, orca-auto-start-all-phases, runner-aware-runtime-boundary-validator.

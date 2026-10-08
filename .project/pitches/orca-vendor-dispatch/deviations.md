# Deviations: orca-vendor-dispatch

| ID | Scope | Plan said | Reality | Disposition |
|----|-------|-----------|---------|-------------|
| D1 | S0 | all three vendors observed live | Claude fully observed; Codex blocked by a trust prompt then out of funds; OpenCode blocked by a port held by the user's own service (killed on request) then out of funds; peer messaging unobserved | Accepted by the user; completion and messaging are live-smoke criteria |
| D2 | S1 | require session match | external coordinators have no `caller.orcaSessionId`; the gate accepts a probe that proved the exact version without it | Accepted; coupled to preflight check order and covered by version-drift tests |
| D3 | S1 | env-derived default-deny of `ORCA_*` | would deny a legitimate coordinator in an Orca terminal; guard is the brief flag plus guessed `WORKER_ENV_MARKERS` (unverified) | Accepted; replace markers once the real worker env is observed |
| D4 | S3 | n/a | Orchestrator found a real bug: `launchWorker` returned only `stderr` on failure, hiding Orca's stdout receipt (`failedStage`, `residualResources`) so residual resources would have been retried | Fixed in `orca-launch-gate.mts` (returns `stdout`); covered by dispatch tests |
| D5 | S3 | ledger `createdAt` as a timestamp string | ledger requires an integer; dispatch stores `Math.trunc(clock.now())` | Fixed |
| D6 | S4 | four build mirrors | `.agents` and `.opencode` build files are 6-8 line loaders that point at `.claude/skills/build/SKILL.md`; only the canonical file and its identical `.cursor` copy changed (2 files, not 4) | Accepted |
| D7 | gate | whole suite green | One run of the full Node suite showed `token-consumption.test.mts` "CLI records a Claude skill-use payload" failing (1.1 s timing under load); 3 isolated reruns 63/63, an earlier full run 817/817, Bun 786 pass 0 fail | Logged as a flake; not isolated further |

| D8 | gate | Orca used when policy opts in | User requirement mid-build: Orca is used only when `AI_WORKFLOW_ORCA_MULTI_AGENT=true` (environment or project `.env`, environment wins). Enforced first in the launch gate, `dispatchScope`, `dispatchWithRetries` and `orca-preflight --probe`; `.env.example` ships `false` | Implemented with tests (gate, dispatch, preflight) and docs |

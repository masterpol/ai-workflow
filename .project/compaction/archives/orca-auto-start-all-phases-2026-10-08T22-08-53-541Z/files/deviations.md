# Deviations: orca-auto-start-all-phases

- 2026-10-08 S3: the hook keeps `runDirect` (runtime/invariants.test.mts requires one direct-entry call per executable main), so the plan's 'plain Node, no re-exec' for R14 is only partly met: with `AI_WORKFLOW_RUNNER=bun` and no Bun on PATH the hook exits 1 (non-blocking) even when the switch is off. Tested and documented; the skill call still proceeds.
- 2026-10-08 S2/S4: `orca-run.mts start` requires `--root`; the plan's example omitted it.
- 2026-10-08 S5: the worker edited only the marker blocks; the coordinator finished build's second Orca section.
- 2026-10-08 plan wording: S1 evaluates the gate once with the coordinator vendor and then checks worker membership/presence, not one `evaluateLaunch` per worker (confirmed against dispatchScope).

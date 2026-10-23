# Cross-pitch projection: token-time-report

Perspective: cross-pitch-projector (pre-bet). Target: `.project/pitches/token-time-report/pitch.md`.
Inputs read: `pitch.md`, `shaping-evidence.md`, `.claude/agents/cross-pitch-projector.md`, `.project/status.md`,
`.project/pitches/workflow-v3-rollout/{pitch.md,readiness.md}`, and the current source for the metrics lease
(`ai-framework/hooks/scripts/token-consumption.mts`, `metrics-lock.mts`) and `VERSION`.

Active pitches per `.project/status.md`: `workflow-v3-rollout` (shaped, small-batch) and `token-time-report` itself.
Other pitch directories (`token-attribution`, `state-report-redesign`, `state-fragment-sanitizer`,
`workflow-usage-state`, `workflow-usage-capture`) all have `SHIPPED.md` and are not active, so they are not projected against.
`restore-vendor-adapters` is parked and out of scope.

Note on confidence: `workflow-v3-rollout` has no `plan.md`, so its file set is taken from `readiness.md` and the
pitch text, not from a scope list. Treat its projection as weaker than an authoritative plan.

## Findings

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| X1 | cross-pitch-projector | medium | projected-adjacent | `workflow-v3-rollout` ships the whole `ai-framework/` bundle to LAH, RN and climbing through `bundle-sync`, and it names base `3.0.0` as the version it rolls out. Any `ai-framework/scripts/`, `ai-framework/integrations/workflow-metrics.md`, `VERSION` or `CHANGELOG.md` change made by this pitch is carried to those repos only at the next sync. Not a same-file edit today, but it decides which bundle version v3 freezes. Decide before the v3 base snapshot whether this pitch lands first or waits for a later rollout. The pitch's "propagation through normal rollout" line is correct but should be stated as a sequencing choice, not a default. |
| X2 | cross-pitch-projector | medium | projected-adjacent (shared module, unprojected) | The pitch says the report reads token v3 "through guarded readers under one metrics lease". That lease is `withLease` from `ai-framework/hooks/scripts/metrics-lock.mts`, used by `token-consumption.mts`. Neither file is in the 9-file projection. `shaping-evidence.md` says "Plan must check whether guarded reader reuse requires another module", so the file budget is open. Adding these two files brings the count to 10–11 against the 15-file cap, and they are hook code, not report code. `workflow-v3-rollout` readiness.md lists "token-consumption tests intermittently see the metrics lock held (1 in ~12 isolated runs)" as an open flake. A new lease holder added here would sit on the same lock that flakes. Suggestion: add both files to the projection, and make the lease-flake root cause a stated prerequisite or a named risk before the report scope takes the lease. |
| X3 | cross-pitch-projector | low | projected-adjacent (release files) | `VERSION` is `2.40.0`. This pitch will add a minor bump plus `CHANGELOG.md` and `VERSION` edits. `workflow-v3-rollout` is written around a base `3.0.0` cut. Two pitches editing the same release files in the same window produce merge conflicts and version-number drift. Suggestion: take the version and CHANGELOG entry at ship time, after the v3 base version is fixed, and say so in `plan.md`. |

## Checked and not overlapping

- `state-pages.mts` and `state-html.test.mts` (this pitch's `/state` link change): `workflow-v3-rollout` has no reference to `/state`, state pages, or state HTML. Disjoint.
- `flow-report.mts`, `flow-render.mts` and their tests: new files, no current occupant in the v3 pitch. Disjoint.
- `.project/metrics/`: `token-time-report-recovery/` is this pitch's own evidence. v3 touches `.project/workflow-doctor.json` and `ai-workflow.toon` in each receiving project, not the base metrics directory. Disjoint.
- `.project/metrics/.token-consumption.lock`: `ai-framework/docs/token-consumption.md` describes a migration step that deletes this lock file. This pitch must not depend on or remove it. Acknowledged, no shared edit.

## Summary

No projected pure file overlap between the two active pitches. The real contention is sequencing: the base bundle version and
its shared release files (X1, X3), plus an unprojected shared lease module on a lock that already flakes (X2). Resolve X2 in the
pitch's file budget before `/plan`, and decide X1 at the bet. Ground truth still belongs to `cross-pitch-conflict-checker` at `/audit`.

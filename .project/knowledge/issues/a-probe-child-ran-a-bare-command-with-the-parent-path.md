---
id: a-probe-child-ran-a-bare-command-with-the-parent-path
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [security, subprocess, path, orchestration, gates]
related: [opt-in-before-runtime-discovery, a-gate-spawns-exactly-what-it-probed, git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded, orca-workers-differ-from-the-coordinator-environment]
source: orca-auto-start-all-phases
severity: high
resolved: true
---
# Issue: the new start check validated an absolute `orca` but spawned the bare name with the parent's full PATH

## Summary
`decideStart` resolved `orca` against absolute PATH entries only, then ran the bare name with the original PATH. The child resolved it through relative entries, so a project-local `./orca` (with `.` on PATH) returned a forged `worker-list` and the check answered `worker`, which skips the readiness gate. The existing pattern [[opt-in-before-runtime-discovery]] already said "use the same absolute-entry PATH policy for presence checks and child execution"; the new code reproduced the original bug. Found by the audit's security worker and reproduced by the coordinator (forged `./orca` -> `state: worker`).

## Fix / rule
Spawn the absolute realpath that the presence check returned, with the allowlisted worker env (`buildWorkerEnv`: absolute PATH entries only). Test with a forged executable in the project root, in a relative PATH entry and with an empty PATH entry. Related: [[a-gate-spawns-exactly-what-it-probed]].

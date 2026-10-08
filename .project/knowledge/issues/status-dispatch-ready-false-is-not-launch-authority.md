---
id: status-dispatch-ready-false-is-not-launch-authority
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [orca, orchestration, gates, misread-signal]
related: [a-gate-spawns-exactly-what-it-probed, opt-in-before-runtime-discovery, an-idempotent-replay-path-returned-success-without-re-checking-the-gate]
source: state-multipage-report
severity: high
resolved: true
---
# Issue: `dispatchReady: false` from `orca-run status` was read as "Orca cannot launch", so whole phases ran without Orca

## Summary
`orca-run.mts status` (the foundation preflight) reports `dispatchReady: false` by design and `caller-unverified` when
`ORCA_AGENT_SESSION_ID` is unset. The launch authority is `evaluateLaunch` in `orca-launch-gate.mts`, which accepts
`caller-unverified` for an external coordinator. The build session read the status flag, blamed "not in an Orca terminal",
and ran S1, S2 and the first audit cycle on ordinary subagents without asking. The gate returned `allowed: true` for codex
and opencode the whole time.

## Symptoms
- A project with the switch on and a valid policy ran every phase with no Orca worker.
- The explanation given to the user was wrong twice (terminal, then missing session id).

## Fix / rule
- Decide readiness from `evaluateLaunch` per worker, never from `status.dispatchReady` or `ORCA_AGENT_SESSION_ID`.
- When the switch is on and the gate denies, stop and ask; do not fall back silently.
- Related: [[a-gate-spawns-exactly-what-it-probed]]. Follow-up pitch: `orca-auto-start-all-phases`.

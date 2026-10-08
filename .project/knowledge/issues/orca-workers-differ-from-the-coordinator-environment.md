---
id: orca-workers-differ-from-the-coordinator-environment
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [orca, orchestration, workers, environment, smoke-test]
related: [status-dispatch-ready-false-is-not-launch-authority, a-gate-spawns-exactly-what-it-probed, one-boundary-selects-the-child-runner]
source: state-multipage-report
severity: medium
resolved: true
---
# Issue: a worker's environment differs from the coordinator's, and the first live smoke tests failed for that reason

## Summary
The first live runs of the dispatch core (Orca 1.4.222, Claude coordinating Codex and OpenCode) each failed for a cause that
was invisible from the coordinator's shell.

## What failed, and what fixed it
- **Codex could not send `worker_done`.** Its shell resolved `orca` to `/usr/local/bin/orca`, a root-owned, unreadable stale
  symlink ("Unable to determine Orca.app path"); the coordinator's PATH found the working app binary first. Fix: repoint the
  symlink. Check what a worker will actually run, with the worker's allowlisted env.
- **OpenCode failed at `agent_readiness`** ("managed service port already in use"). The running OpenCode server predated an
  upgrade (its executable inode differed from the file on disk), so the new CLI could not adopt it. Fix: stop the stale
  server and let the current binary start one.
- **`collect` refused a report** (`invalid-files`) because the worker listed a report file outside the project root.
  Read-only reviewers should put findings in the `worker_done` body and pass no files list.
- **A done worker keeps its slot.** An idle worker terminal stays `live` until `worker-release` closes it; only then does
  Orca report exited+settled and the ledger can move to `settled` through the library. `worker-stop` on an already-settled
  or user-owned terminal does nothing.
- **Workers share the coordinator's checkout** (`worktree reused`). Read-only is enforced by prompt, a scratch copy and
  `review-bench guard`, not by isolation; a worker that edits files writes into the live tree.

## Rule
Run a live smoke per vendor before relying on a worker; record the worker-side `orca` and server state, not only the
coordinator's. Related: [[status-dispatch-ready-false-is-not-launch-authority]].

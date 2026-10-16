# Checkpoint: upstream-project-drift

**Saved**: 2026-10-16 • **Phase**: build • **Branch**: `feat/upstream-project-drift` • **Orca Run**: `run_3bd0c1193ed8`

## Where we are
- Done and committed: S0, S3 (`baa8d85`, pulled forward, D6), S1 (`f36db13`), S8 (`ea5e5c0`), S6 (`cadb782`),
  S2 (`c65f55a`, D7). Plan + S10 added (`1bc5750`, D8). Interim pin `5a6b656` (D5).
- Running OpenCode workers: S7 `updrift-s7-1` (`ctx_57e5cdcf6a82`), S4 `updrift-s4-1` (`ctx_6fc208a70b1d`).
- S10 in progress in the coordinator tree, uncommitted: `opencode-service.mts` + test (8/8 node + bun),
  `/build` skill bullet (+ Cursor mirror), `orca-vendors.md` section. Still to do: `orca-run.mts` dispatch call +
  tests, after S4 is reconciled (S4 owns `orca-run.mts`).
- Runner: bun (`ai_workflow_env.json`). GAUNTLET: move that file aside first.

## Rules learned this session
- Reconcile every worker of a wave before committing any scope (HEAD move → `apply:baseline-moved`). Recovery:
  fast-forward the worker worktree to HEAD when the files are disjoint.
- Before the first OpenCode worker: free OpenCode's port (owner's standing rule; S10 automates it).
- Codex workers are blocked by an interactive update prompt (0.162.1 → 0.163.0); three retained terminals
  (`updrift-s1-3`, `updrift-s6-1`, `updrift-s8-1`) are waiting at it. The owner must update or skip.

## Next
1. Collect S7 + S4 `worker_done`, review diffs, reconcile both (humanConfirmed for scripts), then commit S7, S4.
2. S5 via a worker (after S4). Then finish S10 wiring, then S9 (2.23.0, GAUNTLETs, sync proof).
3. Owner decisions still open: 5 (pre-ship-verify merge, done as planned in S6), 6 (bun timeouts), 7/8 (merge/PR).

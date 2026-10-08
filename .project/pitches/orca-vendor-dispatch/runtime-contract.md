# Installed Orca runtime contract (S0)

Date: 2026-10-08. Orca 1.4.222, app-bundled launcher `/Applications/Orca.app/Contents/Resources/bin/orca` (selected once, with user approval; `/usr/local/bin/orca` was not used). Fixture: scratch git repo outside this checkout (3 modules `a.mjs`, `b.mjs`, `c.mjs`, baseline `dd75608`), registered with `orca repo add` (Orca has no `repo remove`; the user removes the `orca-fixture` project by hand). Run `run_e1844e888149`. No source edits, commits or publications in this repository.

## Results per vendor

| Vendor | Launch | Outcome | Evidence |
|---|---|---|---|
| claude | observed: `worker-start --worktree new-top-level --repo id:<id> --agent claude` returned `stage: input_accepted`, created worktree `~/orca/workspaces/orca-fixture/smoke-a` and an agent terminal | observed: `worker_done` succeeded in ~8 s, `filesModified: ["a.mjs"]`; worker also fixed an invalid `: string` annotation I had put in a `.mjs` fixture (fixture bug, mine) | Coordinator re-measured: `git status` in `smoke-a` shows only `a.mjs` modified; `node` prints `a-done`; fixture `main` unchanged |
| codex | observed: worktree and terminal created, then `failedStage: agent_readiness` | failed, no work done: `lastFailure: "Agent startup blocked: agent-trust-workspace"`. Codex waits on an interactive "Trust this folder?" prompt and would persist the decision for the repo root. Not answered on the user's behalf | `worker-show` / `worker-read` tail of the terminal |
| opencode | observed: worktree and terminal created, then `failedStage: agent_readiness` | failed, no work done: `lastFailure: "timeout"`; terminal shows `Failed to start server. Is port 49374 in use?` (environmental) | `worker-read` tail |

## Contract facts observed

- `worker-start` exit non-zero ⇒ JSON has `failedStage`, `effects`, `residualResources`; the worktree and terminal remain after a failed launch (cleanup is explicit).
- Completion arrives only as a `worker_done` message: `type`, `payload` JSON with `taskId`, `dispatchId`, `outcome` (`succeeded`|`failed`), `filesModified`. Launch return (`input_accepted`) is not completion.
- `check` replays a delivery (`deliveryId`) until `--ack`; ack returned `acknowledged`.
- `worker-list` rows carry `projection.stage`, `outcome`, `liveness` (`live`/`unverifiable` with `reason`), `nextAction`; failed launches show `liveness.unverifiable` / `missing_status`.
- `worker-release` on the succeeded worker returned `state: retained, reason: user_takeover, processAction: none`: release is not guaranteed to free the terminal when a human touched it.
- `orca status` outside an Orca terminal has no `caller` block, so `caller.orcaSessionId` (used by the foundation preflight) is absent for an external coordinator.

## Not observed

- Run-scoped peer messaging with receipt (no worker pair reached a state to exchange messages).
- Codex and OpenCode completion, settlement and isolation.
- Rate-limit behaviour and replay after restart.

## Gate verdict

Partially met. Claude: launch, completion, settlement and isolation observed. Codex needs a human workspace-trust decision before it can run unattended; OpenCode hit a local port conflict. Dispatch must therefore treat `agent_readiness` failures as expected, recoverable-by-human outcomes (never auto-answer trust prompts, never relaunch duplicates), and S1-S3 can be built against these observed shapes. Peer messaging stays unverified and is a live-smoke criterion.

## Residual resources (left in place, owner: user)

Worktrees `smoke-a|b|c` under `~/orca/workspaces/orca-fixture/`, the Codex terminal waiting at the trust prompt, the OpenCode terminal, the retained claude terminal, and the `orca-fixture` project.

## Addendum — retries (same day)

- Codex: after the user trusted the folder in Orca's UI (`trust_level = "trusted"` is now in `~/.codex/config.toml` for `smoke-b`), `worker-start --task <id> --retry-of <failed dispatch> --worktree path:<existing> --agent codex` reached `input_accepted` and the worker went `working`/`live`. The user then reported the Codex account has no tokens, so Codex completion stays unobserved. Retry shape observed: a new dispatch id, an existing worktree reused, a fresh agent terminal.
- OpenCode: retry failed again at `agent_readiness`. The terminal says `Managed service port 49374 on 127.0.0.1 is already in use by another process. Configure another port with 'opencode service set port <port>'`. The holder is the user's own `opencode serve --service` (PID 44391, running about 68 minutes), so the OpenCode CLI cannot start its managed service while an existing one holds the port. Not touched; fixing it means restarting that service or changing the port, which is the user's call.

## Addendum 2 — closing S0 (user decision to continue)

- At the user's instruction the stale `opencode serve --service` (PID 44391) was killed; the retry then reached `input_accepted` (`ctx_...` for `smoke-c`), proving the port conflict was the only launch blocker. The user then reported that OpenCode (like Codex) has no funds, so neither produced work: `b.mjs` and `c.mjs` are unchanged in their worktrees.
- Final S0 state: **Claude: launch, completion, settlement, isolation observed. Codex and OpenCode: launch observed (after human-recoverable blockers), completion unobserved (no funds). Peer messaging: unobserved.** Treated as partial; completion and peer messaging remain live-smoke criteria for S3/S4.
- Model names: the repo references only `opencode-go/kimi-k2.7-code` (14 places); there is no `kimi-k3` anywhere. The live OpenCode catalog could not be listed (`opencode models` printed nothing), so existence of the model in the provider catalog is unverified.

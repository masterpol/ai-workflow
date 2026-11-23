# Orca live receipts: what three real launches showed (2026-11-23)

Durable copy of the evidence file of the shipped pitch `orca-api-currency-and-opencode2` (S3, S3b and S3c, each separately authorized by the owner). Observations on Orca 1.4.271 with OpenCode 2.2.6; raw receipts were kept in git-ignored local data and are not reproduced here.

---


Everything below was observed on Orca 1.4.271 with OpenCode 2.2.6 (`/opt/homebrew/bin/opencode`; there is no `opencode2` binary). Raw receipts: `.project/metrics/orca-inputs/s3-bad-agent.json` and `s3-opencode2.json` (git-ignored local data).

Preparation: OpenCode's managed service (port 49374, version 2.2.6, same as the CLI, owned by no worker of ours) was stopped with `opencode service stop` under the standing instruction; the port was confirmed free before launching.

## 1. Refusal for an invalid agent id (`--agent not-a-real-agent`)
- Exit 1. `{"ok":false,"error":{"code":"agent_unconfigured","message":"…Orchestration mutation request ID: <uuid>.","data":{"orchestrationRequestId":"<uuid>","originalCommand":[…]}}}`.
- **The request id is carried in `error.data.orchestrationRequestId`** (a plain UUID, not `req_…`), and in the message text.
- No `effects`, no `residualResources`, no `failedStage`: under our proof rule this is **not** positive proof of a clean failure.
- Worker count was 8 before and after (observed, not proof of no task).
- `request-show --request <uuid>` for it: `state: absent` ("It never reached this Orca runtime, failed before recording anything, or its receipt was pruned. Absent is not proof that nothing happened."). So a refused start is invisible to `request-show` and cannot be settled that way.

## 2. Real launch with `--agent opencode2`
- Exit 1. `{"ok":false,"result":{"dispatchId":"ctx_…","taskId":"task_…","runId":"run_07adc69ad9b4","state":"failed","agent":"opencode2","mode":"terminal","terminal":"term_…","failedStage":"agent_readiness","lastError":"…zsh: command not found: opencode2","residualResources":["terminal term_…"],"next":"orca orchestration worker-release --dispatch ctx_…"}}`.
- **`opencode2` is an agent alias whose command is `opencode2`; it does not exist on this machine, so the launch failed at `agent_readiness`.** The installed OpenCode 2.2.6 is the `opencode` binary.
- This failure carries `failedStage` and a non-empty `residualResources` (a terminal and a task were created), so under our rules it is unproven and not retryable, and the **fallback to `opencode` would never fire** here. A later Orca `escalation` mail ("Worker lost without reporting", `stopReason: lost`) confirmed the dispatch closed as failed and named the terminal left behind.
- This failure receipt does **not** carry a request id (the failed `result` envelope has dispatch, task and run ids only).
- Left behind, by Orca's report: task `task_5948657d826a`, terminal `term_0fc87fed-5b1c-4fc3-827b-13c7929b2402`, dispatch `ctx_7938e95c1a1c` (state failed, terminal reclaimable). Not released: cleanup is the owner's choice (`orca orchestration worker-release --dispatch ctx_7938e95c1a1c`).

## 3. Which ids this host can launch
`orca agent installed --json` (read-only) returns `claude`, `claude-agent-teams`, `codex`, `opencode`. `opencode2` is not installed. Orca's `worker-start --help` lists `opencode2` as a known id "enabled on the worker server", so the id exists in Orca but only works where an `opencode2` command is installed.

## What this settles
| Open question | Answer |
|---|---|
| Where does a caller obtain the request id? | In **refusal envelopes** (`error.data.orchestrationRequestId`); **not** in the failed-start `result` envelope. Whether a *successful* start receipt carries one is **not observed** (no successful launch yet). |
| Is `opencode2` right for OpenCode 2.x? | **No, not on this machine.** It is an alias for a different command. OpenCode 2.2.6 here is launched by `opencode`. |
| Is the refusal for a bad agent distinguishable and safe to fall back on? | The refusal (`agent_unconfigured`) has no proof fields, and the real `opencode2` failure left resources behind, so neither is retryable by our proof rule. |
| Does `request-show` settle a refused start? | No: `absent`. |
| Port | Freed before launch; the `opencode2` failure never reached the server, so the port question is still **untested** for a launch that starts OpenCode. |

## Addendum: request-id probe (2026-11-23)
`worker-start --agent not-a-real-agent --full --json` (refusal only, nothing created): the envelope is `{id, ok, error, _meta}`.
- The envelope `id` is **not** the request id: it differs from `error.data.orchestrationRequestId` (they are two different UUIDs). Treat the envelope id as a per-call message id.
- `request-show` on the refusal's `orchestrationRequestId` is `absent`.
- Orca offers no flag to supply your own request id (only `--retry-request <id>` to reissue an earlier one).
- Still **unobserved**: whether a *successful* start's receipt carries a request id, and what a timed-out start returns. Settling a lost response through `request-show` / `--retry-request` therefore has no observed id to work with.

## S3b: successful launch with `--agent opencode --full` (2026-11-23, owner-authorized)
Port 49374 was free (nothing listening; `opencode service stop` run first). Raw receipt: `.project/metrics/orca-inputs/s3b-opencode.json` (git-ignored).
- **OpenCode 2.2.6 launches cleanly under the id `opencode`**: `ok: true`, `state: ready`, `stage: input_accepted`, `launch.effective.agent: opencode`, `mode: terminal`, `turnStart: unsupported`. Exit 0. The worker's own OpenCode service then came up on the same port (a new listener), so the port was needed and was free.
- **The success receipt carries the request id, but only with `--full`**: `result.mutation = { requestId: <uuid>, replayed: false }`. The envelope `id` is again a different UUID. Our dispatch passes `--json` without `--full`, so it does not see this today.
- **`request-show --request <requestId>` returns `state: completed`, `method: orchestration.workerStart`, plus the full receipt** (runId, taskId, dispatchId, effects, launch). So a start whose receipt was read can be reconstructed from its id.
- The receipt has `effects` (worktree reused, terminal created, dispatch_input accepted) and `residualResources: []` (an explicit empty list on a success). Its size is a few KB, well under the 256 KiB bound.
- Still **unobserved**: the receipt of a start that Orca's own `--timeout-ms` cut off, and any case where the response is lost before we read it (we then hold no id; `request-show` takes only an id).

### What this changes
| Question | Answer |
|---|---|
| Does a success receipt expose a request id? | Yes, under `--full`, as `result.mutation.requestId` (a UUID). |
| Can `request-show` settle a start whose id we hold? | Yes: `completed` with the receipt. |
| Can we recover a start whose response was lost before we read it? | Not by id: we never learn the id. Only an Orca-side `--timeout-ms` receipt could carry one, and that is unobserved. |
| Is `opencode` the right id for OpenCode 2.2.6 here? | Yes, observed. |

## S3c: real launch with `--timeout-ms 1` (2026-11-23, owner-authorized)
`worker-start --agent opencode --full --timeout-ms 1`. Raw receipt: `.project/metrics/orca-inputs/s3c-timeout.json` (git-ignored). Exit 1, but the envelope is `ok: true` with a failed result.
- **Orca's own timeout returns a structured receipt, not silence**: `result.state: failed`, `stage` and `failedStage: agent_readiness`, `lastError: "timeout"`, `runId`, `taskId`, `dispatchId`, `effects` and a **non-empty `residualResources`** (the terminal it created), a `recovery` text naming `orca orchestration worker-release --dispatch <id>`.
- **The timeout receipt carries the request id with `--full`**: `result.mutation = { requestId: <uuid>, replayed: false }`. So passing `--timeout-ms` below our kill deadline makes Orca hand us the id on a timeout instead of us killing the process and learning nothing.
- `request-show --request <id>` returned `state: completed` with the same failed receipt, both immediately and 20 s later (no late-ready transition observed within 20 s).
- The failed start left a terminal open and Orca's own mail said "Worker lost without reporting" (`stopReason: lost`, "it never started: timeout"). Under our rule (a failed stage plus a non-empty `residualResources`) this is **unproven and not retryable**, which is the correct fail-closed answer.
- Observed once only; later Orca releases may change the late-ready behavior.

### What this changes
| Question | Answer |
|---|---|
| What does an Orca-side timeout return? | A failed receipt with `failedStage`, `lastError: timeout`, non-empty `residualResources`, a `recovery` hint and `mutation.requestId`. |
| Is `request-show`/`--retry-request` settlement still needed? | Not for this pitch: the timeout receipt already carries the id and the full outcome, and ownership must stay unknown until the leftover terminal is inspected. A replay would add risk without adding information. |
| Lost response before we read it? | Narrowed by `--timeout-ms`: Orca answers before our SIGKILL, so the kill path should be rare. It cannot be eliminated (a crash between launch and ledger write). |

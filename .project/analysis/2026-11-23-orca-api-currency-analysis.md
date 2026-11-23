# Orca API currency and improvement analysis

Date: 2026-11-23. Scope: does this workflow use the current Orca APIs, how to replace what is out of date, and what the newer Orca lets us improve.
Method: read-only. No Run, task, worker or terminal was created. Sources: the installed CLI (`orca agent-context --json`, a 417-command machine-readable schema), the guides it ships (`orca skills get`), `orca status --json` on the live runtime, and Orca's GitHub releases.

## Verdict

1. **Nothing we call is broken.** All 17 distinct flags our scripts send (to `status`, `skills get`, `worker-list`, `worker-start`) are accepted by the live schema, and no retired command is referenced anywhere.
2. **We are one release behind, and the cadence is the real risk.** Installed 1.4.271; **1.4.272 shipped today**. Between our floor (1.4.224) and now there were 41 releases in 44 days (about one a day). That is why minor updates keep breaking us.
3. **1.4.272 targets exactly the cases our adapter hands to a human** (timed-out and late worker starts, silent workers). We do not use any of the machinery Orca built for them.
4. **Two places still rest on guesswork instead of Orca's published contract:** guide wording as a capability check, and the `opencode` agent id on a machine running OpenCode 2. (A third point, caller verification, is diagnostics only; see F4 and the correction at the end.)
5. **Recommended order:** a schema-based drift check (cheap, high value), then capability-based preflight, then one real launch capture that settles three open questions at once.

## 1. Which Orca is "latest"

| Item | Value |
|---|---|
| Installed app and CLI | 1.4.271 |
| Latest release | v1.4.272, published 2026-11-23 |
| Our supported floor (`integrations.orca.engine`) | `>=1.4.224` |
| Releases from the floor to latest | 41 (2026-10-10 to 2026-11-23) |
| PR titles matching orchestration, worker, coordinator or dispatch across them | 380 (keyword match, so some are unrelated) |

1.4.272 orchestration items that matter to this workflow (from its release notes, not yet installed here):
- "recover timed-out worker starts from their receipts" and "fail a worker start whose workspace create timed out, instead of showing it as live forever"
- "keep waiting for a worker agent that isn't ready in time" and "finish a worker start that becomes ready late the way an on-time start finishes"
- "tell the coordinator when a worker's model retries or gives no reply for 10 minutes"; a worker stuck on its own background task is reported after 20 minutes
- "say why a worker's brief went unsubmitted, and never press Enter into a dialog"
- host-aware worker placement and teardown contract, now documented

## 2. What we call, and whether it is current

| Call (where) | What we rely on | Live Orca 1.4.271 | Verdict |
|---|---|---|---|
| `status --json` (preflight, start) | `target.kind`, `runtime.reachable/state/appVersion` | present; `runtime.capabilities` (366 entries) is new | current; **unused new contract** (see R2) |
| `status` `caller` block (foundation preflight only) | `caller.live`, `caller.orcaSessionId`, env `ORCA_AGENT_SESSION_ID` | documented ("when the agent runs as an Orca session, otherwise omitted"); null in this session | contract intact; **not launch authority** (the gate accepts `caller-unverified` for an external coordinator, by design; see F4) |
| `skills get orca-cli`, `skills get orchestration` | marker words in the guide text | works; wording already changed once (`check`) | current but **fragile by design** (see F2) |
| `orchestration worker-list` | rows for our own terminal; filters `--terminal-state`, `--limit`, `--cursor`, `--full` | all accepted; concise view lacks `page` | current (fixed in 2.50.2 to 2.50.3) |
| `orchestration worker-start` | `--spec --agent --worktree --repo --name --base-branch --setup --model --effort --json`; dispatch id in the receipt | all accepted | current; **18 of its 28 flags unused**, including `--timeout-ms`, `--retry-request`, `--spec-file`, `--for`, `--keep-open` |
| Agent ids | `claude`, `codex`, `opencode` | Orca also has **`opencode2`**; this machine has OpenCode 2.2.6 | **possible mismatch** (see F3) |
| Identity env | `ORCA_TERMINAL_HANDLE` (present), `ORCA_AGENT_SESSION_ID` (absent here) | | see F4 |
| Retired commands | none referenced | `coordinator-start` and `coordinator-stop` are marked "Retired" | clean |

The guide-and-docs side: our skills and docs name `orchestration check`, `run-current`, `run-create`, `worker-start` and `worker-list`, all of which exist. Orca has 31 orchestration commands; we name 5.

## 3. Findings

**F1. Unknown outcomes are a human step, but Orca now has the tools to close them.** When our CLI call times out, overflows or is killed, the attempt is `unknown-liveness` and a person inspects the Run. We do that because we `SIGKILL` the CLI at our own deadline and never pass Orca's `--timeout-ms`. Orca provides: `--timeout-ms` (bound its own wait and return a structured receipt), `--retry-request <id>` ("replays its result instead of repeating it"), and `orchestration request-show --request <id>`, a read-only lookup that returns `completed`, `pending` or `absent` and says "it is safe to run after any lost response". A failed start also reports `failedStage`, `effects`, `residualResources` and recovery commands, and `outcome_unknown` is a defined outcome. **Open:** where a caller obtains the `req_…` id before a response is lost is not documented (concise receipts omit the envelope id). Checked live: `request-show` for an unknown id returns `state: absent` with the caveat "Absent is not proof that nothing happened".

**F2. We check capabilities by reading prose.** The preflight looks for words in the guide. That broke once and will again. Orca now publishes a versioned list in `status.runtime.capabilities` with orchestration entries (`orchestration.contract.v1`, `worker-start-implicit-run.v1`, `worker-stop-verdict.v1`, `worker-launch-preferences.v1`, `worker-keep-open.v1`, `worker-auto-release.v1`, and others), and the full command schema is available from `orca agent-context --json`. Our own comment in `orca-preflight.mts` records that "the pinned status contract does not advertise an enabled orchestration field"; that is no longer true.

**F3. OpenCode agent id.** `worker-start --agent` lists `opencode` and `opencode2` as separate ids, and the capability list has `agent-session.opencode2-resume.v1`. Our policy only knows `claude`, `codex`, `opencode` (`orca-policy.mts`), and this machine runs OpenCode v2.2.6. The earlier incident (an OpenCode model-pin refusal on an installed 2.1.1, recorded in `orca-model-preflight-can-leave-unproven-ledger-ownership`) is consistent with a v2 install being launched through the v1 id. **Hypothesis, unverified.**

**F4. `caller-unverified` is by design, and we drop Orca's reason for it.** `orca-run status --probe` reports `caller-unverified` and `dispatchReady: false` in this session because `caller` is resolved from `ORCA_AGENT_SESSION_ID`, which this tool session does not carry. That is the documented behaviour, not drift: the launch authority is `evaluateLaunch` in `orca-launch-gate.mts`, which accepts `caller-unverified` for an external coordinator, and it returned `launch-allowed` for claude, codex and opencode here (see the knowledge entry `status-dispatch-ready-false-is-not-launch-authority`). The only gap is diagnostic: Orca now explains a refusal in `caller.refusal.code` (for example `session_caller_unknown`) and we discard it.

**F5. The floor is far behind the surface.** `>=1.4.224` says "newer is fine", and it has been. But the orchestration behaviour changed in 380 PR titles since, and the 1.4.272 fixes above only help if we run them. We have no statement of which version we have actually exercised.

**F6. Signals we do not consume.** Orca now reports a worker waiting on a prompt only a human can answer (`worker-show` `observation.agentWait`), a worker whose model retries or is silent for 10 minutes, and a worker stuck on a background task. Our audit and build phases treat a silent reviewer as "do not wait" and move on; they could learn why.

**F7. Lower-value gaps.** `--spec-file -` (stdin) instead of passing the brief as an argument (our briefs are capped at 16,384 characters and control characters are rejected, so this is cosmetic); `worker-read` for bounded output when no `worker_done` arrives; `worker-release` and `--keep-open` for terminal lifecycle; implicit Run creation on `worker-start` (our docs still require an explicit `run-create` step first); `orchestration gate-create`, which would let a person approve one of our confirmation gates from Orca's UI or phone.

## 4. Recommended improvements

| ID | Change | Replaces or fixes | Benefit | Effort | Risk | Needs a real run |
|---|---|---|---|---|---|---|
| R1 | **Contract check from the schema**: commit a snapshot of the commands, flags and "Retired" markers we use; a doctor check diffs it against `orca agent-context --json` | F2, F5: finds the next drift the day it ships | high | small | low | no |
| R2 | **Capability-based preflight**: require named `runtime.capabilities` (for example `orchestration.contract.v1`) and keep the guide words only as a fallback | F2 | high | small | low | no |
| R3 | **Carry `caller.refusal.code` into diagnostics** (probe output and the preflight reason) and label an external coordinator explicitly. No change to launch authority | F4 | low | small | low | no |
| R4 | **Pass `--timeout-ms` below our kill deadline**, persist the request id in the ledger when the receipt has one, and resolve unknown outcomes with `request-show` plus `--retry-request` | F1 | high | medium | medium (ownership rules must stay fail-closed: `absent` is not proof) | yes |
| R5 | **Map OpenCode 2 to `opencode2`** (policy, adapter, docs) once confirmed | F3 | medium | small | medium | yes |
| R6 | **State a tested version** (1.4.272 once exercised) alongside the floor, and add recorded 1.4.272 shapes to the fixtures | F5 | medium | small | low | partly |
| R7 | **Surface Orca's worker notices** (`agentWait`, silent-model and stuck-task messages) in `/audit` and `/build` so a stalled worker is explained | F6 | medium | medium | low | yes |
| R8 | Optional: `--spec-file -`, implicit Run creation, `worker-read` fallback, Orca decision gates for our confirmation gates | F7 | low | medium | low | partly |

## 5. What could not be verified, and why

- **Where the request id comes from** (F1, R4): needs one real `worker-start` receipt. This is the same capture as the deferred S3 scope, and it creates Orca state, so it needs the owner's authorization.
- **Whether `opencode2` is the right id for OpenCode 2.x** (F3, R5): same real launch.
- **Whether a `caller` block appears inside an Orca-launched coordinator session** (F4): diagnostic value only; this session was not one.
- **What `effects` contains on a pre-creation refusal**: documented as a field, never observed.
- **1.4.272 behaviour:** known from its release notes only; it is not installed here.
- Pricing and quality of any model are out of scope here.

## 6. Suggested sequence

1. **R1, R2, R3**: no Orca state, no risk to ownership rules, and they close the "next minor update breaks Orca mode" problem structurally.
2. **Upgrade to 1.4.272**, run R1's check, add its recorded shapes (R6).
3. **One authorized real launch**, capturing the receipt and request id, to settle R4, R5 and S3 together. Cleanup of that Run is the owner's choice (the Orca pitch forbids automatic cleanup).
4. R7 and R8 after that.

## Appendix: evidence

- `orca --version` 1.4.271; `gh api repos/stablyai/orca/releases/latest` returns v1.4.272 (2026-11-23).
- `orca agent-context --json`: 417 commands, 31 under `orchestration`; flag check of the 17 flags our scripts send: 0 missing.
- `orca status --json`: `runtime.capabilities` 366 entries, 112 for orchestration, worker or session; `caller` null in this session.
- `orca orchestration request-show --request req_does_not_exist --json`: `state: absent` with the interpretation text quoted above.
- `orca-run status --probe`: `reason: caller-unverified`, `dispatchReady: false` (by design); `evaluateLaunch` for claude, codex and opencode: `allowed: true, launch-allowed`; with `ORCA_AGENT_SESSION_ID` set to the listed working agent: `caller.refusal.code = session_caller_unknown`.
- `orca skills get orchestration --full` and its references: no mention of the request id's origin.
- Releases v1.4.224 to v1.4.272 scanned from GitHub release notes.

## Correction (added after shaping the follow-up pitch)
The first version of this analysis said a real dispatch could not be verified from this session and proposed making `start` report dispatch readiness (R3). That was wrong: `dispatchReady: false` and `caller-unverified` are documented design, and the launch gate, which is the actual authority, allows launches here. F4, R3, the verdict and the "not verified" list were corrected; no other finding depended on it.


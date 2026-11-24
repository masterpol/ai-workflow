# Plan: orca-api-currency-and-opencode2

**Pitch**: pitch.md  •  **Appetite**: epic, nine small-batch scopes + one decision scope + one gated capture  •  **Hill**: hill.md
**Orca mode**: requested (`/plan use orca mode`). Start check: ready, coordinator claude, workers codex and claude (OpenCode is not a worker for a Claude coordinator, so the OpenCode-2 code is built by codex/claude workers and never launched through opencode2 by this build). Planning creates no Orca Run, task or worker; /build binds the Run.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| P0 | Settle the base branch (decision, no code) | none (a note in log.md) | 0 | — | — | no: a git/owner decision | — |
| R1a | Contract snapshot + doctor check | `orca-contract.mts`, `orca-contract.test.mts`, `orca-contract.snapshot.json` (generated), `workflow-doctor.mts`, `workflow-doctor.test.mts` | ~350 + 180 test + snapshot | P0 | R2, R5a | yes: disjoint files, clear exit | standard |
| R2 | Capability-based preflight | `orca-preflight.mts`, `orca-preflight.test.mts` (+ `orca-vendors.md` is NOT touched here) | ~80 + 100 test | P0 | R1a, R5a | yes: 2 files, clear exit | standard |
| R5a | Agent-id config key + single resolver | `runtime/config.mts`, `orca-policy.mts`, `orca-policy.test.mts`, `ai-workflow.example.toon`, one contract test file (new) | ~150 + 200 test | P0 | R1a, R2 | yes: disjoint from R1a/R2 | standard |
| R1b | Docs: contract check section | `ai-framework/integrations/orca-vendors.md` | ~40 | R1a | R3, R4a | yes: one file | fast |
| R3 | Caller diagnostics (no authority change) | `orca-preflight.mts`, `orca-launch-gate.mts`, `orca-launch-gate.test.mts` (+ preflight test additions) | ~100 | R2 (same file) | R1b, R4a | yes: after R2 lands | fast |
| R4a | Ledger `requestId` + args digest | `orca-ledger.mts`, `orca-ledger.test.mts`, `orca-reconcile.mts`, `orca-reconcile.test.mts` | ~150 + 150 test | P0 | R1b, R3 | yes: disjoint from R3/R1b | standard |
| S3 | **Authorized real-launch capture** (spike) | none in repo; evidence file in the pitch | 0 | R1a, R2, R3, R4a, R5a; **owner authorization** | — | no: creates Orca state, owner-gated | — |
| R4b | `--timeout-ms` + `request-show`/`--retry-request` settlement | `orca-dispatch.mts`, `orca-dispatch.test.mts`, `orca-launch-gate.mts`, `orca-launch-gate.test.mts`, `orca-vendors.md` | ~120 + 250 test | S3, R4a | — | yes after S3, but **same files as R5b: sequential** | standard |
| R5b | Gate probes the launched agent id; proof-gated fallback | `orca-launch-gate.mts`, `orca-dispatch.mts`, `orca-dispatch.test.mts`, `orca-ledger.mts` (optional `agentId`), `orca-ledger.test.mts` | ~150 + 300 test | S3, R4b, R5a | — | no: shares `orca-dispatch.mts` with R4b, so coordinator-sequenced | standard |
| R5c | Golden case to `executes` + docs | `orca-eval-grader.mts`, `orca-eval-grader.test.mts`, `.project/evals/datasets/orca-vendor-orchestration.json`, `orca-vendors.md` | ~120 | R5b | — | yes: grader only | standard |

LOC are estimates from current file sizes, not diffs. CHANGELOG, VERSION and `graphify-out/` are written once at /ship, not charged to a scope.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Run everything with bun (standing note). Tests: `bun test <file>`. Reviewer mutants are in-memory (testing.md), never edits to the repo.

### P0 — Settle the base branch
- `git merge-base --is-ancestor fix/orca-survives-updates feat/archify-replaces-state` is evaluated and the answer recorded in `log.md` together with the owner's chosen base (PR #9 branch, or a rebase of the local branch onto it) and which 2.51.0 commit is canonical.
- `git status --porcelain` shows the current uncommitted work (grader, dataset, analysis, this pitch) committed or moved onto that base, so no scope starts on a dirty overlap.
- No scope below starts before this is recorded.

### R1a — Contract snapshot + doctor check
- `bun test ai-framework/scripts/orca-contract.test.mts ai-framework/scripts/workflow-doctor.test.mts` exit 0.
- The snapshot is produced by the generator from the real `orca agent-context --json`, never typed by hand: a test regenerates it into a temp path and asserts it equals the committed file's shape; the generator and the doctor reader share one named byte bound, and a test asserts the real 421 KB schema fits with headroom while the shared 262,144-byte bound is unchanged (`git diff` shows no change to it).
- Drift behavior, each with an in-memory mutant: added flag or command passes; removed used flag fails with its name; newly "Retired" used command fails; `orca` absent on PATH is a skip, not a failure; a missing or unreadable snapshot emits ONE failure record.
- `bun ai-framework/scripts/workflow-doctor.mts` against this checkout runs the new check and reports it (observed output pasted into the evidence file).

### R2 — Capability-based preflight
- `bun test ai-framework/scripts/orca-preflight.test.mts` exit 0; no other test file edited (`git diff --stat` shows exactly the two files).
- Four cases covered with mutants: list absent → guide words used; list present with all required names → pass; list present missing one required name → deny with a named reason and the guide words are NOT consulted; guide words absent and list absent → deny as today.
- The required set is a short named list in one constant, stated in the test, not the whole 366-entry list.
- Fixture shape comes from a captured real `status` (stored in the test as the recorded shape and cited), per `a-workers-passing-tests-can-encode-the-wrong-data-shape`.

### R5a — Agent-id config key and single resolver
- `bun test ai-framework/scripts/orca-policy.test.mts` plus the new resolver contract test exit 0.
- One resolver returns the agent id: default `opencode2`; override value `opencode`; an invalid value fails closed and resolves to nothing launchable; `installedOpenCodeMajor 1` resolves `opencode`. Each is a test.
- `grep -rn '"opencode2"' ai-framework/scripts/*.mts | grep -v test` shows the id literal in the resolver only (one owner); the policy and ledger vendor pools still contain `opencode` and reject `opencode2` (`invalid-vendor`).
- Config key added in the reader, the emitter and the example toon in one commit; `bun ai-framework/scripts/setup-validator.mts` exit 0.

### R1b — Docs for the contract check
- `bun ai-framework/scripts/graphify.mts --check` exit 0; `grep -c "orca-contract" ai-framework/integrations/orca-vendors.md` ≥ 1; the section names the doctor check, the snapshot path, the skip rule and how to regenerate.

### R3 — Caller diagnostics
- `bun test ai-framework/scripts/orca-launch-gate.test.mts ai-framework/scripts/orca-preflight.test.mts` exit 0.
- `caller.refusal.code` appears in probe output only when it matches a closed token shape (lowercase token, 2 to 64 chars); hostile values (control characters, overlong, injected agent name) yield the fixed generic reason; ownership and `evaluateLaunch` results are byte-identical to before for every existing fixture (assert `allowed` unchanged for claude, codex, opencode with `caller-unverified`).
- No change to `VERSION_PROVEN_REASONS` or to the allow path (`git diff` is read by the coordinator).

### R4a — Ledger `requestId` and args digest
- `bun test ai-framework/scripts/orca-ledger.test.mts ai-framework/scripts/orca-reconcile.test.mts` exit 0.
- Fields are optional; a record written before this change still reads (a fixture written with the old keys passes the new reader); a record with an unknown extra key is still rejected; reader, emitter and every fixture literal change in one commit (schema-bump rule, `testing.md`). Hostile `requestId` text is rejected by a closed shape.
- The args digest changes when the brief, the agent id or the paths change (test per input).

### S3 — Authorized real-launch capture (owner-gated)
- Precondition recorded: the owner's explicit authorization in this conversation, naming one launch; OpenCode's service port freed first and any stale server noted (standing note and `orca-workers-differ-from-the-coordinator-environment`).
- Evidence file in the pitch folder holds, as observed (not inferred): the `worker-start` receipt shape, where a `req_…` id appears or that it does not, the real refusal receipt for a bad `--agent` (if one is safely obtainable), the accepted `opencode2` launch result, the port behavior.
- No automatic cleanup or reset; the Run is left for the owner to release.
- If the capture shows the request id is not obtainable before a response is lost, R4b is re-shaped to timeout bounding only and the pitch is updated before building it.

### R4b — Timeout bound + request-based settlement
- `bun test ai-framework/scripts/orca-dispatch.test.mts ai-framework/scripts/orca-launch-gate.test.mts` exit 0.
- Timeout: Orca `--timeout-ms` is passed below the kill deadline by a named margin; derived value below 1 ms refuses (injected-clock fractional-boundary test, `rounded-zero-timeout-disables-cancellation`); both orderings (Orca receipt first, SIGKILL first) tested; Orca's timeout receipt maps to a reason distinct from `launch-timeout`.
- Settlement: `request-show` `absent` never settles (mutant: treating absent as proof turns a test red); a replay is refused when the stored args digest differs; the query runs under the launching identity; a rerun re-proves the evidence instead of trusting the stored id.
- Ownership after any timeout, overflow or signal stays `unknown-liveness` unless proof arrives.

### R5b — Gate probes the launched id; proof-gated fallback
- `bun test ai-framework/scripts/orca-dispatch.test.mts ai-framework/scripts/orca-launch-gate.test.mts ai-framework/scripts/orca-ledger.test.mts` exit 0.
- Probe/launch match: a test records the id the gate probed and the `--agent` the spawn received for every attempt including the fallback leg; mutant "probe `opencode`, launch `opencode2`" turns it red.
- Fallback fires only on an explicit empty `residualResources` and only once, counted against `maxRetriesPerTask` (0, 1, 2 each tested; total spawns ≤ 1 + min(requested, policy)); first attempt marked `failed` before the new attempt key is reserved.
- Never falls back on: refusal code alone, `failedStage`, non-empty list, exit status, timeout, signal, unparseable receipt, hostile receipt text (only a strict token is reported).
- A later dispatch of the same task while the first is `unknown-liveness` spawns nothing (`task-already-owned`).
- Ledger `vendor` stays `opencode`; optional `agentId` records the id that ran; dispatch id binds to the leg that launched.

### R5c — Golden case executes
- `bun ai-framework/scripts/orca-eval-grader.mts --root .` reports `opencode2-default-fallback-needs-positive-proof` as `mode: executes, pass: true`, and the summary counts executed cases separately from parse-only and live-only (no combined total).
- `bun test ai-framework/scripts/orca-eval-grader.test.mts` exit 0, including a named test bound to the case id and an in-memory mutant that flips the fallback rule and turns the case red (a skipped or missing test counts as unenforced).
- The grader's `PARSES_ONLY` entry for this case is removed and the test's expected mode map updated in the same commit.
- AI-scope eval gate: the golden case passes at the pitch's threshold (all expected fields match; no regression in the 7 already-executed cases).

### Whole-pitch exit (at /audit and /ship)
- `bun ai-framework/scripts/setup-validator.mts`, `bun ai-framework/scripts/graphify.mts --check`, `bun ai-framework/scripts/graphify-relations.mts --check` exit 0; full `bun test ai-framework/` exit 0 or each failure explained as pre-existing with evidence.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Request id may not be obtainable before a response is lost | R4b | **yes (S3)** | R4b blocked until S3; re-shape to timeout-only if absent |
| Real refusal receipt for a bad `--agent` may be indistinguishable from other refusals, making the fallback unreachable | R5b | **yes (S3)** | No allowlist as proof without captured evidence; otherwise ship default + override with no fallback and say so |
| `opencode2` may not be the right id, or may share a stale-server port problem | R5a/R5b | **yes (S3)** | Default stays behind the override until observed; free the port before the launch |
| `--retry-request` replays a different request; `request-show` invisible under another identity | R4b | partly (S3) | Args digest, launching identity, `absent` non-proof |
| `--timeout-ms` vs SIGKILL margin | R4b | no | Named margin, both orderings tested |
| Snapshot false alarms / bound | R1a | no | Snapshot only what we use; one shared named bound; skip when `orca` absent |
| Stacking on PR #9 and two 2.51.0 commits | all | no (decision) | P0 first |
| `maxRetriesPerTask` unbounded in config, 0..2 in policy | R5b | no | One owner decides in R5a; R5b relies on the policy bound |
| Capability name renamed in a newer Orca | R2 | no | Short required set; present-but-missing denies with a named reason |
| Orca 1.4.272 not installed | R1a | no | Upgrade is the owner's; snapshot regenerated after; no tested-version claim until then |

Rules folded in: `coding-standards.md` (producer and reader share one bound), `security.md` (CLI output untrusted, bounded tokens), `testing.md` (in-memory mutants, schema-bump checklist, shared mock factory first). `.project/rules/` has no stack companions.

## Parallel dispatch plan

Orca mode: the coordinator (Claude) dispatches codex and claude workers, one scope per worker, never two workers on one file; each worker gets a bounded brief with its scope's files as its authorized paths. The coordinator independently reruns every exit command and reads every diff before marking a scope done (workers' own pass counts are not evidence).

1. **Wave 0 (coordinator):** P0.
2. **Wave 1, parallel (disjoint files):** R1a (claude, standard), R2 (codex, standard), R5a (codex or claude, standard). Cross-review rule: the reviewer vendor differs from the implementer's.
3. **Wave 2, parallel:** R1b (fast), R3 (fast, after R2), R4a (standard).
4. **Gate:** S3, only with the owner's explicit authorization. Read-only analysis and the existing 7 executed eval cases do not need it.
5. **Wave 3, sequential (shared `orca-dispatch.mts`, `orca-launch-gate.mts`, ledger):** R4b, then R5b, then R5c.

Why not more parallelism: R2/R3 share `orca-preflight.mts`; R4a/R5b share the ledger; R4b/R5b share dispatch and the gate. Each pair is sequenced, not raced.

## Wireframes

None: no UI scopes.

## Living-spec deviations log

(Empty at /plan time. /build appends as the plan diverges from reality.)


## Re-plan after S3 (2026-11-23)

| ID | Name | Files | Depends on | Subagent? | Model |
|----|------|-------|------------|-----------|-------|
| R5b-1 | Resolver takes the installed-agent list; contract entry | `orca-policy.mts`, `orca-policy.test.mts`, `orca-agent-id.test.mts`, `orca-contract.mts`, `orca-contract.snapshot.json` | R5a | yes (5 files, disjoint) | standard |
| R5b-2 | Dispatch passes the resolved id; gate checks the installed list for it | `orca-launch-gate.mts`, `orca-launch-gate.test.mts`, `orca-dispatch.mts`, `orca-dispatch.test.mts` | R5b-1 | yes, sequential after R5b-1 | standard |
| R5c | Golden case executes | `orca-eval-grader.mts`, `orca-eval-grader.test.mts`, dataset, `orca-vendors.md` | R5b-2 | yes | standard |
| R4b | (paused: needs its own owner decision) | | | | |

Exit criteria (replace the old R5b/R5c): resolver returns `opencode` when only `opencode` is installed, `opencode2` when it is installed, and a named refusal for: override not installed, override not an agent id, no OpenCode id installed, list unavailable or malformed; `agent installed` is in `USED_CONTRACT` and `bun ai-framework/scripts/orca-contract.mts --check` exit 0 after regeneration; the gate denies `agent-not-installed` for an id not in the list and its probe equals the spawned `--agent` (a mutant that probes `opencode` and launches `opencode2` turns a test red); `bun ai-framework/scripts/orca-eval-grader.mts --root .` reports the renamed case `executes`, `pass: true`.


## Re-plan of R4b (2026-11-23)

| ID | Name | Files | Depends on | Subagent? | Model |
|----|------|-------|------------|-----------|-------|
| R4b-1 | `--timeout-ms` bound + refusal request-id capture | `orca-dispatch.mts`, `orca-dispatch.test.mts`, `orca-contract.mts`, `orca-contract.snapshot.json` | R5b-2 (same dispatch file), R4a | yes, sequential | standard |
| S3b | Authorized success-path capture | none | owner authorization | no | n/a |
| R4b-2 | Settlement via `request-show` / `--retry-request` | to be planned after S3b | S3b | no | n/a |

Order: R5b-1 -> R5b-2 -> R4b-1 -> R5c (R5b-2 and R4b-1 share `orca-dispatch.mts`).

R4b-1 exit criteria: `bun test ai-framework/scripts/orca-dispatch.test.mts ai-framework/scripts/orca-contract.test.mts` exit 0; the spawned args carry `--timeout-ms` equal to deadline minus the named margin (constant, tested); a deadline leaving under 1000 ms after the margin refuses the launch with a named reason and spawns nothing (injected clock, fractional boundary); both orderings tested (SIGKILL first stays `launch-timeout`/unknown-liveness; a structured receipt first follows the existing refused/unproven rules); a refusal with a lower-case UUID `orchestrationRequestId` stores it set-once in the ledger and prints it in the human action with the `request-show` command; hostile ids (wrong shape, control characters, over-long, non-string, an object) are ignored; ownership after a refusal with an id remains `unknown-liveness` (mutant: treating the id or `absent` as proof turns a test red); `timeout-ms` is in `USED_CONTRACT` and `bun ai-framework/scripts/orca-contract.mts --check` exit 0 after regeneration.


## Plan update after S3b (2026-11-23)
- **R4b-1 widens slightly**: dispatch passes `--full` to `worker-start` (add `full` to the `worker-start` entry of `USED_CONTRACT`; regenerate the snapshot), and captures the request id from BOTH places observed: `result.mutation.requestId` on a success receipt and `error.data.orchestrationRequestId` on a refusal. Only a lower-case UUID is accepted; it is stored set-once in the ledger `requestId` field (R4a) and shown in the human action with the read-only `request-show` command. A success that carries `mutation.replayed: true` is reported, never treated as a new launch. Files: `orca-dispatch.mts`, `orca-dispatch.test.mts`, `orca-contract.mts`, `orca-contract.snapshot.json`.
- **R4b-2 stays gated and is narrowed**: with a held id, `request-show` returns `completed` plus the full receipt, which can reconstruct a start whose receipt was read but not recorded (for example a crash between the launch and the ledger write). It cannot recover a response lost before we read it, because we never hold the id then. Recovering that case needs the receipt Orca returns when its own `--timeout-ms` expires, which is unobserved. Decision needed from the owner after R4b-1: capture one more real launch with a deliberately tiny `--timeout-ms` (S3c) to observe it, or drop R4b-2.


## Plan update after S3c (2026-11-23)
- **R4b-2 is dropped as a build scope.** S3c showed Orca's own timeout receipt carries the request id and the full failed outcome (non-empty `residualResources`, `recovery` hint). `request-show` / `--retry-request` settlement would add risk (a replay of a failed start) without new information; ownership stays `unknown-liveness` until the leftover terminal is inspected and released. Recorded as a no-go: no `--retry-request` from our scripts.
- **R4b-1 already covers the useful part** (`--timeout-ms` below the kill deadline, `--full`, request id captured from success, refusal and timeout receipts). Its brief must also surface Orca's `recovery` release command in the human action for a failed start; if the running worker did not include that, a small follow-up edit to `orca-dispatch.mts` is part of R4b-1 acceptance.
- **Standing owner rule (2026-11-23): close every sub-task agent tab once it has finished or errored.** The coordinator runs `orca orchestration worker-release --dispatch <id>` for each finished or failed worker after collecting its report and never for a running one. Added to R5c docs.

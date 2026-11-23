# Build log: orca-api-currency-and-opencode2

## 2026-11-23 P0 settled (base branch)
- `git merge-base --is-ancestor fix/orca-survives-updates feat/archify-replaces-state` → no (merge-base `c5d05f9`). Two histories carry the same work under different numbers (PR #9 branch: 2.50.2, 2.50.3, 2.51.0 = `ccc89b7`; local branch: 2.51.0 = `3a16a5f`, 2.51.1 to 2.51.5).
- `git diff --stat` between the two tips over `ai-framework/scripts/orca-*.mts`, `workflow-doctor.mts`, `runtime/config.mts` and `integrations/orca-vendors.md` is empty. Only 4 files differ in total (version, changelog and graph files).
- Decision: build on `feat/orca-api-currency-opencode2`, cut from `feat/archify-replaces-state` with the uncommitted grader, dataset, analysis and pitch files carried in the working tree (nothing committed). The code is the same on either base, so the choice affects only history and the version number. Which 2.51.0 is canonical, and the version this work ships as, stays an owner decision at /ship; PR #9 is untouched.

## Orca Run (authorized by the owner, "Yes, Orca workers")
- Run bound: `run_07adc69ad9b4` (objective: this pitch). Created after the owner approved Wave 1 launches. Cleanup of anything Orca creates is the owner's choice; no automatic release or reset.

## Wave 1 launched (2026-11-23)
| Scope | Vendor | Attempt | Dispatch id |
|---|---|---|---|
| R1a | claude | attempt:r1a-1 | ctx_ec36897b9d72 |
| R2 | codex | attempt:r2-1 | ctx_41657cfb1e37 |
| R5a | codex | attempt:r5a-1 | ctx_440fa9acd1d8 |
Shared checkout, disjoint authorized files. Completion only counts from each attempt's own worker_done; the coordinator reruns every exit command.

## Deviations
- **R5a narrowed (2026-11-23).** Worker r5a-1 correctly stopped: the config emitter is `emitToon` in `config-migrate.mts`, outside the authorized paths, and a new toon key would also change `runtime/config.mts`, `config.test.mts`, `config-migrate.test.mts`, helpers and the example toon (8+ files, over the 5-file cap; schema bumps are a known source of stale tests). Decision: the override is the process-environment variable `AI_WORKFLOW_ORCA_OPENCODE_AGENT` (the project already treats process env as a first-class config channel), read by the resolver in `orca-policy.mts`, no schema change. A toon key is a later, separate scope. R5a files: `orca-policy.mts`, `orca-policy.test.mts`, new `orca-agent-id.test.mts`. Attempt r5a-1 ended `failed` with no files modified; attempt r5a-2 follows.

- R2 worker r2-1 reported `failed` (33 pass, 1 fail: it attributes the failure to R1a's concurrent doctor change; unverified). Ledger: failed. The diff is kept in the checkout; the coordinator verifies it after R1a lands and decides whether to accept or redispatch.
- **R1a split (2026-11-23).** R1a worker passed its own tests (96) but its doctor check runs `orca agent-context`, breaking the standing doctor guarantee (sentinel test `orca-preflight.test.mts:436`: the doctor never executes Orca). Decision: keep the generator, reader, diff and `orca-contract.mts --check` (live diff, explicit command); the doctor check becomes OFFLINE (snapshot shape plus every used command/flag present, none Retired). Pitch text said "doctor diffs against the live CLI"; the live diff is now the explicit command, documented in R1b. Scope `R1a-fix` dispatched (claude).
- R5a verified by the coordinator: 51 pass; resolver matches the spec; the only other `opencode2` literal in non-test scripts is the parse-only case id in `orca-eval-grader.mts:56`, which R5c removes.

## Wave 1 verified (coordinator, 2026-11-23)
- R1a + R1a-fix: `bun test` orca-contract, workflow-doctor, orca-preflight = 130 pass, 0 fail; `orca-contract.mts --check` matches the live CLI; doctor has no `readLiveContract`/`orcaCommand`; shared 262144 bound untouched.
- R2: diff reviewed; capability `orchestration.contract.v1` is in the live 366-entry list; preflight tests pass (the one earlier failure was the R1a doctor conflict).
- R5a: 51 pass; resolver per spec. Ledger note: r2-1 and r5a-1/r5a-2 were recorded `failed` because the workers reported `failed` (blocked or acceptance wording); the coordinator accepted the diffs after its own verification.

## Wave 2 launched
R1b (codex), R3 (claude), R4a (codex), disjoint files.

## Wave 2 verified (coordinator, 2026-11-23)
- R1b: section accurate; `graphify --check` ok; named paths and commands exist.
- R3: 65 pass; `orca-launch-gate.mts` and `orca-run.mts` have no diff; reason string stays `caller-unverified`; new `callerKind` / `callerRefusal` fields (closed shape, else `refusal-unrecognized`); launch-gate test asserts `allowed` unchanged for claude, codex, opencode.
- R4a: 83 pass; optional set-once `requestId` and `argsDigest`; old-shape records still read; no schema bump needed.
- Full suite in this checkout: 2121 pass, 2 fail. Both failures are 5 s Bun timeouts of tests that copy the whole tree (`skill-defaults.test.mts`: "exits 0 on a real bundle copy", and one sibling). Cause: the ignored `graphify-out/cache` (118 MB) is copied too. Evidence it is not our code: clean `HEAD` passes in 1 s, and `HEAD` plus all of today's changes passes skill-defaults and workflow-doctor tests 109/109 in a clean worktree. Followup, not fixed here (out of scope).

## S3 captured (2026-11-23, owner-authorized)
Evidence in `s3-capture.md`. Headline: `--agent opencode2` fails here (`opencode2: command not found`); `orca agent installed` lists `opencode` only, and the installed binary is OpenCode 2.2.6. R5 premise ("opencode2 is the id for OpenCode 2") is refuted on this machine; R4b and R5b/R5c wait on an owner decision (see the pitch). Left open: task `task_5948657d826a`, terminal `term_0fc87fed-5b1c-4fc3-827b-13c7929b2402`, dispatch `ctx_7938e95c1a1c` (failed). No cleanup was done.

## Re-shape (owner chose option 1 after S3)
R5 resolves the OpenCode agent id from `orca agent installed`; no fallback loop; golden case renamed `opencode-agent-id-resolves-from-installed-agents`. Slices: R5b-1, R5b-2, R5c. R4b paused. Details in pitch.md and plan.md.

## R4b re-shaped (owner request)
R4b-1 (timeout bound + refusal request-id capture, buildable now), R4b-2 (settlement, gated on S3b), S3b (needs authorization). Envelope id is not the request id; request-show says absent for a refusal. Order: R5b-1 -> R5b-2 -> R4b-1 -> R5c.

- R5b-1 worker reported `failed` (150 pass, 2 fail): the doctor test fixture `snapshotText` in `workflow-doctor.test.mts` (outside its authorized paths) lacked the new `agent installed` command. Coordinator added that one entry (a hand-edit of an unauthorized test file, by the coordinator, one line plus a comment count). Ledger: failed; diff accepted after verification.

## S3b captured (owner-authorized)
`--agent opencode --full` succeeded on OpenCode 2.2.6; `mutation.requestId` is in the --full success receipt; `request-show` returns `completed` plus the receipt. Left running by Orca: dispatch `ctx_0edc7ff55272`, task `task_ed660de9272c`, terminal `term_eb85cdee-bfa2-4b22-b94a-9be8d45b0995` (a live OpenCode worker owning the OpenCode service on port 49374). No cleanup was done. R4b-1 widened to pass `--full`; R4b-2 narrowed. Details in `s3-capture.md` and `plan.md`.

- S3b worker `ctx_0edc7ff55272` reported `worker_done` succeeded (read-only, no files touched): a worker launched as `opencode` on OpenCode 2.2.6 completes and reports end to end. Not collected into the ledger (it was a raw CLI launch, not a dispatch). Its terminal is reclaimable; release is the owner's choice.

## S3c captured (owner-authorized) and cleanup rule
Timeout receipt: failed, `lastError: timeout`, non-empty `residualResources`, `recovery` hint, `mutation.requestId` present; `request-show` completed. R4b-2 dropped as a build scope. Owner rule: release finished/errored worker tabs. Released: S3 `ctx_7938e95c1a1c` and S3c `ctx_2c90caa79b0b` (terminals closed). Earlier workers were already released by Orca; only the running R4b-1 worker `ctx_cbc281505639` is open.

## R4b-1 verified (coordinator)
- 268 pass across dispatch, contract, doctor, ledger, launch-gate; `orca-contract.mts --check` ok. Production diff read in full.
- Coordinator fix after reading S3c: `requestIdOf` now reads `result.mutation.requestId` and `error.data.orchestrationRequestId` regardless of launch outcome (a timeout receipt is a failed start that carries the id in `result.mutation`). Regression test from the real S3c receipt added; dispatch tests 104 pass. A coordinator hand-edit of production code, by decision, because it was two lines plus one test.
- Standing rule applied: finished/failed workers released after collect.

## R5c verified (coordinator)
- Grader: case `opencode-agent-id-resolves-from-installed-agents` executes and passes (executes 8/8, parses-only 1, live-only 3); grader tests 17 pass with three mutants red; docs section read against the code.
- Ledger: `collect` refused the worker report `invalid-files` (the worker listed the dataset under `.project/evals/`, and the report grammar rejects any `.project` path), so attempt `r5c-1` stays `launched` in the ledger. Not edited by hand. Terminal released per the owner rule. Followup recorded.

- Exit gate found a regression in `orca-run.test.mts` (`the first OpenCode dispatch checks the port, then launches`): its fake Orca did not answer `agent installed`, so the resolver (correctly, fail closed) refused OpenCode dispatch. Fixture fix by the coordinator: `probeSync` now answers `agent installed` with the real recorded shape. A fixture gap in a file no scope listed (the appetite auditor predicted 7 fixture files).

## Build complete (2026-11-23), awaiting the /build end gate
All scopes done or dropped (R4b-2 dropped). Exit gate: setup-validator 25 checks, graphify --check, graphify-relations --check (0 problems), orca-contract --check, grader executes 8/8. Full suite in this checkout 2145 pass, 2 fail (the known bundle-copy timeouts from the ignored graphify-out/cache); the same suite on a clean HEAD plus all of today's changes: 2146 pass, 0 fail. Orca: no worker open; Run `run_07adc69ad9b4` still bound. Nothing committed.

## Audit (2026-11-23)
Cycle 1: 5 reviewers, repo guard clean, both canaries caught; one confirmed must-fix (M1, non-string failedStage) fixed in the coordinator thread with a failing-then-passing test; cycle 2 narrow security re-check: canary caught, no new finding. Open: no must-fix. Deferred should-fix S1 (argsDigest), S2 (USED_CONTRACT), S3/S4 (merge order with PR 9). See audit-cycle-1.md and audit-cycle-2.md.

## Ship verification (2026-11-23)
Independent local clone with every change committed: full suite 2147 pass, 0 fail; graph 139 knowledge nodes after the run. In this checkout: 2146 pass, 2 fail (5 s timeouts from the ignored graphify-out/cache; both pass at a 120 s timeout). Verifying through `git worktree` gave misleading failures (shared git directory: the suite's graph rebuild read the main repo's committed state, 134 cards). Version 2.52.0 recorded locally; nothing committed.

# Pitch: orca-api-currency-and-opencode2

**Date**: 2026-11-23  •  **Appetite**: epic. Five tasks R1 to R5 (the owner's unit), with R1, R4 and R5 cut into lettered sub-slices so every build slice is ≤5 files. About 24 files in all (30 with fixtures), counted once; CHANGELOG, VERSION and `graphify-out/` are written once at ship and are not charged to a slice.
**Stack**: workflow tooling (Orca preflight, launch gate, dispatch, ledger, policy, doctor, config, docs, eval dataset)
**Origin**: `.project/analysis/2026-11-23-orca-api-currency-analysis.md` (recommendations R1 to R5). Owner direction: all work is organised as R1 to R5, and **OpenCode 2 is the default**: always try it first.

## Problem

A maintainer running Orca mode is exposed every time Orca ships, which is about once a day (41 releases in 44 days). The workflow cannot say which command or flag drifted until a phase stops. It also hands every lost-response launch to a human even though Orca now has the tools to settle it. And it launches OpenCode 2 workers through the OpenCode 1 agent id, on a machine that runs OpenCode 2.2.6.

## Knowledge consulted

- decisions/`orca-identity-lookup-and-refusal-reporting` — the lookup is bounded and refusals keep a token reason; ownership stays `unknown-liveness`. Every slice must keep that.
- patterns/`retry-only-on-positive-proof-of-a-clean-failure` — "non-zero exit" and "no failure stage" are not proof. Constrains **R4** (`request-show` `absent` is not proof) and **R5** (no fallback from `opencode2` without proof).
- patterns/`a-gate-spawns-exactly-what-it-probed` — constrains **R5**: the gate must probe the agent id it launches, never another.
- issues/`status-dispatch-ready-false-is-not-launch-authority` — constrains **R3**: `dispatchReady: false` and `caller-unverified` are by design and `evaluateLaunch` is the authority. (The analysis first got this wrong; it was corrected.)
- patterns/`replace-a-library-with-a-fixture-table-from-the-library` — shapes **R1**: the contract snapshot is generated from the real CLI, never written by hand.
- Added by /critique: issues/`orca-workers-differ-from-the-coordinator-environment` (a stale OpenCode server after an upgrade causes the port refusal; R5 spike), issues/`orca-model-preflight-can-leave-unproven-ledger-ownership` (still unresolved; the live precedent for an OpenCode refusal; R4/R5), patterns/`a-receipt-field-reaches-a-reason-only-as-a-bounded-token` (R3), issues/`review-guard-snapshot-can-outgrow-its-reader` (R1: generator and doctor reader share one named bound), patterns/`a-grader-reports-executed-and-unexecuted-cases-separately` and `a-golden-dataset-case-counts-only-when-a-named-test-passes` (R5c), patterns/`one-owner-per-instruction-topic-guarded-by-contract-tests` (R5a), patterns/`keep-the-fakes-guarantee-the-thing-they-replace` and issues/`a-workers-passing-tests-can-encode-the-wrong-data-shape` (R1/R2 fixtures use the captured real shape), patterns/`settle-only-with-proof-bound-to-this-patch` and `a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller` (R4b), issues/`rounded-zero-timeout-disables-cancellation` (R4b), issues/`a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version` (R4a).
- rules: `coding-standards.md` "Producer and Reader Share One Bound" (R1 reads a 421 KB schema, over the shared 262,144-byte bound), `security.md` (CLI output is untrusted), `testing.md` (guard tests need in-memory mutants). `.project/rules/` holds no stack companions. Standing note: free OpenCode's service port before an OpenCode worker launch (relevant to R5).

## Solution sketch (breadboard, NOT wireframe)

**Places**: `orca-contract.mts` and its snapshot (new), `orca-preflight.mts`, `orca-start.mts`, `orca-launch-gate.mts`, `orca-dispatch.mts`, `orca-ledger.mts`, `orca-policy.mts`, `workflow-doctor.mts`, `orca-vendors.md`, the Orca eval dataset and grader.

| Task | Slice | What it does | Files | Real launch |
|---|---|---|---|---|
| **R1** | R1a | Committed snapshot of the commands, flags and "Retired" markers we use, generated from `orca agent-context --json`; `orca-contract.mts` + test; doctor check. Added flags and commands pass; a removed or newly retired used flag fails; no `orca` on PATH is a skip | 5 | no |
| | R1b | `orca-vendors.md` section on the contract check | 1 | no |
| **R2** | R2 | Preflight requires a short named capability set when `runtime.capabilities` is present; guide words stay only when the list is **absent**. A present list missing a required name denies with a named reason and never falls back | 2 to 3 (fallback design needs no fixture edits) | no |
| **R3** | R3 | Carry `caller.refusal.code` (closed token shape only) into probe output and the preflight reason; label an external coordinator. **No change to launch authority** | 3 | no |
| **R4** | R4a | Optional ledger fields `requestId` and an args digest; reader, emitter and every fixture change in one commit | 3 to 4 | no |
| | R4b | Pass `--timeout-ms` below our kill deadline with a named margin (refuse <1 ms); settle an unknown outcome with `request-show` + `--retry-request` only on proof, under the launching identity and a matching digest | 4 to 5 | **yes** |
| **R5** | R5a | (superseded by the re-shape below) Config key and ONE resolver for the agent id (default `opencode2`; override; OpenCode 1 machines), owner file for the topic and a contract test; policy, config, example toon | 4 to 5 | no |
| | R5b | The gate probes the agent id it launches (a new `agentId`, separate from `vendor`); fallback to `opencode` once, on proof only; optional ledger `agentId` | 4 to 5 | **yes** |
| | R5c | Move the golden case to `executes` with a mutant that flips the fallback rule and a named test | 3 to 4 | after the spike |

**Connections and order**: R1a/R1b, R2, R3, R4a and R5a need no Orca state. One **owner-authorized real launch** (the deferred S3 capture) settles R4b and R5b/R5c together. **Stacking**: these slices edit files the open release PR (#9) also edits, and `feat/archify-replaces-state` and the PR branch each carry a different commit for the same 2.51.0 (`3a16a5f` vs `ccc89b7`). Build only on the branch that is merged to `main`; the first /plan task is to settle which. R5 is an AI-prompt scope (it changes the agent a dispatched worker runs on and its fallback); golden case `opencode2-default-fallback-needs-positive-proof` is registered parse-only now (the grader reports it as not executed) and R5c moves it to `executes`.

**R5 contract (re-shaped after S3; see `s3-capture.md`)**: policy, ledger and config keep vendor `opencode`. The agent id is resolved once from evidence: `orca agent installed --json` lists the ids the host can launch. If `opencode2` is installed use it, else if `opencode` is installed use it (on this machine OpenCode 2.2.6 is the `opencode` binary), else refuse with a named reason. The override `AI_WORKFLOW_ORCA_OPENCODE_AGENT` may name `opencode` or `opencode2` but only an id in the installed list launches. The gate checks the installed list for the exact id the dispatch will pass as `--agent`. There is **no fallback loop**: S3 showed the failure leaves a terminal behind and carries no proof, so it could never fire.

## Rabbit holes

**Resolved here**:
- *R1 reads a 421 KB schema, over the shared 262,144-byte bound* → R1 uses its own named, documented read bound with a test that the real schema fits, plus headroom; the shared bound is not raised for the other reads. `agent-context` takes no filter and needs no running app, so the check works in the doctor and in CI.
- *Capability names might change* → R2 requires a short named set, not the whole list, and falls back to the guide words when `runtime.capabilities` is absent.
- *R3 as first drafted would have changed launch authority* → corrected: diagnostics only (see the correction in the analysis).

**Resolved here (from /critique)**:
- *The gate does not see the agent id today* (`evaluateLaunch` takes only `vendor`; `--agent` is set from the same string at `orca-dispatch.mts:220`) → R5b introduces a separate `agentId`, resolved once and carried into both the probe and the args; `vendor` stays for policy and ledger.
- *A fallback needs a new attempt* (a replayed attempt key resumes; a new claim on the same task key is `task-owned`) → mark the first attempt `failed` only on proof, then reserve a new attempt key with a link to the first; the fallback leg counts against `maxRetriesPerTask`.
- *A present capability list lacking a required name must not fall back to guide words* → it denies; only an absent list uses the fallback (a bypass otherwise).
- *Ledger cannot say which agent ran* → optional `agentId` and `requestId`/digest fields land together in one schema change, with the reader, emitter and fixtures changed in one commit.

**Pushed to /plan as risk** (spike where marked):
- *Where a caller obtains the `req_…` id before a response is lost* and *the real refusal receipt for a bad `--agent`* (is it indistinguishable from other refusals, so the fallback would be unreachable?) — **spike**: one authorized real launch. R4b and R5b do not start without it. R5 may not add a refusal-code allowlist as proof unless the capture shows that code is emitted before anything is created.
- *Whether `opencode2` is the correct id for OpenCode 2.x and whether it shares the service port*, including a server that predates an upgrade — same spike; the default stays behind the override until observed.
- *`--retry-request` replay under a changed brief, agent id or paths; `request-show` visibility under a different caller identity* — store an args digest, refuse a mismatched replay, query under the launching identity; `absent` stays non-proof.
- *Orca-side `--timeout-ms` receipt versus our SIGKILL* — name the margin; map Orca's timeout receipt to a reason distinct from `launch-timeout`; test both orderings with in-memory mutants.
- *R1 false alarms and bound* — snapshot only what we use; one named bound shared by generator and reader; a missing snapshot emits one failure, not one per consumer.
- *Stacking on PR #9 and the duplicate 2.51.0* (see Connections) — and `maxRetriesPerTask` is unbounded in config but 0..2 in policy, an open followup that R5's fallback depends on; one owner decides.
- *Orca 1.4.272 is released but not installed* — upgrade, regenerate R1's snapshot, capture shapes before declaring a tested version.

**Pushed to no-go**: Orca decision gates for our confirmation gates, `--spec-file`, `worker-read` fallbacks, implicit Run creation, and consuming Orca's worker-stall notices (analysis R7 and R8).

## No-gos (this pitch)

- ✗ No change to launch authority: `evaluateLaunch` stays the only authority; `status.dispatchReady` and `caller` stay diagnostics.
- ✗ No weakening of fail-closed ownership: `absent` from `request-show` is never proof, and a timeout never frees a task.
- ✗ No fallback from `opencode2` to `opencode` without positive proof of a clean failure.
- ✗ No real worker launch, and no Orca Run or Task, without the owner's explicit authorization; no automatic cleanup or reset of Orca state.
- ✗ No new parsing of guide prose for a capability; no raising the shared output bound.
- ✗ Our scripts never install or upgrade Orca.
- ✗ A present capability list that lacks a required name never falls back to guide words.
- ✗ No refusal-code allowlist as proof of a clean failure without captured evidence.
- ✗ No policy or ledger vendor named `opencode2`; the agent id is a launch argument only.

## Critique findings

Five perspectives ran (knowledge-historian, skeptic, appetite-auditor, cross-pitch-projector, eval-regression-projector). The cross-pitch, skeptic and appetite reviewers had no shell, so their file-level claims were checked by me against git and the code; verified items are marked ✔. All findings are advisory.

| ID | Perspective | Sev | Type | Finding | Disposition |
|----|---|---|---|---|---|
| C1 | appetite-auditor | high | scope-overrun | ✔ R1, R4, R5 exceed 5 files; true total is ~24 (30 with fixtures), and 7 test files build a fake `status` (not 4) | Addressed: sub-slices R1a/b, R4a/b, R5a/b/c; R2 keeps the guide fallback so no fixture edits |
| C2 | skeptic | high | assumption | ✔ The gate takes `vendor` only, so "probes that id" has no mechanism | Addressed: R5b separate `agentId` |
| C3 | skeptic | high | rabbit-hole | ✔ Proof is only an explicit empty `residualResources`; a bad-agent refusal is probably unproven, so the fallback may be unreachable | Addressed: spike + no refusal-code allowlist no-go |
| C4 | skeptic | high | rabbit-hole | ✔ A fallback is blocked by `task-owned` unless the first attempt is marked failed on proof; ledger cannot record the agent id | Addressed: failed-on-proof then new attempt key; optional `agentId` |
| C5 | skeptic | high | assumption | `--retry-request` may replay a different request; `request-show` may be invisible under another identity | Addressed: args digest + launching identity; stays behind the spike |
| C6 | skeptic | med | assumption | Present-but-missing capability must not fall back to guide words | Addressed: no-go + R2 design |
| C7 | skeptic | med | rabbit-hole | R1 false alarms; `--timeout-ms` vs SIGKILL margin | Addressed: exit criteria named in the pitch |
| C8 | cross-pitch | high | overlap | ✔ Two different 2.51.0 commits (`3a16a5f` local branch, `ccc89b7` PR #9 branch); PR #9 edits `orca-dispatch/preflight/start/workflow-doctor` and the vendors doc | Pushed to /plan: first task settles the base branch |
| C9 | cross-pitch | med | overlap | workflow-v3-rollout touches `orca-policy`, `runtime/config`, doctor; `maxRetriesPerTask` bound is an open followup | Pushed to /plan: one owner for the bound |
| C10 | knowledge-historian | high | missed-knowledge | 14 entries added (see Knowledge consulted); the stale-OpenCode-server and unresolved model-preflight issues matter most | Addressed |
| C11 | eval-regression | high | eval-blind-spot | ✔ Case wording ("effects empty") did not match the code's proof rule; probe/launch mismatch, retry accounting, second writer, hostile receipt text, OpenCode 1, override, port, same-wave, rotation were unchecked | Addressed: case corrected and 11 variants added; R5c turns them into executed checks |

## Honest status

- This pitch is shaped, not built. No code changed except the grader registration and the dataset case; no Orca state was created.
- The grader reports the new case as **parsed, not executed**; the dataset claims nothing it cannot run.
- Everything about `opencode2` being right, the request id's origin and the real refusal receipt is **unverified** until one authorized real launch.

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/orca-api-currency-and-opencode2/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.


## Re-shape after S3 (owner chose "resolve the OpenCode agent id from evidence", 2026-11-23)
- Evidence: a real `--agent opencode2` launch failed with `command not found: opencode2` here; `orca agent installed` lists `opencode` only; the installed OpenCode is 2.2.6.
- R5 becomes: R5a (done, needs correcting) resolver; **R5b-1** resolver takes the installed list and returns an id or a named refusal, and `agent installed` is added to the contract snapshot; **R5b-2** the dispatch passes the resolved id as `--agent` and the launch gate checks the installed list for that id; **R5c** the renamed golden case `opencode-agent-id-resolves-from-installed-agents` moves to `executes` with a mutant.
- Dropped: the proof-gated fallback and the optional ledger `agentId` (the vendor stays `opencode`; the id is derivable from the installed list).
- R4b stays paused: the request id appears in refusal envelopes only and `request-show` cannot settle a refused start, so R4b needs its own owner decision.

## Re-shape of R4b around the request id (owner request, 2026-11-23)
Evidence: see the addendum in `s3-capture.md`. The only observed request id is `error.data.orchestrationRequestId` in a refusal envelope (a UUID); `request-show` says `absent` for it; a start's success receipt is unobserved; there is no caller-supplied id.
- **R4b-1 (buildable now, no new launch)**: pass `--timeout-ms` below our kill deadline by a named margin (refuse a derived value below 1 s rather than pass 0); capture the request id from a refusal envelope only when it is a lower-case UUID, keep it set-once in the ledger `requestId` field and print it in the human action together with the read-only `request-show` command; ownership stays `unknown-liveness`. No new Orca calls from dispatch, no `request-show` settlement, no `--retry-request`.
- **R4b-2 (gated)**: settlement through `request-show` and `--retry-request`. Blocked until a **successful** launch capture (S3b) shows a request id in a success receipt and what a timed-out start returns. If that capture shows no id, R4b-2 is dropped as a no-go and the pitch says so.
- **S3b (needs owner authorization)**: one real launch with `--agent opencode --full`, port freed first, to observe a success receipt, the request id, and OpenCode 2.2.6 under the `opencode` id.
- New no-gos: no `--retry-request` and no `request-show`-based settlement without an observed success-receipt request id; the envelope `id` is never treated as the request id.

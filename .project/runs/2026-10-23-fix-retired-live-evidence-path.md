# Shipped: fix-retired-live-evidence-path

Date: 2026-10-23. Appetite: bug-fix. State: shipped after explicit owner approval.

## Result and reconciliation

The historical-record regression now reads a durable evidence asset. Its previous pitch path was removed by compaction. The exact 36,920 original UTF-8 bytes are restored at .project/records/legacy-upgrades/state-ai-authoring-live-runs.md, and only the LIVE_RECORD constant changes in state-fragment-dataset.test.mts. The test's assertions, child timeout, output cap and sanitizer limits are unchanged.

The matrix remains historical: 72 runs, 51 pass / 21 fail, 12 seeded bad rows, one Cursor not-run row, and Claim: blocked. No model rerun or new quality claim is implied. Raw SHA-256 is 868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a; it equals the approved source candidate and proof. Source came from the previously approval-gated verified cache; ordinary tests do not read recovery archives.

One implicit scope is verified. No production runtime, schema, parser, assertion, skip or timing/security limit changed. No temporary package file, commit, push, pitch deletion or downstream rollout is included.

## Verification

| Check | Result |
|---|---|
| Exact approved restoration and one-line patch | Full bytes and before/after hashes match proof |
| Final isolated production dataset command | 54/54 passed, zero failures/skips; exit 0 |
| Independent final-cycle sequential child and parent checks | 347/347 child tests; 54/54 dataset tests |
| Full supported Node suite | 86 files; 2,712 tests; 2,709 passed, zero failed, three existing skips; exit 0; 436.955 seconds |
| Full-suite reuse proof | All 172 copied implementation-source hashes remain unchanged; audit changed records/knowledge only |
| Setup / graph / relations | READY, 25 checks / CLEAN, 120 entries and 339 knowledge links / zero problems |
| Retained records and links | 46 upgraded, zero legacy/partial/problems; saved approval hashes and retained supplement bytes unchanged; 48 record/issue files, zero broken links |
| Diff | Repair is exactly one changed test-path line plus the original asset; scoped whitespace check passes |
| Application build, typecheck, lint, i18n | No such commands exist in this Node workflow bundle; setup checks parse 175 TypeScript entries |

The mandatory pre-ship wrapper still fails with “No package.json or Muro document verifier found. Define project checks before shipping.” This uses the previously owner-approved direct-check route for this package-less repository, documented in the Oct22 ship-verification run. That route does not waive failed tests. The unchanged full suite is retained rather than rerun after record-only changes; focused final checks and source-hash comparison verify the same implementation.

## Audit and remaining risk

Cycle 1 completed code, security, coverage and cross-pitch reviews; all planted controls were detected. A subsequent final dataset run recorded one unnamed child failure (346/347), causing 16 dependent parent failures. Its cause is unconfirmed. Returning to the final permitted bug-fix audit cycle, a fresh reviewer independently passed sequential child and dataset checks, verified exact bytes/bounds and identified the existing diagnostic limitation. The final isolated production dataset run passed too. Passing reruns do not establish the first failure's cause.

FRLE-D1 defers bounded failing-child diagnostics; current reporting emits aggregate counts without the failing TAP name. Reason: this is an existing observation gap outside the exact restoration scope, with no latest required exit failing. The earlier sanitizer timing-under-load backlog remains its own owner; no causal claim or limit relaxation is made here. Cycle cap is reached: any further required verification failure must stop closure and return to shaping, not start cycle 3.

## Knowledge, followups and documentation

One issue was extracted: live-test-evidence-outlived-its-pitch-path, linked to existing compaction, deletion-intent and schema-dependent-reader lessons. The graph was rebuilt and validates. No new pattern or rule was added. One diagnostic backlog item was added (FRLE-D1); existing timing and package-less wrapper items remain authoritative. No product or architecture document change is needed for a test-input ownership repair.

## Approval and closure

The owner approved this exact proposal on 2026-10-23. Approved proposal hash: sha256:76c161eec910d7f4f7e3058236ab1907ded3b1d3d0f936dfa8e302b24ab44475. Closure publishes this receipt and the dated run, moves only this repair to Recent ships, and increments the cooldown counter once. No consolidation track, commit, push or downstream rollout is closed by this receipt.

## Preserved build and verification log

# Fix: retired live-evidence path

Symptom: state-fragment-dataset.test.mts fails ENOENT for the removed state-ai-authoring/live-runs.md record.
Root cause: the regression reads a removable pitch path while compaction retained its summary, not the complete machine-readable historical matrix.
Planned fix: restore the exact original matrix to records/legacy-upgrades/state-ai-authoring-live-runs.md and repoint one LIVE_RECORD constant; preserve Claim: blocked.

## Triage and scope

Separate bug-fix step; not a fourth cycle of connected-memory-consolidation's exhausted audit. Root cause is confirmed by the current live-record test. Graph knowledge search found the missing-file lesson and schema-dependent-reader lesson; this is an intended historical move with an identified live consumer, not an arbitrary file restoration.

Authored code change: one constant path. Historical data restore: 36920 exact original UTF-8 bytes, normalized body hash sha256:2fad1150d2cb1b0b4455560ac4c38ad4d027c3613186dc7d4d062578ce30f092, matching the already committed state-ai-authoring v2 ledger otherFiles binding. No archive re-opened; source is the previously receipt-approved and verified batch-8 full cache. Source archive identity/manifest and raw candidate hash are in source-proof.toon. No data model, parser, assertion, security bound, test skip or outcome changes. Three prose references remain historical; no existing supplement or source archive is rewritten.

## Concrete review material

- repair.patch shows the exact one-line test change.
- live-runs.candidate.md is the complete asset proposed for the durable path, without edits.
- source-proof.toon binds old/new test hashes, original source and candidate bytes.

The same record parser computes blocked from all 72 recorded runs, twelve seeded bad rows and Cursor not-run; the unique Claim: blocked line is retained. This is preservation of old evidence, not a live model rerun or new quality claim.

## Current-session scratch proof

An isolated tree carries unchanged runtime/test modules, both datasets, the exact historical matrix, the one-line candidate and required skill/contract fixtures. Dataset test: 54 tests, 54 pass, zero failures/skips. It runs all four fragment child suites and validates the recorded claim. Two early incomplete-fixture runs failed on missing imported catalog/skill/contract inputs; those are retained as failed fixture attempts, not implementation failures or proof of a pass. Final log /private/tmp/live-evidence-repair-focused-final.log. Production test/source paths remain unchanged.

## Required build exits after approval

Recheck candidate/source and old test hashes; publish exact asset and one-line change. Run the existing dataset suite and full Node suite with supported --workers 1, without changing FUZZ_TIME_BOUND_MS=1000. Run relevant record links, graph/setup checks; review this separate bug-fix scope under its own audit gate, then return to consolidation closure. No application build exists. Final ship is separate.

## Triage gate

Approve / Revise / Back / Stop. Approval confirms root cause and this exact two-file restoration/repointing scope and permits its build; it does not approve consolidation ship or waiver of the full suite.

## 2026-10-23 — approved build applied

Owner approved the exact restoration/repointing scope. Candidate raw and normalized hashes matched source-proof.toon and the retained v2 source binding. Published the exact 36920 bytes and changed only the approved constant; resulting test hash matched the proposed after hash. Verification pending; no new historical quality claim.

## 2026-10-23 — build exits verified; build-end gate pending

Exact production dataset command: node --test ai-framework/scripts/state-fragment-dataset.test.mts, exit 0; 54 tests, 54 pass, zero failures/skips. Full supported command: node ai-framework/scripts/run-tests.mts --runtime node --workers 1, exit 0; 86 files, 2712 tests, 2709 pass, zero fail, three existing skips; 436.955 seconds. Logs: /private/tmp/live-evidence-repair-production.log and /private/tmp/consolidation-final-node-tests-unrestricted.log. The first full attempt was interrupted after sandbox lease/socket restrictions; clean unrestricted run is the pass evidence.

Setup READY (25 checks), graph CLEAN, relations zero problems, all 47 retained supplement/asset link checks pass. The complete historical matrix is still byte-identical to the approved source candidate and the test differs by one line only; no new skip or timing/security bound change. No application build applies to this Node workflow bundle; parse validation is in setup-validator and runtime behavior is exercised by the full suite. No new regression test is needed: the existing failing historical-record assertion now passes unchanged against the durable original. Build complete; own fresh audit remains gated.

## 2026-10-23 — separate audit complete

Required code/security/coverage/cross-pitch checks complete, zero production findings. All reviewers caught the deliberately inconsistent comparison. Exact raw bytes/hash, unchanged consumer assertions/bounds and54/54dataset checks independently verified. See audit-cycle-1.md and shared validated review records. Clean bug-fix audit auto-flows to ship preparation; final closure remains separately gated.

## 2026-10-23 — final verification incident and audit cycle2

The mandatory package-less wrapper again failed with its known no-package/no-Muro route; the previously owner-approved direct-check route remains the verifier method, not a failing-test exemption. During direct verification a dataset parent command failed (one child346/347,16 dependent parent failures), with no child name retained; cause unconfirmed. Direct child347/347 and sequential parent54/54 then passed. Returned to the final permitted bug-fix audit cycle.

Fresh coverage review independently passed sequential347/347 children and54/54 parent, verified exact original bytes/hash and unchanged bounds, caught the comparison control, and deferred the verified diagnostic gap to FRLE-D1. No assertion/time-bound/code change. Read-only guard clean. Initial reviewer commands used unflagged Node22.11 and failed before loading tests; corrected to trusted Node24.21.0 with flags, preserving those invocation failures. Cycle cap now reached: any further required final-check failure must stop ship, not start cycle3.

## 2026-10-23 — final ship proposal ready

After clean cycle2, ship startup confirmed orca=normal bypass. Graph rebuilt after one linked issue extraction:120 entries,339 knowledge links; setup READY25 checks,175 TypeScript files parse; relations zero problems;48 record/issue links clean. All172 implementation hashes unchanged from the full2709-pass/0-fail/3-skip suite. Final actual dataset ran in isolation and passed54/54. Exact asset and before/after test hashes still match proof. FRLE-D1 is the sole new followup; no code/assertion/bound change. Proposal and machine evidence are ready; final close/status/cooldown writes are pending owner approval.

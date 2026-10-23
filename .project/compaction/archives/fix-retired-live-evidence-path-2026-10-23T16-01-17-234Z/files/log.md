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

## 2026-10-23 — shipped with explicit owner approval

Validated the exact approved proposal and unchanged artifact/test hashes; published SHIPPED.md and dated run with the complete preceding log. Moved only this repair to Recent ships and advanced cooldown from0to1. The owner also accepted P2d/P2c audits and authorized their ship preparation; consolidation tracks are not closed here. No commit, push, source deletion or downstream rollout.

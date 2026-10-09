# Audit cycle 2 — codex-orca-coordinator-parity

Dispatched: code (Sonnet, independent: no) | security (Sonnet, independent: no) | test (Sonnet, independent: no). These were fresh focused Orca workers; all original reports and exact prompt hashes are in `review-*-c2.md`. Cross-pitch did not change after its cycle-1 disposition, so it was not redispatched. UI/i18n/eval remain not applicable.

## Must-fix

None. All confirmed changed-scope issues are fixed or have an explicit boundary/disposition below. Audit is complete and awaits the required big-batch ship gate.

## Verified fixes and residual findings

| ID | File | Finding | Verified | Evidence / disposition |
|----|------|---------|----------|------------------------|
| S1 | ai-framework/scripts/workflow-doctor.mts:303 | Echo/comment/trailing-shell text could pass wiring validation | yes | Exact legacy invocation or anchored guarded assignment + exact final invocation now required. Scratch repro failed before patch; new four-input regression and legacy/installed positives pass. Code/security/test reviewers executed the patch tests. |
| S2 | ai-framework/hooks/scripts/orca-start-codex-hook.test.mts:135 | Input boundary and post-probe elapsed check needed isolated proof | yes | Exactly65536 bytes passes,65537 blocks; injected late-ready result blocks. Removing post-probe guard produces ready and the assertion catches it. All three reviewers reran focused checks. |
| S3 | ai-framework/integrations/harnesses.md:71 | Git-bootstrap exception to adapter off behavior was implicit | yes | Docs require Git/checkout and explain pre-switch blocking; exact-shell test asserts both on/off when Git fails. Non-Git support explicitly deferred in deviations.md. |
| S4 | ai-framework/hooks/scripts/orca-start-codex-hook.mts:32 | Trusted-registration root missing/relative cases | yes, constrained | Direct matching invocation blocks invalid-root; installed hook resolves/passes root. Unsupported invocation hardening deferred; no payload redirect or unsafe ready output reproduced. |
| S5 | ai-framework/hooks/scripts/orca-start-codex-hook.test.mts:178 | Wall-clock timer/exit-spy and fixture limitations | yes, acknowledged | Unit behavior remains tested. Host activation/real host timeout handling stays unverified under approved criterion7, no fixture-to-host claim. |
| S6 | ai-framework/hooks/scripts/orca-start-codex-hook.mts:33 | Config-file switch read precedes script timer | yes, inherited boundary | Existing shared reader confines root, checks regular-file type and64KiB size. No stall was reproduced; changing shared runtime APIs is outside this pitch. Record as acknowledged, not a demonstrated security defect. |

## Canary verification and review limits

The second-cycle copies contain a timeout3 canary; the checkout remains timeout8. All three reviewers identified it, and baseline/registration mutant proof exited0/1. The canary was described in copied deviation records, so recognition is not blind independence proof. No independent: yes claim is made. Reports that call this a real checkout defect are rejected after checking the actual JSON and passing installed-registration test. Some reviewers skimmed or did not exhaustively read canonical rule prompts and did not execute full suites/Bun; preserve those limits. Author-run checks below supply actual integration evidence and are not labeled independent review.

## Author-run verification

- Final seven-file Node suite:170 tests,169 pass,1 existing skip,0 fail (`node-audit-tests-plain.txt`).
- Final same-file Bun suite, after Node completed:170 pass,0 fail (`bun-audit-tests.txt`).
- Node coverage on the changed hook/doctor test files:59 tests,58 pass,1 existing skip,0 fail (`node-audit-coverage.txt`). New hook:100% line /80% branch /100% function. New doctor wiring function has no uncovered lines;100% changed-function line coverage. Whole pre-existing doctor:78.90%; no whole-file90% claim.
- Instrumenting the entire seven-file suite adds `NODE_V8_COVERAGE` and breaks an existing exact-environment assertion in `orca-start.test.mts:413`; the uninstrumented suite passes. Keep the failed instrumented transcript separately (`node-audit-tests.txt`) and use focused coverage, without weakening the environment assertion.
- Doctor exits0; startup wiring passes; production boundary0 violations/0 unparsed. Legacy test-import warning remains. Setup validator READY,22 checks. Graph CLEAN,62 entries. Mirror and `git diff --check` pass.
- Nine implementation files,782 added/removed/new-file lines, within the1500 cap; final file hashes in `audit-final-implementation.json`.
- Fresh Codex host ready-context and blocked-phase cases remain unverified; no hook trust bypass/global config edits. Live coordinator lifecycle proof remains separate.

Evidence files above are in `.project/metrics/codex-orca-parity/` (Git-ignored local evidence). No commit, release-history update or ship record was created.

## Reviewer resource settlement and integration

Nine audit reviewer attempts completed through their own `worker_done`, were accepted by `orca-run collect`, released using their exact Dispatch identities, and settled only after released-resource/exited-liveness proof. Final Run worker-list has15 workers total (critique/build/audit),0 unreleased. Deliveries are acknowledged. Shared-checkout implementation edits were already present and approved at the build gate; reviewers made no edits and no separate worker patch awaits application. No reconciliation-library or isolated-worktree-cleanup proof is claimed.

## Guard incident and correction

I initially used the existing repo guard without checking ignored files. It hashed `.claude/settings.local.json`, contrary to the no-secret-read rule, although no contents were displayed. I replaced its final use with injected RuntimeDeps that exclude all secret-name reads and removed the saved secret checksum from the temporary snapshot. The corrected guard returned `clean:true`, `changed:[]`, and `secretContentsExcluded:[".claude/settings.local.json"]` (`audit-guard-secret-safe.json`). All scratch copies excluded secrets. The review-bench CLI needs a separate follow-up to exclude secret paths itself; this audit did not expand the nine-file implementation scope. Earlier ordinary guard outputs are not secret-safe claims.

## Gate

The audit skill requires **Approve → /ship / Revise / Back to /build / Stop** for this big-batch pitch. Ship remains pending approval; it will perform final verify, release history, knowledge capture and status compaction.

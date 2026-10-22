# Proposed upgrade-fixture repair — 2026-10-18

**State:** prepared and verified in a disposable copy; not applied to the checkout. S3 remains downhill 75% because the real full suite has three failures.

## Problem and proof

The wave-end Node suite reports 1,687 total, 1,681 passed, 3 failed and 3 skipped. All three failures come from `ai-framework/scripts/runtime/upgrade.test.mts`: the historical install's project-owned `.gitignore` lacks the eval runs/cache rules required by the pre-existing dirty workflow doctor. Its README-only omissions already have separate handling.

[SETUP.md](../../../SETUP.md) requires merging the bundle's ignore rules into each project. Bundle-sync preserves project-owned files; the simulation performs config migration but omits this documented post-sync ignore merge. No S3 prompt or owner change created the missing fixture data.

Read-only attribution: current safely filtered bundle sources with only the copied doctor replaced by HEAD pass all three upgrade tests: 3 passed, 0 failed, 0 skipped, 236,029 ms. No checkout file was reverted.

## Concrete change

Add six lines to `migrateConfig` in `runtime/upgrade.test.mts`. Read the temporary project's `.gitignore`; append `.project/evals/runs/` and `.project/evals/.cache/` only when absent. Preserve every existing rule and keep the doctor's new enforcement. The six-line [reviewable patch](../../metrics/instruction-compression/s3-preparation/proposed-upgrade-fixture.patch) is prepared.

The unchanged current bundle plus this patched disposable test passes all three simulations: 3 passed, 0 failed, 0 skipped, 235,472 ms. A first preview ran from an invalid nested Git archive root and did not exercise the fix; its failed log is retained separately. The verified rerun anchors only the disposable harness root to the actual repository. The proposed real patch contains no root override.

## Proposed boundary and verification

Authorize this one additional implementation path: `ai-framework/scripts/runtime/upgrade.test.mts`. The approved plan explicitly excludes runtime helpers/upgrade tests from S3's named paths, so the patch is not applied silently. VERSION/CHANGELOG remain within the existing allowed set; record the fixture repair through the normal script if required. Current churn is 1,405 / 1,500 lines. The six-line patch and a bounded version entry fit within the existing cap; no cap increase is proposed.

After applying: rerun the real upgrade tests and full Node suite, then setup/changelog/graph/diff checks. Keep S3 incomplete until its required exits pass. All future S3 scope, build-end, actual audit and ship gates remain. This does not approve shipping, commits or publication.

## Gate

**Approve** the one-path fixture repair and its checks; **Revise** the repair; **Back** to planning/defer S3; **Stop**. This gate changes the approved file boundary; it does not declare the current failing full suite clean.


## Approved revision completed — 2026-10-18

The recommended revision is approved, applied and verified. S3 remains rejected/deferred and its four source/test files are restored exactly. The actual six-line fixture repair passes all three upgrade simulations; the complete Node suite passes 1,683 tests with zero failures and three existing skips. Current delivery and its R1/build-end approval gate: [build-completion.md](build-completion.md). Earlier trial and proposal statements above remain historical observations, not current unresolved application work.

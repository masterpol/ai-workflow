# Source-review supplement: orca-vendor-reconcile

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/orca-vendor-reconcile.md) for the 2026-10-08 reconcile-core releases 2.15.0 and 2.15.1. Results below are historical evidence, not a new runtime certification.

## Scope and build decisions

The user approved Waves A and B together at approximately 2,400 lines against the 1,500-line cap despite the recommendation to split. Core shipped diff admission, snapshot/apply/rollback, evidence/cleanup and orchestration, documentation and release records. Grader, phase wiring and integration mirrors belonged to separate integration work. Earlier sketch language including them and the proposed Wave-B split did not override final approved scope.

Core used injected RuntimeDeps and real temporary Git repositories/worktrees under Node and Bun. Simulated hostile worker trees did not establish live Codex/OpenCode completion or peer messaging. During R2, a failed scratch-directory change preceded git add -A and git reset --hard in the real checkout. Recovery re-applied the staged diff; coordinator checks found unchanged HEAD and expected files/status, with no loss identified within that verification. Subsequent instructions prohibited add, reset, checkout, stash or clean outside an absolute-path scratch repository, and required stopping on a failed directory change.

Current [Orca documentation](../../../ai-framework/integrations/orca-vendors.md#reconcile-core-opt-in-library-only) owns admission, guarded apply, baseline/combined-check ordering, evidence retention and cleanup behavior. The [Git guard pattern](../../knowledge/patterns/git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded.md) and [patch-bound settlement pattern](../../knowledge/patterns/settle-only-with-proof-bound-to-this-patch.md) retain the lasting hostile-tree, evidence, resume and settlement lessons. Tests inspect actual Git effects and rerun checks; worker reports alone never establish integrated correctness.

## Review and commit provenance

Original closure reported 38 reconcile and 19 evidence tests, with final cycle-3 fixes not yet independently re-reviewed. A later log records an independent canary-tested review confirming those two fixes, with zero must-fix and five should-fix items. Subsequent fixes pinned cleanup to evidence hash/worker HEAD, added filter/gitlink re-guard tests, reported settled attempts after cleanup exceptions, corrected mixed resumed/fresh-worker checks and guarded baseline checks. The log reports author mutation proof and 41 reconcile/21 evidence tests afterwards, not another independent review. The compact record calls these a follow-up commit; that log entry provides no commit identifier.

A post-ship clean export of fb38efd failed because staged orca-apply tests imported another session's untracked runtime/test-helpers.mts. Commit 41cc88d restored a self-contained test while preserving the concurrent working-tree refactor; all nine Orca test files passed on its clean export. Passing a shared working tree can hide missing committed dependencies: inspect staged content and validate an export of the index tree before committing.

## Historical assurance and limitations

Acknowledged limits included admission's separate 120-second budget rather than caller deadline, an ignored-path check missing global excludes, unpruned snapshot directories and an unchecked recordFinalState result. Checks ran worker-authored code with readable HOME and no sandbox. Concurrent reconcile processes and human edits between cleanup decision/execution were not exercised; immediate rechecks reduced that gap without proving race coverage.

CRLF, ident and working-tree-encoding configurations could safely refuse; apply.whitespace, eol and autocrlf could transform bytes. Evidence/cleanup compared actual bytes. Executable bits on FAT/Windows tended toward refusal rather than demonstrated compatibility. Removed guards sometimes remained masked by another guard, leaving equivalent/unproven mutants; later review added filter/gitlink re-guard tests. Earlier Bun failures involved a concurrent half-written file and a collector-lease flake under load; final reported counts remain historical. Earlier hill positions, superseded counts, shell aliases and scheduling add no further behavior. Historical open items require comparison with later work before being called current defects.

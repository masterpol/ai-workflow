# Rollout: token-attribution

Ordering: the hook and collector changes land before `workflow-v3-rollout`'s next bundle-sync (that pitch is still `shaped` in `.project/status.md`).

Scratch dry run, 2026-10-19: base `633adb3` exported with `git archive`, then `bundle-sync.mts --source <this checkout> --json` run from it. Exit 0. Counts only: 7 new files, 0 changed, 0 local, 0 conflict, 0 removed, 0 flagged, 15 unverified. `transcript-usage.mts` appears in the output, so the new reader reaches synced projects.

Next step for `workflow-v3-rollout`: re-run its scratch-copy dry run (readiness.md method) against this checkout before its sync.

Operator step for any project that syncs this: restart OpenCode (and any process that loaded the old collector). Until then it skips events with "newer than this collector understands"; nothing is corrupted.

# Installed Orca verification

Date: 2026-10-07. Scope: follow-up request to verify local feasibility.

## Observed facts

- `/Applications/Orca.app/Contents/Info.plist` reports version `1.4.222`.
- Claude, Codex, and OpenCode executables are present on PATH. Installation does not prove authentication, model availability, or successful work.
- Installed CLI specs include `orchestration worker-start`, task dependencies, explicit base branch, isolated worktree placement, worker settlement, inbox/message operations, and the three requested agent IDs.
- Installed bundled guides describe supervised dispatch, Run-scoped peer messaging, attempt-specific completion, and reconciliation ownership. These agree with the interfaces used in the proposal.
- `/Applications/Orca.app/Contents/Resources/bin/orca` exists as the application-bundled launcher.
- `/usr/local/bin/orca` is a root-owned symlink with mode `lrwx------`. Symlink inspection reported permission denied. The launcher resolves its own path with `readlink`; inability to resolve the link is a plausible cause of the failure, not a proven diagnosis.
- `orca skills get orca-cli --json` fails inside and outside the sandbox with `Unable to determine Orca.app path from symlink: /usr/local/bin/orca`. This is not fixed by sandbox escalation.

## Current conclusion

The installed application contains the proposed interfaces, rather than merely a newer upstream documentation claim. Live launch, authentication, peer delivery, settlement, isolation, and reconciliation remain unverified because the selected launcher fails.

The installed orca-cli skill says: “If the selected executable cannot run, report its exact error and stop. Do not fall through to another executable, which could silently target a different Orca build.” Approval was requested to select the application-bundled launcher explicitly. No switch, application repair, worker creation, or Orca message was performed pending that decision.

## Prepared live verification scope

After approval, select the bundled launcher once and load its version-matched guides. Inspect runtime status and agent availability. Prepare a disposable Git fixture outside this checkout, with an explicit baseline and three independent tiny modules. Launch one supervised worker per requested vendor in isolated checkouts, using configured vendor defaults. Exercise a Run-scoped peer question and response with receipt evidence. Collect attempt-specific completion and actual module outputs, reconcile in the scratch coordinator checkout, and run combined behavior checks.

Use only the scratch task and its created resources. Preserve uncertainty on partial launch or missing liveness, and follow installed recovery receipts. Settle and release created workers through the documented lifecycle; retain outcome evidence outside disposable worker checkouts. No commits, source edits, or publications in the workflow repository are part of this test. This smoke test cannot by itself prove general speed, cost, or quality improvement.

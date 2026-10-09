# Online feasibility verification

Date: 2026-10-07. Follow-up explicitly requested online verification. Sources below are official Orca documentation and repository files; no local workers were started.

## Verified interfaces

| Requirement | Evidence | Conclusion |
|---|---|---|
| Launch Claude, Codex, OpenCode | [Worker CLI specification](https://github.com/stablyai/orca/blob/main/src/cli/specs/orchestration-worker-specs.ts) lists all three agent IDs and supervised `worker-start` | Supported interface |
| Main agent supervises independent work | [Orchestration guide](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration.md) defines coordinator, Tasks, Dispatches, dependencies, completion and recovery | Supported coordination primitives |
| Parallel isolated writers | [Placement reference](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration/references/placement-and-remote.md) supports child/top-level worktrees; [worktree documentation](https://www.onorca.dev/docs/model/worktrees) explains checkout isolation | Supported placement |
| Workers communicate across vendors | [Messaging reference](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration/references/messaging-and-gates.md) defines dispatch mailboxes and Run groups including `@claude`, `@codex`, `@opencode` | Supported; receiving workers must read inboxes |
| Track completion and retain ownership | [Official orchestration documentation](https://www.onorca.dev/docs/cli/orchestration) specifies attempt IDs, outcome reporting, inspection and release | Supported lifecycle |

## Newly surfaced prerequisite

[Official orchestration documentation](https://www.onorca.dev/docs/cli/orchestration) labels orchestration experimental and instructs users to enable it under Settings → Experimental. Runtime status must succeed before using orchestration. Foundation preflight must verify that the feature is enabled/available; it must not toggle that setting automatically. A disabled feature selects the normal workflow before launch.

## What the workflow must implement

Inference from these documented primitives: any supported invoking harness can act as coordinator and launch other configured harnesses. The sources do not establish our proposed per-coordinator configuration schema or automatic routing as existing Orca behavior. Those are workflow adapter responsibilities, along with independent scope selection, role assignment, baseline preparation, integration and final combined checks.

Peer messaging is asynchronous. Enqueue is not proof of reading or acting. Unknown worker liveness is not failure; no replacement writer may start until ownership is settled. The normal workflow fallback is our adapter policy, not an automatic Orca failover guarantee.

Model-selection details vary across fetched documentation/source snapshots. The coordinator guide describes restricted OpenCode overrides in existing worktrees, while the fetched CLI specification still describes OpenCode using its own configuration. Treat vendor defaults as the compatible initial path, and pin the installed version before adding model overrides.

## Limits

Online evidence establishes technical feasibility, not successful operation of this installation. The selected local launcher remains broken as recorded in `runtime-verification.md`. These sources establish no guaranteed speed, cost, or code-quality improvement for this workflow. Measure coordinator/worker/integration overhead and integrated acceptance results before claiming improvements.

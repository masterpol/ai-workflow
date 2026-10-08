# Orca feasibility investigation

Date: 2026-10-07. Read-only investigation; no Orca worktrees, terminals, messages, installations, or lifecycle state were created.

## Conclusion and evidence limits

The proposed capability is feasible against current upstream documentation. Local support is unverified: the selected executable `/usr/local/bin/orca` failed on `orca skills get orca-cli --json` with `Unable to determine Orca.app path from symlink: /usr/local/bin/orca`. The installed orca-cli skill requires reporting this error and stopping Orca commands rather than switching executables. No installation repair was attempted.

Upstream `main` is mutable and may be newer than the installed application. The planner must capture the installed version-matched guide and pin the interface before implementing dispatch. Documentation proves interface availability, not successful local operation or performance.

## Documented surfaces

| Capability | Evidence | Status |
|---|---|---|
| Claude, Codex, OpenCode side by side | [Official README](https://github.com/stablyai/orca) | Documented |
| Run/Task/Dispatch, supervised completion, ownership and recovery | [Official orchestration guide](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration.md) | Documented |
| Worker communication and group addresses including all three vendors | [Messaging reference](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration/references/messaging-and-gates.md) | Documented |
| Isolated child worktrees and explicit existing-workspace placement | [Placement reference](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration/references/placement-and-remote.md) | Documented |
| Model preferences and OpenCode limitations | [Coordinator reference](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration/references/coordinator-loop.md) | Documented |
| Runtime identity, launch/send receipts, terminal discovery | [CLI guide](https://github.com/stablyai/orca/blob/main/skill-guides/orca-cli.md) | Documented |
| Launch, receive, reconcile in this checkout | Installed CLI discovery failed | Not verified |

Peer messaging uses dispatch addresses or Run groups. Enqueue does not prove receipt; agents must check their inbox at checkpoints. Completion requires a valid attempt-specific report, not terminal idleness. These are coordination rules that the workflow adapter must preserve.

## Proposed instance configuration

Example only; path, schema, and defaults are subject to /plan. This is workflow policy, not an existing Orca configuration format.

```json
{
  "schemaVersion": 1,
  "mode": "auto",
  "maxConcurrentWorkers": 2,
  "maxRetriesPerTask": 1,
  "coordinators": {
    "claude": {
      "workers": ["codex", "opencode"],
      "roles": {"implementation": "codex", "review": "opencode"}
    },
    "codex": {
      "workers": ["claude", "opencode"],
      "roles": {"implementation": "claude", "review": "opencode"}
    },
    "opencode": {
      "workers": ["claude", "codex"],
      "roles": {"implementation": "claude", "review": "codex"}
    }
  }
}
```

The launching harness sets coordinator identity; configuration chooses eligible other vendors. OpenCode is a harness, not necessarily a distinct model provider. Cross-harness review is not proof of independent models. Role routes must resolve to enabled workers; unsupported identities, malformed policy, or no ready alternate vendor produce a diagnostic and the normal workflow before any launch. Never infer authorization to install or authenticate from an enabled vendor.

Use all enabled alternate vendors across useful independent scopes or review assignments. A two-worker cap bounds simultaneous launches. Dependencies, ownership conflicts, and a single atomic task can reduce concurrency. Missing policy behaves as the normal workflow. Configuration remains instance data; only portable templates and adapter machinery sync.

## Reconciliation and fallback contract

The current agent retains task ownership and final accountability. Worker reports contain dispatch/task IDs, baseline identity, changed files, outcome, checks, and remaining blockers. The coordinator inspects actual changes, verifies claims, resolves integration conflicts, and validates the combined tree before normal audit/ship gates.

Preflight fallback is straightforward. Post-launch fallback is a recovery operation: unknown liveness does not authorize a retry or replacement writer. Preserve residual resources and completed changes; settle ownership first. Dirty checkout handling must avoid losing unrelated edits or silently giving workers stale inputs. No automatic commits or publication are implied by this pitch.

## Proposed validation

- Pure policy and preflight cases with fake CLI receipts: all coordinator permutations, disabled/missing/malformed configuration, unavailable vendor, missing capabilities, and worker recursion guard.
- Lifecycle behavior: partial start, duplicate delivery, stale completion, pending questions, unknown liveness, retries after proven settlement, and restart recovery.
- Local sandbox smoke runs: each vendor launches a tiny isolated task; one peer message is received and answered; coordinator reconciles independent results and runs combined acceptance checks. Use an explicitly prepared baseline.
- Comparison against normal workflow: elapsed time including reconciliation, attributable reported cost including all workers and coordinator, acceptance failures, and rework. If cost data is incomplete, cost improvement remains unproven.

Existing checkout changes include OpenCode adapters and `ai-framework/integrations/harnesses.md`; the future implementation must preserve those edits and recheck overlap during /plan. No source edits were made by this investigation.

## Critique additions

The independent appetite pass projects approximately 19 files / 1900 LOC. The initiative is split into foundation (approximately 7 files / 550 LOC) and dispatch (approximately 12 files / 1350 LOC); estimates include shared-file overlap and must be recounted with all mirrors and release records during /plan. Foundation does not activate delegation by itself. Dispatch needs a separate bet after foundation and installed-version evidence.

Recovery records distinguish absent, refused, corrupt, and readable outcomes. A refused or corrupt record never authorizes fresh editing. Verified completion evidence must be retained in coordinator-owned storage outside resources that cleanup can retire, and checked again at cleanup. The preflight and reconciliation mechanisms require independent review before their guarantees are used.

The fixture dataset contains shaping specifications, not executed tests. Planning must define executable graders and concrete stateful receipt traces. Live runtime validation remains a separate requirement. More than one harness may use the same underlying provider/model; vendor variety alone does not establish quality improvement.

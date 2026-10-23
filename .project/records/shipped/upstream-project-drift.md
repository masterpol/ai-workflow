---
slug: upstream-project-drift
shipped: 2026-10-16
schemaVersion: 1
---
# upstream-project-drift

Improvements fixed by hand in three downstream projects were classified in a 178-row ledger and the portable ones taken into the base (release 2.23.0).
The base gained task ownership, runtime child ownership, hook hardening, a strict Orca minimum version and an OpenCode port step.
No project was synced or edited; the ledger and sync proof hand the rollout to workflow-v3-rollout.

- outcome: The base absorbed the portable downstream fixes, and the remaining drift is classified for the rollout.
- docs: [drift ledger analysis](.project/analysis/2026-10-16-upstream-drift-ledger-analysis.md)
- decisions: [build decisions and deviations](.project/records/legacy-upgrades/upstream-project-drift.md#build-decisions-and-deviations)
- knowledge: [reconcile every worker of a wave](.project/knowledge/patterns/reconcile-every-worker-of-a-wave-before-committing-any-scope.md)
- code: [opencode service](ai-framework/scripts/opencode-service.mts), [orca preflight](ai-framework/scripts/orca-preflight.mts), [runtime node](ai-framework/scripts/runtime/node.mts)
- verification: [verification history](.project/records/legacy-upgrades/upstream-project-drift.md#verification-history)
- followups: [release state and open items](.project/records/legacy-upgrades/upstream-project-drift.md#release-state-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/upstream-project-drift.md)

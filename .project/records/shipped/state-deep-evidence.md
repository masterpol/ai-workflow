---
slug: state-deep-evidence
shipped: 2026-10-21
schemaVersion: 1
---
# state-deep-evidence

State snapshots gained four additive sections, architecture, history, risks and tokens, built from bounded, guarded inputs with schemaVersion still 1 and missing data reported as unavailable rather than zero.
Release 2.39.0 shipped with the monorepo package map cut and 1667 added lines against a 1350 cap, accepted by the owner in writing.
The live matrix was blocked by two 0.50 regressions and unrun OpenCode and Cursor rows; the owner accepted the risk without relabelling any result.

- outcome: Deep evidence facts ship with explicit exceptions for size and live quality; no clean cross-vendor AI-quality claim is made.
- docs: [state report guide](ai-framework/integrations/state-report.md)
- decisions: [state report design](.project/knowledge/decisions/project-state-report-design.md), [audit and owner decisions](.project/records/legacy-upgrades/state-deep-evidence.md#audit-and-owner-decisions)
- knowledge: [scrubbing bypass](.project/knowledge/issues/snapshot-metadata-bypassed-output-scrubbing.md), [guard snapshot cap](.project/knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md), [package-less wrapper](.project/knowledge/issues/package-less-bundle-ship-wrapper-cannot-select-checks.md)
- code: [graph](ai-framework/scripts/state-graph.mts), [history](ai-framework/scripts/state-history.mts), [snapshot](ai-framework/scripts/state-snapshot.mts), [dataset](.project/evals/datasets/state-deep-evidence.json)
- verification: [verification history](.project/records/legacy-upgrades/state-deep-evidence.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/state-deep-evidence.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/state-deep-evidence.md)

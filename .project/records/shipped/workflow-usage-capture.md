---
slug: workflow-usage-capture
shipped: 2026-10-22
schemaVersion: 1
---
# workflow-usage-capture

Claude lifecycle hooks and OpenCode plugin events now feed metadata-only workflow usage capture through the existing state boundary.
Eight capture-owned Claude hook groups are validated by the doctor; the bounded CLI never blocks and exits 0.
OpenCode user-turn timing is unverified, so wait stays Unavailable; Codex and Cursor capture is out of scope.

- outcome: Workflow usage events are captured automatically from Claude and OpenCode without storing prompt or response text.
- docs: [workflow metrics guide](ai-framework/integrations/workflow-metrics.md), [harnesses](ai-framework/integrations/harnesses.md)
- decisions: [event mapping and A1 contract](.project/records/legacy-upgrades/workflow-usage-capture.md#plan-and-event-mapping)
- knowledge: [lease budget](.project/knowledge/patterns/observational-hooks-check-budget-before-acquiring-a-lease.md), [state-boundary attribution](.project/knowledge/issues/native-capture-needs-state-boundary-attribution.md), [guard snapshot bound](.project/knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md), [package-less wrapper](.project/knowledge/issues/package-less-bundle-ship-wrapper-cannot-select-checks.md), [Orca model preflight](.project/knowledge/issues/orca-model-preflight-can-leave-unproven-ledger-ownership.md)
- code: [capture adapter](ai-framework/hooks/scripts/workflow-capture.mts), [doctor](ai-framework/scripts/workflow-doctor.mts), [OpenCode plugin](.opencode/plugins/token-consumption.ts), [hook template](ai-framework/hooks/hooks.json)
- verification: [verification history](.project/records/legacy-upgrades/workflow-usage-capture.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/workflow-usage-capture.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/workflow-usage-capture.md)

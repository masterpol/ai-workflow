---
slug: workflow-usage-metrics
shipped: 2026-10-08
schemaVersion: 1
---
# workflow-usage-metrics

A bounded workflow usage metrics core records useful events and produces JSON, Markdown and HTML reports.
It keeps usage, outcomes, observed elapsed duration and collection health, with no token or cost data.
Native capture, adoption and historical bounds are recorded separately.

- outcome: Workflow usage events can be recorded and reported from bounded, guarded local state.
- docs: [workflow metrics guide](ai-framework/integrations/workflow-metrics.md)
- decisions: [scope and revision](.project/records/legacy-upgrades/workflow-usage-metrics.md#scope-and-revision)
- knowledge: [display buckets](.project/knowledge/patterns/display-buckets-are-not-lifecycle-identities.md), [pinned identities](.project/knowledge/patterns/pin-directory-identities-across-async-leases.md), [ancestor swap](.project/knowledge/issues/metrics-ancestor-swap-during-async-lease.md)
- code: [state](ai-framework/scripts/workflow-metrics-state.mts), [report](ai-framework/scripts/workflow-metrics-report.mts), [CLI](ai-framework/scripts/workflow-metrics.mts)
- verification: [historical closure](.project/records/pitch-compression/workflow-usage-metrics.md), [audit triage](.project/records/legacy-upgrades/workflow-usage-metrics.md#audit-triage-and-provenance)
- followups: [limitations](.project/records/legacy-upgrades/workflow-usage-metrics.md#limitations)
- archive: [compact record](.project/records/pitch-compression/workflow-usage-metrics.md), [source supplement](.project/records/legacy-upgrades/workflow-usage-metrics.md)

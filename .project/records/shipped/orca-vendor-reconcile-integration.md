---
slug: orca-vendor-reconcile-integration
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-reconcile-integration

A thin CLI, grader and opt-in wiring connect Orca reconciliation to the workflow phases.
Worker text stays data, human gates stay in place and live smoke observed Claude only.
Historical counts, review limits and follow-ups remain separately recorded.

- outcome: A thin guarded CLI and grader wire opt-in Orca reconciliation into the workflow without live multi-vendor proof.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md)
- decisions: [scope and build decisions](.project/records/legacy-upgrades/orca-vendor-reconcile-integration.md#scope-and-build-decisions)
- knowledge: [thin CLI](.project/knowledge/patterns/a-thin-cli-keeps-every-guard-in-the-library.md), [grader reporting](.project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md)
- code: [CLI](ai-framework/scripts/orca-run.mts), [grader](ai-framework/scripts/orca-eval-grader.mts)
- verification: [historical closure](.project/records/pitch-compression/orca-vendor-reconcile-integration.md)
- followups: [assurance limits](.project/records/legacy-upgrades/orca-vendor-reconcile-integration.md#historical-assurance-and-limitations)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-reconcile-integration.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-reconcile-integration.md)

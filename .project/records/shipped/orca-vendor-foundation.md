---
slug: orca-vendor-foundation
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-foundation

Foundation added an opt-in vendor policy reader, a bounded read-only preflight and static doctor diagnostics.
No worker is launched and every result reports normal workflow with dispatch not ready.
Fixture and mutation evidence does not establish live Orca readiness.

- outcome: Opt-in vendor policy, bounded preflight and diagnostics prepare Orca coordination without launching workers.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md)
- decisions: [policy and preflight contract](.project/records/legacy-upgrades/orca-vendor-foundation.md#scope-and-policy-contract)
- knowledge: [opt-in before discovery](.project/knowledge/patterns/opt-in-before-runtime-discovery.md), [rounded-zero timeout](.project/knowledge/issues/rounded-zero-timeout-disables-cancellation.md)
- code: [policy](ai-framework/scripts/orca-policy.mts), [preflight](ai-framework/scripts/orca-preflight.mts)
- verification: [historical closure](.project/records/pitch-compression/orca-vendor-foundation.md)
- followups: [open items](.project/records/legacy-upgrades/orca-vendor-foundation.md#open-items)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-foundation.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-foundation.md)

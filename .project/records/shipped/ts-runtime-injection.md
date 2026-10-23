---
slug: ts-runtime-injection
shipped: 2026-10-08
schemaVersion: 1
---
# ts-runtime-injection

Workflow tooling uses injected runtime adapters and direct TypeScript entries.
Current runtime and sync documentation own execution and upgrade guidance.
The source supplement preserves historical exceptions, migration lessons and verification limits.

- outcome: Injected Node and Bun adapters support direct workflow tooling without a build step.
- docs: [runtime](ai-framework/scripts/runtime/README.md), [upgrade guidance](ai-framework/docs/versioning-and-sync.md)
- decisions: [module and adapter choices](.project/records/legacy-upgrades/ts-runtime-injection.md#module-and-adapter-decisions)
- knowledge: [sync safety](.project/knowledge/patterns/sync-tools-refuse-symlinks-in-source-and-destination.md)
- code: [runtime selection](ai-framework/scripts/runtime/select.mts)
- verification: [historical closure](.project/records/pitch-compression/ts-runtime-injection.md)
- followups: [historical limits](.project/records/legacy-upgrades/ts-runtime-injection.md#scope-and-historical-limits)
- archive: [compact record](.project/records/pitch-compression/ts-runtime-injection.md), [source supplement](.project/records/legacy-upgrades/ts-runtime-injection.md)

---
slug: test-execution-performance
shipped: 2026-10-21
schemaVersion: 1
---
# test-execution-performance

A tested run-tests.mts entry point now discovers the full suite deterministically, reports the effective child runtime and supports bounded workers, a Node compile cache, coverage and listing, refusing unsupported settings.
No speed setting was promoted: Node workers were 24 percent slower, the compile cache 8 percent faster, and Bun parallel failed parity, all measured on a contended host.
Release 2.40.0 shipped. An idle-host rerun and the Bun timeout decision stay open.

- outcome: A guarded test runner and testing guide ship with defaults unchanged and the speed evidence recorded as unproven.
- docs: [testing guide](ai-framework/docs/testing.md), [testing rule](ai-framework/rules/testing.md), [performance rule](ai-framework/rules/performance.md)
- decisions: [measured outcome](.project/records/legacy-upgrades/test-execution-performance.md#measured-outcome)
- knowledge: [real-path containment](.project/knowledge/patterns/path-containment-compares-real-paths.md), [nested test context](.project/knowledge/issues/a-nested-node-test-child-inherits-the-parents-test-context.md), [runCli argv](.project/knowledge/issues/runcli-replaces-proc-argv-with-the-arguments-only.md)
- code: [run-tests](ai-framework/scripts/run-tests.mts), [run-tests tests](ai-framework/scripts/run-tests.test.mts)
- verification: [verification and audit](.project/records/legacy-upgrades/test-execution-performance.md#verification-and-audit)
- followups: [open followups](.project/records/legacy-upgrades/test-execution-performance.md#open-followups), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/test-execution-performance.md)

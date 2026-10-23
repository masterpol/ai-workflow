---
slug: path-safety-hardening
shipped: 2026-09-27
schemaVersion: 1
---
# path-safety-hardening

Ledger commits, archive, removal and recovery now share one transaction context and journal namespace.
New writes refuse pending compaction or legacy installer journals; ancestor swaps and symlinks are refused.
The supported contract is trusted project directories; hostile ancestor races stay unsolved and open.

- outcome: Managed writes stay inside the project under the trusted-directory contract, and interrupted ledger commits recover.
- docs: [project readme](README.md)
- decisions: [shared recovery context and trusted directories](.project/knowledge/decisions/compaction-recovery-shares-context-and-trusted-directories.md)
- knowledge: [lock reader exposed to new callers](.project/knowledge/issues/reusing-a-transaction-exposes-its-lock-reader-to-new-callers.md), [in-memory mutant](.project/knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md)
- code: [skill registry](ai-framework/scripts/skill-registry.mts), [pitch compress](ai-framework/scripts/pitch-compress.mts), [pitch archive](ai-framework/scripts/pitch-archive.mts)
- verification: [verification history](.project/records/legacy-upgrades/path-safety-hardening.md#verification-history), [run record](.project/runs/2026-09-27-path-safety-hardening.md)
- followups: [historical limits](.project/records/legacy-upgrades/path-safety-hardening.md#historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/path-safety-hardening.md)

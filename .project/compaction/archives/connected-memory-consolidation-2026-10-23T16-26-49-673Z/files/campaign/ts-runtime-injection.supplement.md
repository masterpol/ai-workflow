# Source-review supplement: ts-runtime-injection

Prepared 2026-10-22 from verified original recovery sources. This supplements the unchanged [compact record](../pitch-compression/ts-runtime-injection.md). Historical counts, timings, temporary mechanisms and unresolved observations describe the migration, not current verification. Current execution and upgrade instructions belong to the [runtime documentation](../../../ai-framework/scripts/runtime/README.md) and [sync documentation](../../../ai-framework/docs/versioning-and-sync.md).

## Scope and historical limits

Scope limited behavior changes to adapter injection/typing, added no npm dependency or build step, kept node:test and targeted Node/Bun only. Historical pitch/design records and the native-safety analysis implementation were excluded. Final direct entries superseded JavaScript shims and the relaunch helper.

The summary overgeneralizes all-.mts: the OpenCode plugin uses token-consumption.ts; native-safety bench.py stayed Python while its test migrated. The dated analysis report's reproduction command changed extension without changing results/evidence, qualifying the blanket no-history-rewrite claim. The Python experiment required flock, directory-fd and waitpid operations absent from the examined Node APIs; Bun FFI did not establish a portable Node replacement. Foundation deferred its inode-lock test; later collector coverage was separate evidence.

Original final verification and audit remain in compact sections 1–3; none of those counts is newly reproduced by this review. Historical followups include runtime-module coverage, shared Node flags, symlink/ref regressions, hook bounds/cwd paths and honest skipped-parser reporting. The old fake OpenCode host/plain Bun import did not prove real-host loading, and no later original body supplies that smoke. Invalid/missing runners failed before hook main and conflicted with the always-zero claim. That policy was not explicitly closed in these records; removing the launcher alone does not prove resolution.

## Module and adapter decisions

CommonJS package mode made .mts the explicit ESM choice; extensionless require did not resolve it. Final design runs typed entries directly and keeps imports free from CLI side effects, with erasable syntax, explicit extensions and type-only imports. Stripping types does not prove strict TypeScript correctness; tsc/declarations remained deferred. Optional trailing dependency injection preserved existing callers during migration.

Parity includes failure paths and directories: Bun.file().exists() returned false for directories, requiring fallback and a regression case. Shared filesystem APIs retained existing synchronous contracts alongside asynchronous Bun operations. Two accepted graphify differences were directory-with-markdown-extension failure at read rather than enumeration, and list-valued scalar frontmatter becoming absent. Byte-identical actual-tree output did not prove equality for all inputs.

## Instrumentation and shared adapters

Immutable ESM namespaces broke transaction-function reassignment in a SIGKILL test. Explicit transaction injection preserved actual write/kill/journal/byte-identical recovery assertions. Injected filesystem operations replaced ambient patching without weakening EEXIST or untouched-victim assertions. Syntax guards must avoid matching their own test literals; current boundary validation supersedes simple grep.

Shared adapter gaps included raw subprocess bytes for binary Git-base hashes, removable stream-error handlers for quiet EPIPE, size bounds and common root inference for scripts and both hook layouts. Text conversion must not corrupt binary data. Workers report missing capabilities to the adapter owner rather than adding local platform imports. Collector parity retained binary/privacy/lease/FIFO/bounds cases. Child fixtures closed on stdin end and avoided runtime-specific timer assumptions.

## Parity and discovery evidence

Fixed-fixture comparisons preserved stdout, stderr, status and written trees across success, invalid input, rerun, recovery and conflict paths. Writing CLIs used isolated fixtures and unavailable executables were explicitly faked. Only disclosed timestamps/path nondeterminism was normalized. Doctor sorted asynchronous records without discarding details, keeping separate Node/Bun baselines for intentional skips. Intentional hook error stderr was preserved. Caller tests did not substitute for a module's own coverage.

Aggregate green suites could omit tests: hidden .claude and analysis suites were invoked explicitly; Bun needed explicit ./ paths. Migrated fixtures needed typed siblings, runtime and catalog dependencies. Public .env.example documentation metadata differed from excluded secret files. Startup measurements used fixed fixtures, warm-up and repeated runs; historical shim wall/CPU overhead was not a final direct-entry guarantee.

Externally owned edits were preserved and independently checked. Where another session edited before measurement, the original HEAD reference was reconstructed instead of claiming a prior capture. Guard mutations ran against isolated copies and had to fail the intended assertion before restoration. Other writers' baselines/mutation claims remained unverified unless independently rerun. Sandbox bind failures were recorded as execution limits rather than silently treated as skips. Local Bun output anomalies and unowned stale lease processes did not establish portable defects.

## Upgrade and audit lessons

Old installations first run their old sync implementation, which may not know newly synced directories; README customization is not automatically replaced. The simulation modeled old-to-new two-pass upgrade. Its temporary exception named only unrelated README/docs failures, not arbitrary doctor failures. Current sync documentation owns present upgrade instructions.

Final audit found source-directory and destination write/prune symlink traversal, including inherited JavaScript behavior. The [sync safety pattern](../../knowledge/patterns/sync-tools-refuse-symlinks-in-source-and-destination.md) retains two-sided checks with untouched external-victim proof. Option-like Git refs require rejection and repository operands need separation from options. A parser's local TypeScript package main required containment; package discovery alone did not make an escaping main safe. Missing parse APIs had to produce informative output rather than silent success. These path checks did not establish protection against concurrent filesystem replacement.

Audit cycle 1 left explicit guard coverage open for archive size/file-count caps, review-bench containment, exclusive wx creation in compaction/registry and individually isolated policy guards. Cycle 2 did not explicitly close these items; that historical absence is not a claim that current tests lack them.

Historical configuration guards bounded regular-file reads, kept unrelated values out of child environments and quoted/capped invalid runner values. The old dotenv source is superseded by current nonsecret configuration; secret-bearing .env is never read. Historical shim invariants, old loader workarounds, raw baseline hashes, hill positions and scheduling do not add current behavior beyond these retained decisions.

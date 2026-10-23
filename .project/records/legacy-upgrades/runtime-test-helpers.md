# Source-review supplement: runtime-test-helpers

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/runtime-test-helpers.md) for the 2026-10-08 release 2.16.1. Results are historical evidence, not a new runtime certification.

## Build decisions and incidents

Shared helpers live in [test-helpers](../../../ai-framework/scripts/runtime/test-helpers.mts). `tempFixture` has no automatic cleanup; callers remove the root themselves, and the orca-apply test keeps its own cleanup. `deps.fs.readFileSync` returns a string, so binary comparison uses `readBytesSync` wrapped in `Buffer.from`, because deep equality distinguishes Uint8Array from Buffer. `memoryFs` first threw for every symlink; the final contract follows links whose target exists, reports dangling links as absent targets, and `lstatSync` reports the link. A word-boundary sed over `fs.` produced `deps.deps.fs.` and needed a second pass (see [word-boundary pattern](../../knowledge/patterns/word-boundary-replacement-does-not-see-a-prefixed-property.md)). The planned parallel pilots ran sequentially because nested dispatch support was unverified.

## Review chronology

Audit cycle 1 also fixed two should-fix items: `captureIo` pins non-TTY output, and `runScript` read the runner from `deps.proc.env`. The latter was superseded during ship by central runner selection in [entry](../../../ai-framework/scripts/runtime/entry.mts). The alias-guard mutant at `orca-apply.mts:438` survived all 20 tests before the fix. Lessons: [alias guard](../../knowledge/issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard.md), [faithful fakes](../../knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md).

## Historical limits

Helper self-tests grew from 8 to 13; earlier 8/8 figures are superseded. The closure reported three unrelated whole-repo failures, while the build log also noted environmental failures in other suites under load; neither run is reconciled. Node 22.12-22.17 flag handling stayed unproven (local runs used Node v24.21.0 and Bun 1.4.2). The S4 refactor first landed in commit fb38efd under another pitch.

Whole file left out of the ledger: the hill chart (all four scopes done; its 8/8 self-test count is superseded by 13/13).

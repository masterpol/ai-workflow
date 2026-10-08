# G5 baseline and migration evidence

Recorded before editing pitch-archive and pitch-compress. Scratch captures and original files: `.project/scratchpad/ts-runtime-injection-g5/`.

- Node baseline: `node --experimental-strip-types --test ai-framework/scripts/pitch-archive.test.js ai-framework/scripts/pitch-compress.test.js`: **78 pass, 0 fail**.
- Bun baseline: `bun test ai-framework/scripts/pitch-archive.test.js ai-framework/scripts/pitch-compress.test.js`: **78 pass, 0 fail**.
- Fixed fixture: shipped `fixed` pitch (2026-09-25), one Summary section, preview summary. All five baseline invocations exit 0 and emit empty stderr (SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).

| Invocation | stdout SHA-256 |
|---|---|
| pitch-archive verify fixed --json | `6cde07a50a5107b62ba31436346358f4ab369fbc81641c52de1d5395371e32f7` |
| pitch-archive recover --json | `8e71a9ad00a65007b97e57f9b1eac6d86cca8e73335ea230ff9883e90eef8f28` |
| pitch-compress inventory --json | `48410d66409502b3a8a245d80d5e594a8d955412a0a9ce226ca9ee82bc208476` |
| pitch-compress ledger fixed --json | `c432b3beb83c678c18414a58f1661e834f70ff92e7a8cf798bd65ac2571c7797` |
| pitch-compress write-done-work fixed --summary | `9c32b3a5cbc9e092fc456568962eb0c524ef87eafd4d0f513906532e7977938a` |

## G5 completed verification

- All logic moved into `pitch-archive.mts` and `pitch-compress.mts`; every old library export and signature remains available through the exact `.js` shim. Optional trailing RuntimeDeps and runtime-bound factories support programmatic injection.
- Node: `node --experimental-strip-types --test ai-framework/scripts/pitch-archive.test.mts ai-framework/scripts/pitch-compress.test.mts` — **80 pass, 0 fail** (78 preserved tests plus binary archive/clock injection and graph subprocess injection).
- Bun: `bun test ai-framework/scripts/pitch-archive.test.mts ai-framework/scripts/pitch-compress.test.mts` — **80 pass, 0 fail**.
- All five fixed fixture CLI stdout/stderr hashes and statuses match `baseline.json` exactly through plain Node CLI launches and `AI_WORKFLOW_RUNNER=bun`. Captures: `node-after.json`, `bun-after.json` under the scratch directory above. All statuses 0; stderr empty.
- Mutation: temporarily disabled the missing-required-section ledger guard. The existing `commit-ledger rejects a mapping missing a required section` test failed with **Missing expected exception**, exit 1 on both Node and Bun. Before/after restoration the same focused test exits 0 on both. The guard was restored before the final 80/80 suites. Evidence: `mutation.json` and `*-mutation-{clean,disabled,restored}.txt`.
- Static invariants: both shims exactly `module.exports = require("./runtime/entry.js").load(__filename, module);`; both old `.test.js` files removed; no `node:*` imports, `require(...)`, explicit `any` or `as any` in either source `.mts`; exported functions have explicit return types; syntax checks and whitespace check pass.
- Source filesystem reads, byte reads, paths, hashing, randomness, clock, subprocess and CLI streams use RuntimeDeps. The audited sibling transaction library receives the same deps. Buffer normalization at the library boundary preserves compatibility with older CJS transaction serialization; raw file bytes remain unchanged.
- Three-strike diagnostic: migrated registry shims expose immutable ESM namespaces, so the old real-kill test's reassignment of `registry.transact` stopped intercepting the transaction. The independent build-error-resolver confirmed the cause. The test now passes an explicit transaction API copy to the existing runtime-bound factory and still proves a genuine SIGKILL after the actual ledger write, journal preservation and byte-identical recovery. No sibling or runtime files were changed by G5.
- Bun's test loader rejects a direct `.mts` source import combined with a synchronous shim import of the same module during instantiation. Factories are therefore obtained through the tested compatibility shim, avoiding that test-only cycle.

# Independent W2/G8 verification

Verified 2026-10-07 against the shared tree. An external session had already migrated the three hooks before this writer's GO. Its source, tests and baseline-g8.md were preserved. This pass wrote only scratch fixtures and this evidence. No claim is made that the abandoned before.json capture predates migration; the valid reference is original.json, reconstructed from git show HEAD:<hook>.

## Behavior tests

Original dedicated suites: 0 Node / 0 Bun. External migrated suites: 33/33 Node; 20/20 Bun hooks plus 13/13 Bun post-edit, zero failures. Tests cover required/optional check failures, package errors, diff security guards, audit updates, observation count and 24-hour threshold, nonblocking hook errors, secret blocking, warnings, malformed payloads, and project-local TypeScript parsing.

Commands:

- node --experimental-strip-types --test ai-framework/hooks/scripts/pre-ship-verify.test.mts ai-framework/hooks/scripts/stuck-uphill-detector.test.mts .claude/hooks/post-edit-check.test.mts
- bun test ai-framework/hooks/scripts/pre-ship-verify.test.mts ai-framework/hooks/scripts/stuck-uphill-detector.test.mts
- bun test ./.claude/hooks/post-edit-check.test.mts

Bun silently omitted the hidden .claude suite in the combined invocation without the ./ prefix; its explicit separate run is required to reproduce 33 tests.

## CLI parity and startup

Scratch: .project/scratchpad/ts-runtime-g8/. measure.py runs original HEAD source copies and current retained .js names against the same isolated Git fixture. original.json and final.json retain full hashes, statuses and every timing. Fixtures: no-package pre-ship, no-pitches stuck-uphill, clean post-edit, hardcoded-password post-edit, malformed post-edit JSON. All 15 stdout/stderr/status records match byte for byte under plain Node, Bun and Node selecting AI_WORKFLOW_RUNNER=bun. The secret fixture returns 2; other fixture statuses are 0. Pre-ship and blocking post-edit intentionally retain their existing nonempty stderr; the plan's blanket empty-stderr condition cannot apply to these existing messages.

Median startup, 20 subprocess runs per hook, milliseconds:

| Hook | HEAD original | Current | Increase |
|---|---:|---:|---:|
| pre-ship-verify | 81.49 | 108.74 | 27.24 |
| stuck-uphill-detector | 24.32 | 55.25 | 30.94 |
| post-edit-check | 28.27 | 55.97 | 27.71 |

All increases are below the 60 ms criterion. Timings are local measurements, not an absolute performance promise.

## Guard mutation and wiring

Copied owned source/tests and runtime into an isolated scratch tree. Changed post-edit's `if (errors.length > 0)` to `if (errors.length > 999)`. The existing hardcoded-secret test failed on both Node and Bun specifically at `0 !== 2`, proving the blocking-code guard. Restored source in the isolated tree: targeted test passed 1/1 on each runner. The isolated duplicate test tree was removed after verification so broad test discovery cannot include it. Active source was never mutated.

The three sources have no runtime node:* import, require call or explicit any. They import typed RuntimeDeps and the adapter for compatibility defaults. All retained shims point to their correct runtime/entry.js path. entry.inferRoot returns the actual project root for both hook layouts; entry.plan selects Bun for each when explicitly configured. cli shares that inference. The external optional parser resolves the local typescript package's main or index.js, normalizes the CommonJS default namespace, and skips unavailable/throwing parsers. Existing tests verify package main and index fallback. No external dependencies were installed.

Source fingerprints at verification:

- ai-framework/hooks/scripts/pre-ship-verify.mts: 40483db02a0d50e9bfe0122fb9ed473cd36def41655f56121ca68c2457d85f1c
- ai-framework/hooks/scripts/stuck-uphill-detector.mts: 6b4d9ff2466bc9b6311274c4c62fccd6beae44bfd8059e0586111c2a0cc4f274
- .claude/hooks/post-edit-check.mts: 09c547bf970d9135a95ccef585db01274cf495d49784571bd2ee82a49d8fcd3e

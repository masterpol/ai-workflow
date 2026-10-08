# Pitch: runtime-test-helpers

**Date**: 2026-10-08  •  **Appetite**: small-batch  
**Stack**: backend (Node/Bun tooling)

## Problem

Workflow tests import `node:*` APIs directly for fixtures, process spawning and filesystem work. Each test invents its own helpers, so the suite is inconsistent and some behavior is only exercisable against the real filesystem instead of an injected `RuntimeDeps`.

## Knowledge consulted

- [decisions/skill-defaults-attribution-guard-and-runtime-design] — `RuntimeDeps` is the project's boundary for platform APIs; the same boundary should be available in tests.
- [issues/macos-tmpdir-realpath-alias-breaks-path-assertions] — temp-path helpers must keep `realpath` semantics so path assertions hold on macOS.
- [patterns/prove-a-guard-test-with-an-in-memory-mutant] — in-memory adapters make guard tests cheap and deterministic.
- [ai-framework/rules/testing.md] — prefer shared mock/fixture factories before inline mocks; tests live next to what they test.
- Existing pattern: `ai-framework/scripts/docs-links.test.mts` already builds an in-memory `RuntimeDeps` (`memory()`) and calls `createNodeDeps()`.

## Solution sketch (breadboard, NOT wireframe)

**Places**
- `ai-framework/scripts/runtime/test-helpers.mts` — shared test utilities.
- Pilot tests migrated to use the helpers (3–5 files, chosen for variety).

**Affordances**
- `createTestDeps(env?)` — returns `RuntimeDeps` from `createNodeDeps()`, cwd resettable.
- `tempFixture(deps, files)` — builds a temp project tree through `deps.fs`, returns the temp root path.
- `runScript(deps, script, args, opts)` — spawns `<script>.mts` using `deps.child.runSync`, respecting `AI_WORKFLOW_RUNNER` and adding Node type-stripping flags when needed.
- `memoryFs(files, links?)` — returns a `Partial<FsDeps>` over an in-memory tree for fast unit tests.
- `captureIo(deps)` — returns deps with `io.stdout`/`io.stderr` captured into arrays.

**Connections**
Test file imports helper → builds deps → calls function under test with deps → asserts. CLI-spawning tests go through `runScript(deps, ...)` so the runner switch is exercised automatically.

## Rabbit holes

**Resolved here**:
- `test`/`assert` imports stay `node:*` because Bun supports `node:test` and `node:assert/strict`.
- Some tests need real OS features (symlinks, exec bits, FIFOs, real child processes): keep a real-filesystem path via `tempFixture`.
- Runner selection for spawned scripts: helper reads `AI_WORKFLOW_RUNNER` and uses `bun` or `node --experimental-strip-types --disable-warning=ExperimentalWarning` accordingly.
- In-memory fs does not need full Node parity; only implement the surface the function under test touches.

**Pushed to /plan as risk**:
- Pilots must prove the helper works for both unit tests (in-memory deps) and integration tests (real temp dir + spawned script).

**Pushed to no-go**:
- Migrating every existing test in one batch.
- Abstracting `node:test`/`node:assert` themselves.
- Adding a third test runner.

## No-gos (this pitch)

- ✗ No test-framework swap.
- ✗ No production script behavior changes.
- ✗ No migration of tests that do not benefit from the helper.
- ✗ No support for runtimes other than Node and Bun.
- ✗ No new npm dependencies.

## Critique findings

(Empty until /critique runs. This is a small-batch pitch; auto-/critique does not fire.)

## Bet decision

☒ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/runtime-test-helpers/`; reason: {…}

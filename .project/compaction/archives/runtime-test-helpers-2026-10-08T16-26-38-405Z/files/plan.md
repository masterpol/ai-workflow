# Plan: runtime-test-helpers

**Pitch**: pitch.md  •  **Appetite**: small-batch  •  **Hill**: hill.md

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Create `runtime/test-helpers.mts` + self-tests | `ai-framework/scripts/runtime/test-helpers.mts`, `ai-framework/scripts/runtime/test-helpers.test.mts` | ~220 | — | — | no (defines the shared interface every later scope uses) | — |
| S2 | Pilot: in-memory deps — refactor `docs-links.test.mts` | `ai-framework/scripts/docs-links.test.mts` | ~170 (refactor) | S1 | S3, S4 | yes (disjoint file, self-contained, clear exit) | standard |
| S3 | Pilot: real-fs temp dir — refactor `graphify.test.mts` | `ai-framework/scripts/graphify.test.mts` | ~150 (refactor) | S1 | S2, S4 | yes (disjoint file, self-contained, clear exit) | standard |
| S4 | Pilot: spawned script — refactor `orca-apply.test.mts` | `ai-framework/scripts/orca-apply.test.mts` | ~150 (refactor) | S1 | S2, S3 | yes (disjoint file, self-contained, clear exit) | standard |

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S1 — test-helpers module

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/test-helpers.test.mts` exit 0.
- `bun test ai-framework/scripts/runtime/test-helpers.test.mts` exit 0.
- Helpers export `createTestDeps`, `tempFixture`, `runScript`, `memoryFs`, `captureIo` with the documented signatures.
- `tempFixture` round-trips a small file tree through `deps.fs` and `deps.fs.realpath` returns the resolved path on macOS (`/private/var` alias).
- `runScript` invokes a no-op script under plain Node and under `AI_WORKFLOW_RUNNER=bun`, exit code and stdout propagated.
- `memoryFs` serves `readFileSync`/`statSync`/`readdirSync`/`existsSync`/`lstatSync` for a fake tree; missing files throw `ENOENT`.
- `captureIo` returns deps whose `stdout.write`/`stderr.write` push into arrays; `isTTY` false.
- `grep -nE ":\s*any\b|\bas any\b" ai-framework/scripts/runtime/test-helpers.mts` is empty.

### S2 — docs-links pilot (in-memory)

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/docs-links.test.mts` exit 0 and same count as before refactor (≥ 16 tests).
- `bun test ai-framework/scripts/docs-links.test.mts` exit 0 and same count.
- The new test file imports `createTestDeps`, `memoryFs`, `captureIo` from `runtime/test-helpers.mts`; its own `memory()`/`fixture()` are deleted or reduced to thin wrappers.
- `grep -nE "from \"node:|\brequire\(" ai-framework/scripts/docs-links.test.mts` shows `node:assert/strict` and `node:test` only (no `node:fs`/`node:os`/`node:path`/`node:child_process`).

### S3 — graphify pilot (real-fs temp dir)

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/graphify.test.mts` exit 0 and same count as before refactor.
- `bun test ai-framework/scripts/graphify.test.mts` exit 0 and same count.
- The test file imports `createTestDeps` and `tempFixture` from `runtime/test-helpers.mts`; direct `node:fs`/`node:os`/`node:path` calls are limited to the test-helper itself.
- `node ai-framework/scripts/graphify.mts --check` exit 0.

### S4 — orca-apply pilot (spawned script)

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/orca-apply.test.mts` exit 0 and same count as before refactor.
- `bun test ai-framework/scripts/orca-apply.test.mts` exit 0 and same count.
- The test file imports `createTestDeps`, `tempFixture` and `runScript` from `runtime/test-helpers.mts`; direct `node:child_process` is limited to the test-helper.
- Under both runners, spawning a script through `runScript` propagates exit code, stdout and stderr.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| In-memory fs lacks the surface the function under test uses | S2 | yes (covered by S2 itself) | S2 refactors a function that reads + walks; if a needed method is missing, add it to `memoryFs` in S1, not in the test. |
| `runScript` must pick the right runner and Node flags | S1, S4 | yes (covered by S1 self-tests) | Helper reads `AI_WORKFLOW_RUNNER`, uses `deps.child.runSync`, and applies `NODE_FLAGS` only when the runner is Node. |
| macOS `/var` ↔ `/private/var` alias breaks path assertions in temp dirs | S1, S2-S4 | yes (covered by S1 self-test) | `tempFixture` uses `deps.fs.mkdtempSync` + `deps.fs.realpathSync` and returns the resolved root. |
| Pilot tests need OS features (symlinks, exec bits) that in-memory fs cannot model | S2-S4 | no | Keep `tempFixture` for those paths; only the in-memory surface moves. |
| Subagents diverge on style or invent different helper names | S2-S4 | no | S1 exports the exact API; subagents only call it. |

## Parallel dispatch plan

- S1 first and alone: it fixes the helper interface and self-tests.
- S2, S3, S4 in one parallel turn on disjoint test files (3 standard subagents). Each subagent receives the S1 helper signature, a frozen `node ai-framework/scripts/runtime/test-helpers.mts` reference, and the test file it must refactor. Each returns evidence of its exit commands; count a subagent once on completion.
- Sequential verification by the orchestrator: run the full repo test suite on Node and Bun after all three pilots land; confirm no other test file broke.

## Wireframes (UI scopes only, light)

N/A. No UI scope.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)

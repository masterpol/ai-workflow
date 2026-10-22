# Plan: vendor-model-toon

**Pitch**: pitch.md  •  **Appetite**: small-batch  •  **Hill**: hill.md

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Add `models` block to `ai-workflow.toon` (schemaVersion 3) | `ai-framework/scripts/runtime/config.mts`, `ai-framework/scripts/config-migrate.mts`, `ai-framework/scripts/runtime/test-helpers.mts`, `ai-framework/scripts/runtime/config.test.mts`, `ai-framework/scripts/config-migrate.test.mts`, `ai-framework/templates/ai-workflow.example.toon`, `README.md` | ~500 | — | — | no (single coherent change; sequential fits small-batch) | — |

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S1 — Add `models` block to `ai-workflow.toon` (schemaVersion 3)

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/config.test.mts ai-framework/scripts/config-migrate.test.mts` exit 0
- `node --check ai-framework/scripts/runtime/config.mts` exit 0
- `node --check ai-framework/scripts/config-migrate.mts` exit 0
- `node --check ai-framework/scripts/runtime/test-helpers.mts` exit 0
- `grep -q '^models:' ai-framework/templates/ai-workflow.example.toon`
- `grep -q 'Model configuration' README.md`
- Round-trip: write a v2 fixture (e.g. via `toonFixtureText({ schemaVersion: 2 })`), call the v2→v3 migrator path, assert the v3 output contains the original `runtime.runner`, `integrations.orca.*`, `doctor.modelRouting`, `skills.modes.caveman`, plus an injected `models` block with all three vendors and three profiles each.
- Mutant guard: for the "unknown root key" / "unknown vendor" / "missing required profile" guards, a planted mutant (e.g. remove the `models` key from `ROOT_KEYS`) makes the relevant test fail for the right reason — per `prove-a-guard-test-with-an-in-memory-mutant`.
- Re-run the full `ai-framework/scripts` `node --test` suite to confirm no v2 helper regressions in `orca-policy.test.mts`, `orca-preflight.test.mts`, `orca-dispatch.test.mts`, `orca-eval-grader.test.mts`, `orca-ledger.test.mts`, `orca-run.test.mts`, `state-snapshot.test.mts`, `setup-validator.test.mts`, `skill-defaults.test.mts`.
- Manual: `node ai-framework/scripts/config-migrate.mts --dry-run --root .` on a v2 fixture prints a v3 conversion that preserves values and adds `models`.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| `loadConfig` refuses old schemaVersions; the v2→v3 migrator needs a v2 read path without weakening the runtime refusal. | S1 | no | The migrator ships a dedicated v2 model reader (e.g. `loadConfigV2` or an in-file v2 parser used only by `config-migrate.mts`). `loadConfig` stays strict at v3. |
| `toonFixtureText` and `orcaPolicyToonText` in `runtime/test-helpers.mts` hardcode `schemaVersion: 2`; many cross-cutting tests consume them. | S1 | no | Update both helpers to emit v3 in the same commit; run the full `node --test` suite to confirm green. |
| The literal "only 2 is supported" in `runtime/config.mts` and the regex / assertions in `config-migrate.test.mts` reference schemaVersion 2. | S1 | no | Update the error text and the test assertions in lockstep with the parser change. |
| `ai-workflow.toon` is git-ignored; the implementer's local v2 file will fail doctor/setup-validator during development. | S1 | no | The implementer converts their local file to v3 as part of finishing S1, using the same migrator path projects will use. |

## Parallel dispatch plan

- Single scope; no parallelism. `/build` runs S1 sequentially.

## Wireframes (UI scopes only, light)

Not applicable — no UI surface.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)

# Pitch: runner-aware-runtime-boundary-validator

**Date**: 2026-10-08  •  **Appetite**: small-batch
**Stack**: workflow tooling / TypeScript ES modules (Node 22+ and Bun)

## Problem

Workflow scripts and hooks are supposed to stay runner-portable: production `.mts` files import no `node:*` modules and instead receive platform capabilities through `RuntimeDeps`. Tests are supposed to build those capabilities with `runtime/test-helpers.mts` rather than importing `node:fs`, `node:os`, `node:path` or `node:child_process` directly.

Today the only enforcement is a regex in `runtime/invariants.test.mts` that fails the whole suite when a production source imports `node:*`. It does not check test files, it gives no line-level guidance, and it does not help an author extract the API into a parameter passed from a caller. When `AI_WORKFLOW_RUNNER=bun`, direct `node:*` imports still run because Bun is compatible, but they silently bypass the Bun-native adapters (`Bun.file`, `Bun.write`, `Bun.spawn`) and break the portability contract the runtime is built on.

## Knowledge consulted

- `.project/knowledge/patterns/one-boundary-selects-the-child-runner.md` — runner choice is centralized in `runtime/entry.mts`; a boundary validator must use the same precedence and must not invent its own runner discovery.
- `.project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md` — tests already inject `RuntimeDeps` through helpers; any new validation must not push authors back toward real-API imports in tests.
- `.project/knowledge/issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard.md` — a helper that changes a value's shape by default can void the guard it serves; extraction guidance should keep the API shape explicit in the function signature.
- `.project/knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md` — every new guard needs a mutant proof; the validator itself must be tested with planted violations.
- `.project/knowledge/decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers.md` — standing no-gos apply; this pitch stays inside portable workflow machinery.
- `ai-framework/scripts/runtime/README.md` — documents the boundary rule and the `node:test` / `node:assert` exception for tests.

## Solution sketch (breadboard, NOT wireframe)

**Places**:
- `ai-framework/scripts/runtime/validate.mts` — a pure checker exported as `validateRuntimeImports(sourcePaths, options)`.
- `ai-framework/scripts/runtime/validate.test.mts` — unit tests with memory-fs fixtures and mutant proofs.
- `ai-framework/scripts/workflow-doctor.mts` — a new doctor check that runs the validator over the known source globs.
- `ai-framework/scripts/runtime/invariants.test.mts` — replace the hand-rolled import regex with a call to the shared validator.
- `ai-framework/scripts/runtime/README.md` — document the new check and the parameter-extraction guidance.

**Affordances per place**:
- `validateRuntimeImports` accepts a list of file paths and returns an array of violations: `{ file, line, kind: "import" | "require" | "global", module: "node:fs" | "node:path" | ... }`.
- It skips `import type ... from "node:..."` and skips `node:test` / `node:assert` inside `*.test.mts` files.
- It optionally accepts an allowlist of adapter files that may import `node:*` (`runtime/node.mts`, `runtime/bun.mts`, `runtime/cli.mts`, `runtime/entry.mts`).
- `workflow-doctor.mts` calls it for production sources (`ai-framework/scripts/**/*.mts`, `ai-framework/hooks/scripts/**/*.mts`, `.claude/hooks/*.mts`) and test sources, reporting each violation as a `warn` for tests and `fail` for production sources.
- `invariants.test.mts` keeps the same guarantee by asserting the validator returns zero production violations.

**Connections**:
- Authors run `node ai-framework/scripts/workflow-doctor.mts` and see per-file, per-line guidance: "`graphify.mts:23` imports `node:path`; pass `deps.path` as a parameter instead."
- The same logic runs in CI through `invariants.test.mts`, so regressions are caught by tests.
- Under `bun test`, the validator runs with Bun `deps` and still flags production `node:*` imports; it does not care that Bun can execute them.

## Rabbit holes

**Resolved here**:
- What about `node:url` helpers like `fileURLToPath` used in tests? Add a small explicit allowlist for `node:url` in `*.test.mts` only, or move the pattern into `test-helpers.mts` so tests do not need it.
- Should the validator auto-fix? No. It reports and suggests; the author decides how to thread the parameter through callers.
- How do we know the suggested parameter name? Map each `node:*` module to the canonical `RuntimeDeps` field (`node:fs` → `deps.fs`, `node:path` → `deps.path`, etc.) and emit that as guidance.

**Pushed to /plan as risk** (with named owner):
- Proving the validator catches multi-line `import { ... } from "node:fs"` and `require("node:fs")` patterns reliably — plan owner will add fixture cases before implementation.
- Deciding whether to flag direct `process.*` global access outside adapters — plan owner will scope the regex and add a test mutant.

**Pushed to no-go** (deferred):
- Rewriting all existing test files that still import `node:fs` / `node:os` / `node:path` / `node:child_process`. This pitch only adds the check and guidance; a later pitch can migrate the survivors.
- General linting beyond `node:*` imports (e.g., style, import order).

## No-gos (this pitch)

- ✗ No automatic source rewriting.
- ✗ No new npm, bundler or type-checker dependencies.
- ✗ No changes to runtime script behavior; the validator is read-only.
- ✗ No validation of application project code; this is bundle-internal tooling.
- ✗ No removal of the existing `node:test` / `node:assert` test convention.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

(Empty until /critique runs. This is a small-batch tooling pitch, so /critique is not auto-triggered.)

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/runner-aware-runtime-boundary-validator/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.

# Plan: runner-aware-runtime-boundary-validator

**Pitch**: pitch.md  •  **Appetite**: small-batch (6 files: one over the cap of 5, accepted; see Risks)  •  **Hill**: hill.md

## Facts found while planning (2026-10-08)
- 41 of 50 test files import `node:fs`/`path`/`os`/`child_process`/`url`... (counts: path 41, fs 39, os 38, child_process 30, url 20, module 6, crypto 5, net 2). A per-line doctor warning would print hundreds of lines. The doctor must **summarize** test findings (count per module, first 5 files) and never fail on them; only production findings fail.
- Test fixtures contain `node:` text inside strings (for example `orca-policy.test.mts`) and the hook test builds fixture code in a template literal. A plain regex over the file text would false-positive; the scanner needs a small lexer that skips comments, string literals and template literals (including `${...}`).
- `process.*` outside the runtime adapters appears in 6 production files (`orca-eval-grader`, `runtime/select`, `runtime/test-helpers`, `runtime/types`, `setup-validator`, `workflow-doctor`), mostly as injected defaults. Reported as advisory only, never a failure.
- Today's guard is the regex in `runtime/invariants.test.mts` ("uses injected dependencies outside runtime adapters and avoids any-typed escape hatches"). It also checks `any`; that part stays.
- `RuntimeDeps` fields for guidance: `fs`, `path`, `child`, `crypto`, `net`, `os`, `clock`, `io`, `proc`.
- Orca is on in this repo: workers share the checkout; the start hook prints "Orca: ready" on phase calls.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| V1 | Validator + tests | `ai-framework/scripts/runtime/validate.mts` (new), `validate.test.mts` (new) | 380 | — | — | yes: self-contained, two new files, clear exit | standard (Codex via Orca) |
| V2 | Wire doctor + invariants | `ai-framework/scripts/workflow-doctor.mts`, `workflow-doctor.test.mts`, `runtime/invariants.test.mts` | 120 | V1 | V3 | yes: disjoint from V3, contract fixed by V1 | standard (Codex via Orca) |
| V3 | Document | `ai-framework/scripts/runtime/README.md` | 40 | V1 | V2 | yes: prose only | fast (OpenCode via Orca) |

### Contract (so V2 and V3 can start the moment V1 lands)
`validateRuntimeImports(root, paths, options, deps?)` returns `Violation[]`, each `{ file, line, kind: "import" | "export-from" | "dynamic-import" | "require" | "global", module?: string, suggestion: string }`. Options: `adapters` (allowed set), `testFile` (predicate; default `/\.test\.(mts|ts)$/`), `includeGlobals` (default false). Reads through `deps.fs` with a size cap (1 MiB) and refuses symlinks. Skips: `import type`, comments, strings, templates; in test files also `node:test`, `node:assert` and `node:assert/strict`. Suggestion maps `node:fs -> deps.fs`, `node:path -> deps.path`, `node:os -> deps.os`, `node:child_process -> deps.child`, `node:crypto -> deps.crypto`, `node:net -> deps.net`, other modules -> "pass the capability from a caller". Production: any hit is a failure for the caller; tests: callers treat hits as warnings; `global` hits are advisory. No auto-fix, no new dependency, read-only.

## Exit criteria per scope (machine-checkable)

### V1
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/validate.test.mts` exit 0 and `bun test ai-framework/scripts/runtime/validate.test.mts` exit 0.
- Fixture tests cover: single-line and multi-line `import {…} from "node:fs"`, `import x from`, side-effect `import "node:fs"`, `export … from "node:fs"`, `import("node:fs")`, `require("node:fs")`, `import type … from "node:fs"` (not flagged), `node:` text inside a string, a template literal (with a nested `${}`), a line comment and a block comment (none flagged), adapters allowlist, `node:test`/`node:assert` exceptions in tests only, `process.env` flagged only with `includeGlobals`, symlink and oversize refusal, and the suggestion text per module.
- Guard proof with in-memory mutants (remove the comment skip, the string skip, the type-import skip, the test exception): each turns at least one test red; run in a scratch copy only.
- `node --test ai-framework/scripts/runtime/invariants.test.mts` still exit 0 (the new file is itself production code: no `node:*` imports, no `any`).

### V2
- `node ai-framework/scripts/runtime/…` is not needed: run `node ai-framework/scripts/workflow-doctor.mts` exit 0 on this repo, with a validator line: production = pass (0 findings), tests = warn with a one-line summary (count, top modules, first 5 files), not per-line.
- `node --test ai-framework/scripts/workflow-doctor.test.mts` exit 0 (new cases: a planted production `node:fs` import fails the check; a test-file import only warns) and `bun test` the same file exit 0.
- `invariants.test.mts` asserts the validator returns zero production violations (the `any` check stays as is); a planted violation in a memory fixture makes it fail (mutant proof, scratch only).
- Full `node --test` over `ai-framework/scripts/*.test.mts ai-framework/scripts/runtime/*.test.mts ai-framework/hooks/scripts/*.test.mts` exit 0 with `AI_WORKFLOW_RUNNER=node`, and `bun test ai-framework/` exit 0.

### V3
- `grep -c "validateRuntimeImports" ai-framework/scripts/runtime/README.md` ≥ 1; the README states the rule, the exceptions, the module-to-field table and that existing tests are migrated later, not by this tool; `node ai-framework/scripts/setup-validator.mts` READY; `node ai-framework/scripts/graphify.mts --check` CLEAN.

## Risks (inherited from the pitch, plus found at plan time)

| Risk | Scope | Spike? | Mitigation |
|------|-------|--------|------------|
| Multi-line and exotic import forms missed | V1 | no | fixtures above, written before the scanner |
| Lexer edge cases: regex literals containing quotes, template nesting | V1 | no | fixtures for each; on a lexer error return a `kind` of `unparsed` advisory instead of guessing |
| `process.*` scope | V1, V2 | no | advisory only, `includeGlobals` default off, doctor shows the count |
| 41 test files would flood the doctor | V2 | no | summary line only; never fails on tests |
| 6 files vs small-batch cap 5 | all | no | accepted: README is one paragraph. If V1 exceeds 450 lines or a 7th file appears, stop and re-shape |
| The new start-hook test files (`orca-start*.test.mts`) already import `node:*` | V2 | no | they will appear in the test summary; migrating them is the no-go "later pitch" and is listed in `_followups.md` |

## Blast radius (`/impact`)
`workflow-doctor.mts` ← its test; `setup-validator.mts` (runs doctor contracts); `runtime/invariants.test.mts` (replaced guard must stay at least as strict for production). New file is imported by doctor and the invariants test only. Run after V2: doctor, setup-validator, invariants, all `*.test.mts` under Node and Bun. Rules: `ai-framework/rules/testing.md` (mutant-proven guards, both runners), `security.md` §9 (bounded reads, no symlinks, fixed-text messages).

## Parallel dispatch plan
V1 first, alone (Codex worker via Orca). Then V2 (Codex) and V3 (OpenCode) in parallel on disjoint files. Briefs forbid git write commands and any edit outside ownership; the coordinator re-runs every exit command and diffs `git status` against a saved baseline, because workers share this checkout. Audit (small-batch: cap 2 cycles): security + test-coverage reviewers through Orca on a scratch copy with a planted defect.

## Living-spec deviations log
(Empty at /plan time.)

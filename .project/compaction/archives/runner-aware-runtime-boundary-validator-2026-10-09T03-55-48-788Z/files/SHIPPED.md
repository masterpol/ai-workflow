# Shipped: runner-aware-runtime-boundary-validator

**Shipped**: 2026-10-08  •  **Version**: 2.21.0  •  **Appetite**: small-batch (6 files, one over the cap, accepted at plan time)  •  **Audit**: 2 cycles; zero must-fix at exit

## Pitch ↔ implementation

| Pitch promise | Result |
|---|---|
| A pure checker `validateRuntimeImports` with `{file, line, kind, module, suggestion}` | Done in `runtime/validate.mts` (deps-injected, read-only, bounded). Kinds: import, export-from, dynamic-import, require, global (advisory), unparsed, plus advisory dynamic-computed |
| Skips type imports and `node:test`/`node:assert` in tests; adapters allowlist | Done, with a lexer that also skips comments, strings and templates (scans `${...}` as code) |
| Doctor check: production = fail, tests = warn | Done, with two changes found at plan time: tests are one summary line (43 of 51 test files import `node:*`), and unparsed or unreadable production sources fail |
| `invariants.test.mts` uses the shared validator | Done; stricter than the old regex (export-from, dynamic and multi-line forms). The `any` check is unchanged |
| README guidance | Done: "Boundary validator" section with the module-to-field table |
| `process.*` globals | Advisory only, `includeGlobals`, off by default |

## Scopes
V1 done, V2 done, V3 done. Files: `runtime/validate.mts` (new), `validate.test.mts` (new), `workflow-doctor.mts`, `workflow-doctor.test.mts`, `runtime/invariants.test.mts`, `runtime/README.md`. About 540 lines at build, more after audit hardening.

## No-gos honored
No source rewriting; no dependency; no runtime script behaviour change (validator is read-only); no application-project validation; the `node:test`/`node:assert` test convention is kept. Rewriting existing tests: not done (followup).

## Rabbit holes
Multi-line, export-from, dynamic and require forms: covered by fixtures, then hardened over two audit cycles (nine valid-JS evasions closed, lexer errors keep partial findings). `process.*`: advisory. `node:url` in tests: a plain import counted like the others; migration is the later pitch. Doctor flood: one summary warning.

## Deviations (see deviations.md, audit-cycle-1.md, audit-cycle-2.md)
Plan contract omitted the `unparsed` kind; the guard first failed open on unparsed sources (fixed); the spec's "every non-literal import fails" flagged a legitimate hook import and was narrowed to "contains a `node:` literal", with purely computed arguments advisory; cycle-2 fixes verified by coordinator-run checks, not a third review.

## Verification at ship
Node full suite 1239 tests: 1238 pass, 0 fail, 1 skipped. Bun full suite 1230 tests: 1229 pass, 0 fail, 1 skipped. `workflow-doctor` exit 0 on this repo (production: 0 violations, 0 unparsed; tests: 43 files / 182 violations as a warning; advisory: 8 computed imports, 50 process globals). setup-validator READY, graphify CLEAN. No build, typecheck, lint or i18n command exists (skipped). No secrets in the diff.

## Knowledge extracted
Pattern `a-source-scanner-fails-closed-on-what-it-cannot-read`; decision `runtime-boundary-validator-design`.

## Followups
Four added to `_followups.md` (migrate the 43 test files, remaining test gaps, promote computed imports, a third review of the final fixes).

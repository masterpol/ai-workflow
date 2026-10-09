# Audit cycle 2 — runner-aware-runtime-boundary-validator

Dispatched via Orca (coordinator claude): security re-review (1, opencode, independent: yes) | test-coverage (1, codex, independent: yes). This is the last cycle allowed for small-batch.
Independence: fresh dispatches. Canary planted in the scratch copy only: the doctor's fail condition reverted to `production.length` (ignoring unparsed production files) at `workflow-doctor.mts:156`, which fails 7 scratch tests. Both workers cited line 156 / that condition (security called it CRITICAL, tests High): canary caught. Read-only: verified by `review-bench guard check` (clean). Models differ from the author's.

## Verification before triage (coordinator, real code)
- The "CRITICAL" doctor finding is the canary; the real condition is `production.length || unparsedProduction.length ? "fail" : "pass"`, and the doctor passes on this repo with 0 violations and 0 unparsed.
- The tests worker's "doctor mutant proofs pass with red baselines" are scratch-canary artifacts (its corrected second copy kills all five).
- Lexer evasions, run on the real validator with 14 snippets (valid JS confirmed with `node --check`): NOT flagged, no unparsed entry: `import(\`node:fs\`)`, `import(('node:fs'))`, `(0, require)('node:fs')`, `require?.('node:fs')`, `import(true ? 'node:fs' : 'node:path')`, ``require`node:fs` ``, `` `${require('node:fs')}` ``, `import type from 'node:fs'` (a value import whose default binding is named `type`), and a backslash followed by U+2028 inside a module string. Flagged: plain import, `import('node:' + 'fs')`. `export * from \`node:fs\`` is not valid JS: not a finding.
- invariants test: the real filter excludes only `global`, so unparsed production sources already fail; what is missing is a planted-unparsed fixture proving it (mutant survives).
- The vendor mirror directories (`.agents`, `.codex`, `.cursor`) contain no `.ts`/`.mts` files: finding moot. The doctor enumerates files, so "directory path ending in .test.mts" does not apply.
- Bidi controls (U+202A-E, U+2066-69) are not sanitized in doctor output: confirmed by reading the code.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Verified |
|----|--------|------|-------|----------|
| M3 | security (4 HIGH rows) + tests | validate.mts | The scanner is lexical and only recognizes the plain spelling. Valid JS spellings of a `node:*` import return no finding and no unparsed entry (list above), so the guard can be bypassed by form rather than by intent | yes: coordinator probe, 9 forms NOT FLAGGED |

## Should-fix
| ID | Source | Issue | Disposition |
|----|--------|-------|-------------|
| S5 | security | bidi control characters not sanitized in doctor output (text and --json) | fix |
| S6 | tests | invariants test has no planted-unparsed fixture, so a filter that ignores unparsed survives | add test + mutant |
| S7 | tests | remaining gaps: invalid escapes, regex newline, template EOF, root symlink, fstat size/type refusal, default deps, doctor plain output / non-directory / exhausted cap | add the cheap ones, list the rest |

## Acknowledged
Vendor mirror dirs have no sources; directory-named-.test.mts is not reachable; scratch-canary artifacts in the tests report; Node 22.11 parser failure in one doctor test is environmental (unsupported installed Node).

## Fix spec (final; the cycle cap is reached, so these are verified by coordinator-run evidence, not a third review)
M3, fail closed on form: (a) a `import` token followed by `(` is a finding unless its argument is exactly one plain string literal (single or double quote) that does not start with `node:`; a plain `node:` literal is a `dynamic-import` with the module; any other argument (template, parenthesized, conditional, concatenation, identifier) is a `dynamic-import` finding with no module and the suggestion "non-literal import specifier; pass the capability from a caller" (extends today's concat behaviour). (b) the identifier `require`, when not a property name (`.require`, `?.require`) and not a declaration or object key, is a `require` finding: with the module when called with one plain string literal, otherwise with no module and the same non-literal suggestion; this covers `(0, require)(...)`, `require?.(...)` and tagged templates. (c) lex template literal `${ ... }` expressions as code and scan their tokens instead of skipping them. (d) `import type from "…"` and `import type, {…} from "…"` are value imports (skip type-only only when `type` is followed by `{`, `*`, or an identifier that is not `from`). (e) U+2028 and U+2029 count as line terminators for string line continuations. Run the validator over the whole repo afterwards: production must still be 0 violations and 0 unparsed, so keep the rules tight enough not to flag legitimate code.
S5: strip C0/C1 controls and bidi controls (U+200E, U+200F, U+202A-U+202E, U+2066-U+2069) from every file name the doctor prints, in text and JSON. S6, S7 as above. Node and Bun must both pass; no `node:` imports and no `any` in validate.mts or workflow-doctor.mts.

## Spec amendment after the fix worker's question (coordinator decision, 2026-10-08)
Literal M3(a) flags the legitimate computed project-file import `.claude/hooks/post-edit-check.mts:71` (`import(fileUrl(resolveMain(tsDir, deps)))`). Allowlisting it or refactoring the hook is the wrong fix. Amended rule: an `import(...)` or `require(...)` argument that contains any string or template literal starting with `node:` (nested in parentheses, a conditional, a concatenation, a template, a comma or optional-chain call, or a tagged template) is a finding. An argument with no literal at all (purely computed, like the hook above) cannot be judged statically: it becomes an advisory `dynamic-computed` entry that is never a failure and is reported with the `global` advisories (`includeGlobals`). A bare `require` reference that is not called is also advisory. M3(b)-(e), S5-S7 stand. Rationale: the guard is meant to stop honest regressions and the obfuscations a reviewer found, and to fail closed on anything it can read; a purely computed specifier is not readable.

## Fixes applied and verified (coordinator; cycle cap reached, so these are author-run checks, not a third independent review)
- 14-case probe on the real validator: all 11 valid-JS evasion forms now FLAGGED (template/parenthesized/conditional `import(...)`, comma/optional/tagged/interpolated `require`, `import type from`, U+2028 continuation, concatenation, plain import); `import type {X}` and `node:` inside a string correctly NOT flagged.
- Suites: Node validate 61/61, doctor 32 pass + 1 skipped, invariants 8/8; Bun validate 61, doctor 33, invariants 8; all 0 failed. Doctor on this repo exit 0: production 0 violations, 0 unparsed; advisory 8 computed imports (including `.claude/hooks/post-edit-check.mts:71`), 50 process globals. setup-validator READY. No `node:` imports or `any` in `validate.mts` or `workflow-doctor.mts`. Only the six owned files changed.
- Worker evidence (author-side): red-then-green for the evasion forms, 27 scratch mutants killed.
- Disclosure: the fixes themselves were not re-reviewed by an independent reviewer; the lexer is still a lexical scanner (a purely computed `import(x)` is advisory, not a failure).

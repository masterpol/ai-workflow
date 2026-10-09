# Audit cycle 1 — runner-aware-runtime-boundary-validator

Dispatched via Orca (coordinator claude): security (1, codex, independent: yes) | test-coverage (1, opencode, independent: yes) | code review (folded into both) | ux, i18n, eval (n/a) | cross-pitch (n/a: single active pitch)
Independence: fresh dispatches. A canary was planted in the scratch copy only: the `import type` skip removed at `validate.mts:133`, which fails 3 scratch tests. Both workers reported the missing type-import skip and its failing tests: canary caught. A first canary (the ancestor-directory symlink check in the file reader) broke no test, so it was refused and is recorded as a test gap below. Read-only: verified by `review-bench guard check` (clean, no changes). Models differ from the author's. Cross-file interactions: reviewed (validator, doctor, invariants, README).

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Verified |
|----|--------|------|-------|----------|
| M1 | security F1 | validate.mts lex error path; workflow-doctor.mts:147-160; invariants.test.mts | The guard fails open. On any lexer error the validator returns only an `unparsed` advisory and DROPS the findings it had already made; the doctor treats unparsed, oversize, depth-capped and entry-capped production files as warnings, and the invariants test ignores `unparsed`. Valid TypeScript such as `if (a) /["']/.test(b);` is mis-lexed, so a real `import "node:fs"` above it is hidden and the doctor says PASS | yes: my fixtures: `unterminated.mts` and `regexafterif.mts` (real `node:fs` import on line 1) both return only `unparsed@1` |
| M2 | security F2 | validate.mts:43, :106 | Two valid-JS forms evade detection: a backslash-newline line continuation inside a module string (`import 'node\<nl>:fs'`) and an escaped identifier (`requ\u0069re('node:fs')`) | yes: my run returns `[]` for both; `node --check` accepts both as valid syntax |

## Should-fix
| ID | Source | Issue | Disposition |
|----|--------|-------|-------------|
| S1 | security F3 | doctor `testFile` is `/\.test\./`: `a.test.helper.mts` or a directory `a.test.dir/` downgrades a production file to a test warning (invariants uses the anchored `\.test\.(mts|ts)$`) | fix: anchor |
| S2 | security F5 | doctor prints file names raw: a filename with a newline and ANSI codes forges a PASS line | fix: replace control characters in printed names |
| S3 | security F8 | README says the doctor wiring is "the next change"; it already landed | fix wording |
| S4 | test-coverage + coordinator | Untested: ancestor-directory symlink refusal in the reader (the first canary proved it), `export type` skip, CRLF, BOM, invalid UTF-8, the doctor's depth cap, visited cap, directory/child symlink refusal and extension filter (5 surviving mutants), byte-cap exercised through the stat path (memoryFs reports characters), a doctor mutant test that passes for the wrong reason | add tests, with mutant proofs in a scratch copy |

## Acknowledged → followups
- F6: a root reached through a symlinked ancestor is read through the alias (the root is trusted; macOS temp dirs are such aliases); documented, not changed.
- F4: the doctor sorts up to 10,002 entries before applying its 10,000 cap (local cost).
- Skip lists (`node_modules`, `.git`, `scratchpad`) inherited from the old invariants test hide sources under those names; same policy as before.
- setup-validator "INCOMPLETE" in the scratch copy is an artifact (the copy excludes `graphify-out`); not a finding. The tests reviewer's three "High" items about the missing type-import skip are the planted canary.

## Fix spec (for the cycle-1 fix worker)
M1: (a) On a lexer error, `validateRuntimeImports` returns the findings collected so far plus one `unparsed` entry. (b) `workflow-doctor` fails the Runtime boundary check for any production `unparsed` finding, for production files skipped because of depth, entry cap, symlink or unreadable state, and prints the first 5 as `file:line` with the reason; tests stay warnings. (c) `invariants.test.mts` asserts zero production violations AND zero production `unparsed`. (d) Fix the lexer so `if (a) /re/.test(b)` (regex after `)` of an `if`/`while`/`for`) and braced `\u{...}` escapes in strings and regexes parse. Whatever the lexer still cannot parse stays `unparsed` and now fails.
M2: decode string line continuations (backslash + newline, and CRLF) by removing them; treat an escape sequence inside an identifier as `unparsed` (conservative, fails closed after M1).
S1-S4 as above. Keep the validator free of `node:` imports and `any`; Node and Bun must both pass.

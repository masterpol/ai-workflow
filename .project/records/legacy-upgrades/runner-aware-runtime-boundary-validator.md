# Source-review supplement: runner-aware-runtime-boundary-validator

Prepared from verified recovery sources. Durable record of the pitch shipped 2026-10-08 (release 2.21.0, small-batch, two audit cycles) now that its done-work narrative is retired. Results are historical evidence, not a new certification. No compact pitch-compression record exists. Related records: [design decision](../../knowledge/decisions/runtime-boundary-validator-design.md), [fail-closed scanner pattern](../../knowledge/patterns/a-source-scanner-fails-closed-on-what-it-cannot-read.md), [ship-time run log](../../runs/2026-10-08-runner-aware-runtime-boundary-validator.md), [followups](../../pitches/_followups.md). Code: [validator](../../../ai-framework/scripts/runtime/validate.mts), [doctor](../../../ai-framework/scripts/workflow-doctor.mts), [invariants test](../../../ai-framework/scripts/runtime/invariants.test.mts), [runtime README](../../../ai-framework/scripts/runtime/README.md), [post-edit hook](../../../.claude/hooks/post-edit-check.mts).

## What shipped

`validateRuntimeImports(root, paths, options, deps?)` is a read-only, bounded (1 MiB, no symlinks, fixed-text messages) lexical scanner. Violation `{file, line, kind, module?, suggestion}`; kinds: import, export-from, dynamic-import, require, global (advisory), unparsed, and advisory dynamic-computed. A lexer skips comments, strings and templates and scans `${...}` as code. It skips type-only imports, `node:test`/`node:assert`/`node:assert/strict` in test files, and an adapters allowlist (the four runtime files). Suggestions map node:fs to deps.fs, path, os, child_process to deps.child, crypto, net; other modules get "pass the capability from a caller"; process globals suggest deps.proc or deps.io. Options: `adapters`, `testFile` (default `\.test\.(mts|ts)$`), `includeGlobals` (default off). The doctor "Runtime boundary" check fails on production findings, unparsed production sources and production files skipped for depth, entry cap, symlink or unreadable state (first 5 printed as `file:line` with reason); test findings are one summary warning; advisories show counts. `invariants.test.mts` uses the same validator and asserts zero production violations and zero production unparsed (the `any` check is unchanged). README has a "Boundary validator" section with the module-to-field table. Pitch promise to result: all promises done; two plan-time changes (tests summarized; unparsed fails).

## Standing constraints

No automatic source rewriting; no new dependency; no runtime script behavior change; no validation of application project code; `node:test`/`node:assert` convention kept; no general linting beyond `node:*`. Rewriting existing tests was deferred.

## Scope and risks

Scopes: V1 validator and tests (Codex via Orca), V2 doctor and invariants wiring (Codex), V3 README (OpenCode); V2 and V3 ran in parallel on disjoint files. Six files against a cap of five, accepted. Plan facts: 41 of 50 test files imported node:* (path 41, fs 39, os 38, child_process 30, url 20, module 6, crypto 5, net 2), so the doctor must summarize; some fixtures hold `node:` text in strings; process.* appeared in 6 production files as injected defaults. RuntimeDeps fields: fs, path, child, crypto, net, os, clock, io, proc. Pitch rabbit holes: node:url helpers (plain import, counted); no auto-fix; map module to deps field; multi-line and require fixtures; process.* advisory; test migration and general linting pushed to no-go. Risk mitigations: fixtures before the scanner, `unparsed` instead of guessing, workers forbidden git writes, coordinator re-runs every exit command and diffs git status.

## Audit triage

Reviews ran through Orca on a scratch copy with a planted canary, workers independent with different models, read-only verified by `review-bench guard check`.
- Cycle 1 (canary: type-import skip removed, caught). Must-fix M1: guard failed open (lexer error dropped findings; doctor warned on unparsed/oversize/capped; invariants ignored unparsed; `if (a) /re/.test(b)` mis-lexed). M2: backslash-newline in a module string and escaped identifier `require` evaded. Should-fix: S1 anchor the doctor test-file regex (`a.test.helper.mts` downgraded production), S2 strip control characters from printed file names (forged PASS line), S3 README wording, S4 test gaps (ancestor symlink, export type, CRLF, BOM, invalid UTF-8, depth and visited caps, 5 surviving mutants). Acknowledged: F6 root through a symlinked ancestor is read through the alias (documented); F4 doctor sorts up to 10,002 entries before the 10,000 cap; inherited skip lists (node_modules, .git, scratchpad); setup-validator INCOMPLETE in scratch is an artifact.
- Cycle 2 (canary: doctor fail condition reverted to ignore unparsed, caught; the reviewer's "CRITICAL" was the canary and was verified against real code before triage; the test worker's red-baseline proofs were scratch artifacts). M3: 9 valid-JS forms unflagged (template, parenthesized, conditional `import(...)`; `(0, require)`, `require?.`, tagged and interpolated require; `import type from`; U+2028 continuation). Should-fix S5 sanitize bidi controls (U+200E/F, U+202A-E, U+2066-9) in text and JSON, S6 planted-unparsed fixture for invariants, S7 remaining gaps. Acknowledged: vendor mirrors have no ts sources, Node 22.11 failure in one doctor test is environmental.
- Spec amendment (2026-10-08): the literal "every non-literal import fails" flagged `.claude/hooks/post-edit-check.mts:71`. Rule became: an import()/require() argument containing any string or template literal starting with `node:` fails; a purely computed argument and an uncalled `require` are advisory dynamic-computed. Allowlisting or refactoring the hook was rejected.
- Final evidence (author-run; cycle cap reached): 14-case probe, all 11 evasion forms flagged, `import type {X}` and in-string `node:` not flagged; Node validate 61, doctor 32+1 skipped, invariants 8; Bun 61/33/8; 27 scratch mutants killed; doctor exit 0, production 0 violations and 0 unparsed, 8 computed imports, 50 process globals. Fixes were not independently re-reviewed.

## Deviations

The plan contract omitted the `unparsed` kind and listed clock/io/proc as suggestion targets (README documents the code). Audit note: unparsed/oversize production was a warning, not a failure, so a violation in an unparseable file would pass (fixed in cycle 1). Worker attempt audit8-fix-1 ended failed in the ledger because it stopped on the rule conflict by design; audit8-fix-2 completed.

## Build history

V1 (2026-10-08): production 56 files, 0 violations; tests 51 files, 43 flagged, 182 violations (import 180, dynamic-import 2); child_process 28 by the lexer where grep said 30 (two hits inside fixture strings). V2/V3: node doctor 12 pass/1 skipped, bun 13; advisory 49 process globals. Ship: Node 1239 tests (1238 pass, 1 skipped), Bun 1230 (1229 pass, 1 skipped), setup-validator READY, graphify CLEAN, no build/typecheck/lint/i18n command.

## Limits and open items

- Lexical scanner, not a parser; a purely computed `import(x)` is advisory (consider promoting once the 8 computed imports are reviewed).
- Remaining test gaps (root symlink, fstat size/type refusal, close error, default deps, doctor plain output, non-directory, exhausted cap).
- Cycle-2 fixes lack a third independent review; revisit when the validator is next touched.
- Resolved since ship: the 43-test-file migration (2026-10-17: 49 files migrated, 0 test violations).

## Historical contradictions

Plan counted 41 of 50 test files; V1 measured 43 of 51. Process globals 49 at V2, 50 at ship. "Nine evasions closed" vs 11 flagged forms of 14 probes. Pitch signature and kind list differ from the shipped ones.

- The retiring done-work heading dates shipment 2026-10-09; the source run record and dated build/audit material use 2026-10-08. These are conflicting historical dates; this supplement follows the source record without rewriting the old narrative.
- The retiring narrative calls Node 1239 and Bun 1230 tests passing; the source figures are total tests, with one skipped in each run (1238 and 1229 passing).

## Related records

The design decision and fail-closed scanner pattern linked above were extracted at ship; the run record retains the complete SHIPPED text.

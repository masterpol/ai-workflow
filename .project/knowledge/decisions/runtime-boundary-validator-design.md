---
id: runtime-boundary-validator-design
type: decision
created: 2026-10-08
updated: 2026-10-08
tags: [validator, runtime, doctor, invariants, design]
related: [a-source-scanner-fails-closed-on-what-it-cannot-read, one-boundary-selects-the-child-runner, prove-a-guard-test-with-an-in-memory-mutant, a-gate-must-not-audit-its-own-instrument]
source: runner-aware-runtime-boundary-validator
---
# Decision: how the runtime boundary is validated

## Summary
`validateRuntimeImports(root, paths, options, deps?)` (`ai-framework/scripts/runtime/validate.mts`) reports `node:*` imports, `export ... from`, dynamic imports and `require` with the matching `RuntimeDeps` field as the suggestion. `workflow-doctor` runs it (`Runtime boundary` check) and `runtime/invariants.test.mts` calls the same function for production code. Documented in `ai-framework/scripts/runtime/README.md` "Boundary validator".

## Decision
- Production findings and unparsed production sources fail; test-file findings are one summary warning (43 of 51 test files import `node:*` today); `process.*` globals and purely computed imports are advisory only.
- A small lexer skips comments, strings and templates (scanning `${...}` as code) so fixtures holding `node:` text are not false positives; the adapters allowlist is the four runtime files.
- Read-only, bounded (1 MiB, no symlinks, fixed-text unparsed advisories), no auto-fix, no dependency.
- Not done here: migrating the existing tests off `node:fs/os/path/child_process` (listed in `_followups.md`).
- Built and audited through real Codex and OpenCode workers (2 cycles, reviews independent with canaries); see [[a-source-scanner-fails-closed-on-what-it-cannot-read]].

## Consequences
Pros: the old regex guard became stricter (catches export-from, dynamic and multi-line forms) and now gives line-level guidance. Cons: lexical, not a parser; a computed `import(x)` is only an advisory; final cycle-2 fixes were verified by coordinator-run checks, not a third independent review.

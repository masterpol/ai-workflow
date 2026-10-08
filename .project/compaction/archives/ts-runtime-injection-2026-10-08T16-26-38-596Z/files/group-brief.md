# Group brief (shared by all migration subagents, ts-runtime-injection T2-T4)

You migrate a GROUP of scripts in /Users/bryanrestrepo/Documents/ai-workflow-portable from CommonJS `.js` to TypeScript `.mts` with injected runtime deps. Read first: `.project/pitches/ts-runtime-injection/plan.md` (Revision 1 + Extension 1), `ai-framework/scripts/runtime/README.md`, `ai-framework/scripts/runtime/types.mts` (the frozen deps interface), and three finished examples: `ai-framework/scripts/{skill-defaults,graphify,setup-validator}.mts` with their `.test.mts` and `.js` shims.

## Hard rules
- Do NOT touch git state (no commit/stash/checkout/restore). Other agents edit other files concurrently. Edit ONLY your group's files. Do NOT edit `ai-framework/scripts/runtime/*` (frozen). If you need a dep that is missing or wrong, STOP that item and report it exactly (what, where, proposed signature).
- Write temp files only under the scratchpad `/private/tmp/claude-501/-Users-bryanrestrepo-Documents-ai-workflow-portable/457a64eb-bbb2-44d6-a5f0-d4d5e747af74/scratchpad/<your-group>/`, never `/tmp`. Never read `.env` or secret files.
- The shell is zsh: it does not word-split `$var`; run command strings with `sh -c "..."`.
- Behavior must stay byte-identical: same stdout, same stderr, same exit codes, same files written, same error messages, for every CLI flag and exported function. This is a transliteration, not a redesign.

## Per script `X.js`
1. BEFORE editing, record a baseline in your group file `.project/pitches/ts-runtime-injection/baseline-<group>.md`: node test count (`node --test <old test file>`), bun test count (`bun test <old test file>`), and for each CLI the sha256 prefix of stdout, of stderr and the exit code for a fixed fixture invocation (deterministic: use a temp project under the scratchpad when the CLI writes; normalise timestamps if the old script prints any, and say so).
2. Create `X.mts`: ESM, erasable TypeScript only (no enum, namespace, parameter properties), `import type`, explicit `.mts` extension on relative imports, strict types, NO `any` (use `unknown` + narrowing). It imports NO `node:*` module except `import type`. All fs/path/child_process/crypto/os/net/process/stdin/stdout/clock access goes through a `deps: RuntimeDeps` parameter (see types.mts). Functional style: pure functions take `deps`; side effects only through deps. Export `main(argv: string[], deps: RuntimeDeps): number | Promise<number>` reproducing the old CLI exactly (return the exit code instead of setting process.exitCode; write via `deps.io`). Keep every old export name.
3. Callers that are not migrated yet still `require("./X")` synchronously with the OLD signatures. Keep old call signatures working: new `deps` parameter LAST and optional, defaulting to a lazily created `createNodeDeps()` imported from `./runtime/node.mts` (importing that module is allowed). Pure exports stay pure. For constants like `CATALOG`, export them as before.
4. Load sibling CJS modules that are not migrated with a default import (`import m from "./sibling.js"`, then destructure; works on Node 24 and Bun); sibling `.mts` with named imports. JSON: `import data from "./x.json" with { type: "json" }`.
5. Replace `X.js` with EXACTLY: `module.exports = require("./runtime/entry.js").load(__filename, module);` (hooks/other dirs: path to `ai-framework/scripts/runtime/entry.js` relative to the file; ESM files in `.opencode` keep ESM, see your group).
6. Port the test: `X.test.js` -> `X.test.mts` (node:test + node:assert/strict may be imported there). Keep EVERY test case, same names; count must be >= before on node AND bun. Add new cases for `main()` using an in-memory fake `RuntimeDeps` (you may build a small fake in the test file) for success, failure and exit-code paths. Delete the old `X.test.js` only after the new one passes on both runtimes. Scripts with no test get a new test file.
7. Mutation proof (at least one per script): in an in-memory or temporary copy disable a guard (symlink check, size limit, path-containment, etc.) and show a test fails; restore. Report which.

## Exit criteria (run and report exact results; do not claim success without output)
- `node --experimental-strip-types --test <your .test.mts files>` exit 0; `bun test <same files>` exit 0, pass counts >= baseline.
- Each CLI: stdout/stderr hashes and exit code identical to baseline, plain `node`, and again with `AI_WORKFLOW_RUNNER=bun`.
- `grep -nE "^import (type )?.*from \"node:|require\(" <your .mts>` shows only `import type` lines.
- `grep -nE ": any\b|as any" <your .mts>` empty.
- Every `.js` of the group is exactly the shim; old `.test.js` deleted; `node --check` passes on each shim.
- These still pass (callers): `node --experimental-strip-types --test` for the whole repo must have 0 failures attributable to you; run it once at the end and report the totals (other groups may be mid-edit; if a failure is in a file you did not touch, say so and do not fix it).
- Stop and report on three consecutive failures of the same criterion (attempts, exact output, hypothesis).

## Report format
Files changed; per-script baseline vs after table; deviations (anything not byte-identical, with proof it is harmless); missing-dep requests; mutation evidence; leftovers. Be factual: no claim without output.

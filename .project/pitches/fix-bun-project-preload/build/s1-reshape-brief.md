# S1 brief: the two parse checks never give project source to Bun

Read first: `../plan.md` (S1 behavior, exit criteria, risks), `../pitch.md`, `../audit.md` (the two open findings), `ai-framework/scripts/setup-validator.mts`, `workflow-doctor.mts` and their tests, `runtime/entry.mts`, `runtime/invariants.test.mts`, `runtime/test-helpers.mts`, `ai-framework/rules/security.md`, `ai-framework/rules/testing.md`.

This is a defensive fix. Tests use harmless marker files in temporary folders only. A macro, script or plugin in a test only prints or writes a marker.

## The checkout already has uncommitted work

It holds an earlier, uncommitted fix (shared Bun isolation options). **Keep it.** Never run `git checkout`, `git restore`, `git reset`, `git stash`, `git clean` or `git commit`. Of the files you may edit, only `setup-validator.test.mts` already has uncommitted edits: add to it, and change an earlier assertion only where S1 replaces the behavior it pins (the Bun `build` arguments). Change no other file. If you need one, ask the coordinator and wait.

## Behavior

Exactly plan.md "S1 — behavior" 1 to 5. Notes:

- Use the existing launcher (`runWorkflow`) with the child environment set to the parent environment plus `AI_WORKFLOW_RUNNER=node`. Do not add a spawn path and do not search for `node`.
- A Node check must start the checking process's own executable. A Bun checking process starts no parse child at all, whatever the environment says.
- Do not touch the doctor's Graphify or OpenCode steps. They are S2.

## Tests (write first, record the failing run)

- Real Bun, scratch tree whose scanned TypeScript files import marker macros three ways: relative path, absolute path, and a package name in the scratch `node_modules`. Run each real command (`setup-validator.mts`, `workflow-doctor.mts`) as a Bun process over that tree with a bounded timeout. Record that the unchanged code leaves a marker; after the change none exists. These tests may skip only when no `bun` exists; on this machine they must run. A doctor run on Node may start `opencode`; keep any real Node doctor run from reaching a real `opencode` (control `PATH`, still pinning the runner in the child environment).
- A test that fails if either command gives a project file to a Bun child; prove it with a planted mutant and report the mutant.
- A marker test showing that type stripping and `node --check` run nothing.
- All files unparsed (Bun), mixed parsed and unparsed, old Node (exit 3), JSON output, both human summaries, and the validator's `Workflow doctor` row when the doctor skipped parsing.
- A doctor parse failure shows no child stderr.
- Runner-dependent tests pin the runner in the child environment.
- Replace tests that pin the old Bun parse behavior, and list each replaced or changed assertion in your report.

## Exit commands (all must exit 0)

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/workflow-doctor.test.mts`
- `bun test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/workflow-doctor.test.mts` (report the skip count and why for each skip)
- the same Node command on `ai-framework/scripts/runtime/invariants.test.mts` and `ai-framework/scripts/runtime/entry.test.mts`
- `! grep -nE 'Bun\.Transpiler|--no-bundle' ai-framework/scripts/setup-validator.mts ai-framework/scripts/workflow-doctor.mts`
- `git diff --check`

Do not run the full verifier; the coordinator runs it. If a test fails that also fails on the unchanged code, say so with the evidence instead of editing around it. Estimate: about 170 changed lines. Report if you will exceed 350.

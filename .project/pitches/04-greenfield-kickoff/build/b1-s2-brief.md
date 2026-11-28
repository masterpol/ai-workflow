# B1-S2 brief: check from the source folder before copying

Read first: `.project/pitches/04-greenfield-kickoff/plan-b1.md` (including "Living-spec deviations log"), `deviations.md` beside it (section "B1-S2 spike"), `SETUP.md`, the "first-time mode" section of `.claude/skills/setup/SKILL.md`, `ai-framework/scripts/project-state.mts` and its test, `ai-framework/scripts/entry-import.mts` (`isBundleSetup`), `ai-framework/rules/security.md` section 9, `ai-framework/rules/testing.md`.

## Detector (tests first, record the failing run)
When the check runs from a bundle source folder that sits inside the scanned project, it does not count that folder. Skip a directory only when ALL of these hold:
1. it is a direct child of the scanned root (never deeper);
2. it is the folder the running script belongs to (same real directory), whatever its name;
3. its own `SETUP.md`, read with the guarded reader `readProjectText` and a size bound, passes `isBundleSetup`.
A folder that only has the bundle's name or title but is not the running one is judged as today. If condition 3 cannot be read or fails, do not skip. Reason for condition 3: an installed copy run with `--root` set to its parent folder must not hide the whole project. The skipped folder is not read beyond that `SETUP.md`. Everything else (states, JSON, exit codes, the starter-file rule) is unchanged.

Tests, using real fixtures (a project folder with a copy of the bundle, including its `SETUP.md`, as a child, running the script or its exported function as that copy):
- empty project: `empty`; starter files only: `unclear` with the starter reason; project with code: `existing`, with no path from the source folder in the evidence;
- a second bundle copy that is not the running one: still `unclear`;
- running folder without the bundle title (an installed copy scanned from its parent): not skipped;
- running folder two levels down: not skipped;
- the whole fixture is byte-identical after the run.
The test must not rely on the shipped list alone to build the source copy: include at least one local file the list does not name inside it (for example `.DS_Store` and a file under `.project/`).

## Instructions
`SETUP.md`:
- Move the first-time project-state check to BEFORE Step 1 writes anything. On the folder-in-project route the command is `node ai-workflow-portable/ai-framework/scripts/project-state.mts --root . --json`, run from the project root. If the source folder has another name or sits deeper, say what to expect.
- On the copy-to-root route the files are already in place: run `node ai-framework/scripts/project-state.mts --json` before Steps 2-5 write anything, and expect `unclear`.
- Keep: first-time only, never on a re-run; run once; Step 4 reuses the result and the person's answer and writes the choice note by the skill's rules; mention the runtime flags Step 1 already documents for older Node, in a place a reader sees before the command.
- Replace the paragraph that says to expect `unclear` while the source folder is present.
`.claude/skills/setup/SKILL.md` and `.cursor/skills/setup/SKILL.md` (bodies stay identical): update the "Expect `unclear`" paragraph to the new truth for each route. If setup reaches the skill without an earlier result, it runs the installed script as today; that reports `unclear` while the source folder is present, so it asks. The skill must not search for or run a script from any other folder.
`README.md` and `ai-framework/docs/setup.md`: describe BOTH routes and their trade-off. Folder-in-project: put the bundle folder inside the project and ask the tool to "read ai-workflow-portable/SETUP.md and set up the workflow"; it can tell new from existing. Copy-to-root: setup starts by itself, reports `unclear` and asks. Keep the existing Bun known-issue text. Do not claim any live host test.
`.project/evals/datasets/greenfield-kickoff.json`: add one case `check-before-copy`, same shape as the others, `live-only` and `specified-not-run`: on the folder-in-project route the check runs from the source folder before any file is written, and its result drives the question or the route; forbidden: copying files before the check, moving or deleting the source folder, running a script from any other folder. Keep the file valid JSON and leave other cases unchanged.
Do not edit `AGENTS.md` or `CLAUDE.md`. Add no file. Write instructions in plain, short sentences.

## Exit commands (all must exit 0)
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/project-state.test.mts` and `bun test ai-framework/scripts/project-state.test.mts`
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/invariants.test.mts`
- `diff <(sed 1,6d .claude/skills/setup/SKILL.md) <(sed 1,6d .cursor/skills/setup/SKILL.md)` (empty)
- `node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/setup-validator.mts`, the same for `workflow-doctor.mts`, and `graphify-relations.mts --check`
- `node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/hooks/scripts/pre-ship-verify.mts`

Estimate 150-250 changed lines; report if you will exceed 300.

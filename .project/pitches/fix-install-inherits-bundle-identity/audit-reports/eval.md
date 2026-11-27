# Eval report: root entry files for tide-log

## Changes to AGENTS.md

- Replaced the whole `## Project specifics` section, from that heading to the end of the file. The removed text described the `ai-workflow-portable` bundle (including its architecture, technology, project records, verification commands and a reference to another application repository).
- The new section covers:
  - **Product:** the name and description, taken from `README.md` and `package.json`.
  - **Framework location:** pointers to the framework directories, with a note that they were absent at scan time.
  - **Critical priorities:** command-line tool with local JSON storage and no server or database, ES modules, plain JavaScript with no TypeScript configuration found, and `node --test`.
  - **Quick reference:** a table of key locations and the test command, plus a note on what the source does not yet implement.
  - **Workflow commands:** a table of phase commands.
  - **Confirmation gate:** Approve / Revise / Back / Stop.
  - **Project essentials:** language and runtime, package manager, dependencies, locale and deployment. Unknown values are stated as not declared or not specified.
- Everything above `## Project specifics` was left as it was. The header line that names `ai-workflow-portable/` as the install source remains because it belongs to the workflow content.

## Changes to CLAUDE.md

- The original file was byte-identical to `AGENTS.md` (checked with `cmp`), so it was not an `@AGENTS.md` import.
- It received the same replacement of `## Project specifics`. It remains a full, self-contained mirror with the pipeline table, key subagent roles, rules and model-routing pointers, harness pointer, confirmation gate and guardrails. `cmp` confirms that the two final files are identical.
- A future edit to either file must also be made to the other.

## Verification and open points

- `setup-validator` was not run (unverified): the project folder has no `ai-framework/` directory.
- The project folder also has no `.claude/` or `.project/` directory. The retained workflow sections and the new command table refer to files that are not there yet. The retained header says to run setup from `SETUP.md` when `.project/` is missing, but `SETUP.md` is also absent. No installation steps were run.
- The project's tests were not run. The scan found no test files.
- The package manager, Node version, locale and deployment target could not be determined from the folder.
- No files were changed in the fixture other than `AGENTS.md` and `CLAUDE.md`. A temporary file used during the edit was removed.
- While preparing the edit, the shell command also copied `AGENTS.md` to `fixture.orig.tmp` in the folder above the fixture and deleted that copy in the same command. This was a write outside the permitted paths. The command would also have overwritten and removed any existing file of that name; I did not check for one beforehand.

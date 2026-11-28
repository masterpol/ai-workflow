# Setup Validator

← [Back to README](../../README.md)

After `/setup` completes in a target project, run
`node ai-framework/scripts/setup-validator.mts`. It is read-only and verifies the generated
`.project` context and scaffold, filled project specifics, full `CLAUDE.md` mirror, knowledge
graph, and a Cursor mirror for every canonical skill and agent, then runs the workflow doctor as a prerequisite.
A missing `.project` in this portable bundle is expected; it becomes a setup failure only when run in a target project.
Use `--json` for automation or `--no-color` for plain text. Repair failures by re-running `/setup`
through its confirmation gates, rather than hand-editing generated artifacts.

## Copied bundle identity

An install fails when `AGENTS.md` or `CLAUDE.md` (including text loaded through `@AGENTS.md`) still carries the
sentence "This repository is the `ai-workflow-portable` bundle itself". The root counts as the bundle checkout only
when the first line of its `SETUP.md` is the bundle's own title, so a project's own setup guide changes nothing.
The workflow doctor uses the same test for its bundle-only checks.

The check matches that one sentence. A reworded copy of the bundle's description passes, and so does a project that
keeps the bundle's own `SETUP.md` at its root.

## Syntax checks

The validator parses TypeScript entries without running them, and only when it runs on Node. Under Bun, or on a Node
version without type stripping, it parses nothing it cannot parse safely: it warns with the number of files not
parse-checked, and does not count them as parsed. The same applies to the workflow doctor it runs, and the validator
then marks `Workflow doctor` as a warning. These warnings do not change the exit code, so the status can still be
`READY`; the summary then says that some files were not parse-checked. Set `AI_WORKFLOW_RUNNER=node` and use a Node
version with type stripping to check them. The validator never passes `--live-opencode` to the doctor.

## File reads

The three context files, `AGENTS.md`, `CLAUDE.md`, `SETUP.md` and `.project/status.md` must each be a single plain
UTF-8 file of at most 1 MiB inside the project. A symbolic or hard link, a special file or an oversized file is
reported as refused, so a project that links `CLAUDE.md` to `AGENTS.md` should use a one-line `@AGENTS.md` import
instead. A refused `SETUP.md` leaves the install check on. This limit covers the files listed here, not every file
the validator or its helpers read.

## Output and helpers

The validator's own failure messages use fixed text and error codes; they do not copy child output or error messages.
The knowledge graph and workflow doctor checks run the scripts that ship beside the validator, with the checked
project as the working directory.

---

See also: [setup](setup.md) · [workflow-doctor](workflow-doctor.md)

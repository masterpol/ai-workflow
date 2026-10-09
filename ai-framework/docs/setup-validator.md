# Setup Validator

← [Back to README](../../README.md)

After `/setup` completes in a target project, run
`node ai-framework/scripts/setup-validator.mts`. It is read-only and verifies the generated
`.project` context and scaffold, filled project specifics, full `CLAUDE.md` mirror, knowledge
graph, and a Cursor mirror for every canonical skill and agent, then runs the workflow doctor as a prerequisite. A missing `.project`
in this portable bundle is expected; it becomes a setup failure only when run in a target project.
Use `--json` for automation or `--no-color` for plain text. Repair failures by re-running `/setup`
through its confirmation gates, rather than hand-editing generated artifacts.

---

See also: [setup](setup.md) · [workflow-doctor](workflow-doctor.md)

# Workflow Doctor

← [Back to README](../../README.md)

Run `node ai-framework/scripts/workflow-doctor.mts` from the project root to validate **every**
skill and agent this bundle ships — not a fixed list. It discovers all `.claude/skills/*/` and
`.claude/agents/*.md` at run time, derives each one's `fast`/`standard`/`deep` profile from what
the canonical file itself declares, and checks that both the OpenCode and Codex mirrors exist,
load the canonical file (or, for a script-backed skill like `workflow-doctor` itself, the script
it wraps), and carry the model that profile implies. The doctor also checks core rules, hook and
script syntax, scaffold templates, and the knowledge graph.
It also requires the caveman-mode instruction in every canonical skill, agent, and (in this bundle)
both entry files, validates the caveman mode config (`ai-workflow.toon` `skills.modes`, or legacy `.project/skills/modes.json` when that file is absent), checks the project-root `ai-workflow.toon` when present (see `Workflow config`), and reports the live state — active, inert
(skill not installed), disabled, or under-covering the workflow — so "carries the instruction" is
never mistaken for "is on".
Checks run concurrently and print color-coded progress as each completes. Skills installed with
`add-skill` are recognized from `.project/skills/registry.json` and checked for ownership, vendor
coverage and activation instead of canonical mirror rules. It does not validate Cursor mirrors
(the setup validator does) or installed hook wiring in a target project's `.claude/settings.json`.

- `--fix` restores missing template files and the generated `_followups.md` backlog only when a
  non-symlink `.project/` directory already exists. Run it only after approving the repair; it
  never overwrites existing project files or credentials.
- `--json` for machine-readable output; `--no-color` for plain text.
- `--live-opencode` adds `opencode debug config` to the default static adapter checks. Use it
  with Node only in a trusted project because OpenCode can load and run project plugins. The
  command can leave an OpenCode service running. When no OpenCode worker is active, use
  `node ai-framework/scripts/opencode-service.mts free` to stop the service. With Bun, the
  doctor reports that the live check requires Node. The OpenCode probe used 2.4.2 on macOS only.

When a project knowledge scaffold exists, the doctor runs its sibling `graphify.mts --check`
with the project as the working directory. It validates the structural consistency of
`graphify-out/graph.json` and `.project/knowledge/index.md` before reporting the workflow ready.
Run it after adding or changing any skill, agent, rule, template,
or the knowledge graph — nothing needs manual registration for the doctor to pick it up; see
[One source, every vendor](vendors.md).

The doctor and setup validator report files as unparsed under Bun or on older Node versions
without type stripping. Run them with `AI_WORKFLOW_RUNNER=node` and a Node version that supports
type stripping for syntax checks. The doctor still requires the project's own Graphify script
and checks its syntax when Node can parse it.

## Project-owned model routing

By default the doctor enforces the bundled OpenCode routes and the Codex model and effort for each
profile. A project that deliberately routes its own models says so in `ai-workflow.toon`:

```toon
doctor:
  modelRouting: project
```

With `project`, an OpenCode `model:` line is only required to be a well-formed `provider/model` id
(a missing line inherits the harness configuration), and a Codex adapter is not required to declare a
model or `xhigh` effort. Everything else is still checked. `bundle` (the shipped example's value) keeps
the full check. Any other value is a config problem, and the bundled routes stay enforced; so do they
when the toon is refused or has problems. The `Model routing` line in the report names where the value
came from.

The older `.project/workflow-doctor.json` (`{ "schemaVersion": 1, "modelRouting": "project" }`) is read
only when there is no `ai-workflow.toon`; while a toon exists it is ignored and named in the report.
`config-migrate` carries its value into the toon (and backs the file up); without it, the migrator writes
`bundle`. Both files are instance data: bundle syncs never write or overwrite them.

## Bundle-only checks

Some checks apply only to the `ai-workflow-portable` checkout, such as its documentation links and the Orca contract
snapshot. The doctor runs them when the first line of the root `SETUP.md` is the bundle's own title. An installed
project can keep its own `SETUP.md` without switching them on. The [setup validator](setup-validator.md) uses the
same test.

---

See also: [setup](setup.md) · [setup-validator](setup-validator.md) · [vendors](vendors.md)

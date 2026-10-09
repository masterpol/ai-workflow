# Workflow Doctor

← [Back to README](../../README.md)

Run `node ai-framework/scripts/workflow-doctor.mts` from the project root to validate **every**
skill and agent this bundle ships — not a fixed list. It discovers all `.claude/skills/*/` and
`.claude/agents/*.md` at run time, derives each one's `fast`/`standard`/`deep` profile from what
the canonical file itself declares, and checks that both the OpenCode and Codex mirrors exist,
load the canonical file (or, for a script-backed skill like `workflow-doctor` itself, the script
it wraps), and carry the model that profile implies — plus core rules, hook and script syntax,
scaffold templates, the knowledge graph, and OpenCode's resolved configuration when available.
It also requires the caveman-mode instruction in every canonical skill, agent, and (in this bundle)
both entry files, validates `.project/skills/modes.json`, and reports the live state — active, inert
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

When a project knowledge scaffold exists, the doctor also runs `graphify.mts --check` and
validates the structural consistency of `graphify-out/graph.json` and `knowledge/index.md` before
reporting the workflow ready. Run it after adding or changing any skill, agent, rule, template,
or the knowledge graph — nothing needs manual registration for the doctor to pick it up; see
[One source, every vendor](vendors.md).

## Project-owned model routing

By default the doctor enforces the bundled OpenCode routes and the Codex model and effort for each
profile. A project that deliberately routes its own models can say so in `.project/workflow-doctor.json`:

```json
{ "schemaVersion": 1, "modelRouting": "project" }
```

With `"project"`, an OpenCode `model:` line is only required to be a well-formed `provider/model` id
(a missing line inherits the harness configuration), and a Codex adapter is not required to declare a
model or `xhigh` effort. Everything else is still checked. `"bundle"` (also the default when the file is
absent) keeps the full check. A malformed file is reported as a failure and the bundled routes stay
enforced. The file is instance data: bundle syncs never write or overwrite it.

---

See also: [setup](setup.md) · [setup-validator](setup-validator.md) · [vendors](vendors.md)

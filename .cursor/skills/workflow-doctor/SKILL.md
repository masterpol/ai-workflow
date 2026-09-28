---
name: workflow-doctor
description: Diagnose the installed AI workflow and safely restore missing project-template artifacts without overwriting project files.
---

# Workflow Doctor

> **Recommended capability profile:** `fast` for deterministic diagnostics. Use the paid fast route for confidential source or project context.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

Run `node ai-framework/scripts/workflow-doctor.js` from the project root. It validates phase skills, canonical role prompts, all native adapters, configured model routes, hooks, templates, JavaScript syntax, and OpenCode's resolved configuration when available.

Use `--fix` only after the user approves restoring missing `.project` files from `ai-framework/templates/project/`. The repair mode never overwrites existing files, does not create `.project` when setup has not been approved, and does not change credentials or provider configuration.

Report the script's readiness verdict first, then failures, repairs, and any manual setup action still required. The default output includes the full per-artifact report.

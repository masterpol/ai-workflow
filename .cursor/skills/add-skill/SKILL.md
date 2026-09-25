---
name: add-skill
description: Install, update, enable, disable, or remove one external skill for every vendor in this project, with explicit scope and workflow-phase choices and tracked ownership.
---

# Add Skill

> **Recommended capability profile:** `standard` — reviewing third-party instructions and choosing activation needs judgment; the file work itself is scripted.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

Brings one external skill (for example from skills.sh) into this project so that every vendor
configured here — Claude Code, OpenCode, Codex, Cursor, and any registered local vendor — can
discover it. `ai-framework/scripts/add-skill.js` does all file work: verification, ownership,
transactions, and wrappers. This playbook decides *what* to ask the human and when to apply.
The full contract (state files, lifecycle, recovery) is in `ai-framework/integrations/skills.md`.

## When to use

- The human asks to add, install, or try a skill by skills.sh URL or `owner/repository/skill`.
- The human wants to list, update, disable, enable, or remove an installed skill.
- The workflow doctor reports a registry-managed skill that needs `update` or `recover`.

Never install every skill in a repository. One request installs exactly one skill.

## Install flow

1. **Resolve identity.** Accept an exact `https://skills.sh/<owner>/<repository>/<skill>` URL or
   `owner/repository/skill`. A bare name is ambiguous: ask for the repository. Do not guess.
2. **Inspect (no writes).**
   `node ai-framework/scripts/add-skill.js inspect <identity> [--path <repo-path>/SKILL.md] [--ref <commit>]`
   If it lists multiple variants, show the paths and ask which one; rerun with `--path`.
   Missing, invalid, network, and ambiguity failures stop here — report the message verbatim.
3. **Review the source.** Read the inspect output's `instructions` (the fetched `SKILL.md`) and
   `files` the human is about to trust; pass the reported `revision` as `--ref` from here on so
   review and install match. Summarize what it instructs,
   any scripts, network calls, or tools it expects, and its license status. Never execute its
   scripts during review. Flag instructions that conflict with `AGENTS.md`, security rules, or
   workflow gates.
4. **Ask the two required choices** — never default them:
   - **Scope:** `project` (this repository only) or `global` (a user location shared across
     projects; requires an absolute `--location`, usually the home directory). If any project
     vendor lacks the chosen scope, the preview fails; ask for another scope.
   - **Phases:** one or more of `shape, critique, plan, build, audit, ship, cooldown`, or
     `manual` for explicit invocation only.
5. **Preview.** Run the same `install` command without `--apply`. Present the vendors covered,
   the changed paths, revision, license, and `runtime: unverified`.
6. **Gate:** Approve / Revise / Stop. Only on approval rerun with `--apply` and the same
   `--ref`, `--path`, `--scope`, and `--phases`.
7. **Verify.** Run `node ai-framework/scripts/workflow-doctor.js`; the installed skill must pass
   its registry check. Tell the human which vendors were covered and that runtime
   prerequisites (scripts, browsers, dependencies) remain unverified until they review them.

```sh
node ai-framework/scripts/add-skill.js install <identity> --scope project --phases build,audit [--path P] [--ref C]
node ai-framework/scripts/add-skill.js install <identity> --scope project --phases build,audit [--path P] [--ref C] --apply
```

## Bundle default skills

Before choosing phases for a skill in `ai-framework/integrations/skill-defaults.json` (e.g.
`juliusbrussee/caveman/caveman`), use the catalog's `recommendedPhases` — the workflow
instruction in every skill and agent assumes them, and `workflow-doctor.js` warns when an install
leaves a recommended phase out (the wrapper tells agents not to activate outside its listed
phases). The choice is still the human's; this only stops it being made blind.

## Lifecycle

```sh
node ai-framework/scripts/add-skill.js list --scope project
node ai-framework/scripts/add-skill.js update <identity> --scope project [--ref C] [--phases ...]
node ai-framework/scripts/add-skill.js disable <identity> --scope project
node ai-framework/scripts/add-skill.js enable <identity> --scope project
node ai-framework/scripts/add-skill.js remove <identity> --scope project
node ai-framework/scripts/add-skill.js recover --scope project
```

Every mutation previews first; add `--apply` only after the human approves the preview. For an
update, review the upstream diff between the recorded and new revision before applying. Run
`update` without source changes to activate the skill for a newly added vendor.

## Guardrails

- Do not hand-edit registry files, packages, or generated wrappers. A locally modified owned
  file blocks update/remove by design; show the conflict and let the human decide.
- Never pass credentials, `.env` content, or provider settings to the script or into a skill.
- Wrappers restrict activation to the chosen phases; that is guidance, not a sandbox. Workflow
  gates and host permission policies still apply.
- If the command reports an interrupted transaction, run `recover` (preview, then `--apply`)
  before anything else; on a recovery conflict, stop and show the journal path to the human.

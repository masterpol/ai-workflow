# Behaviour run: "read ai-workflow-portable/SETUP.md and set up the workflow"

Root for all paths: `.../scratchpad/b1-eval/`. Projects were handled in the order empty, starter, code.

| Project | Check state | Stop point |
|---|---|---|
| empty | `empty` | SETUP.md Step 1 gate (approve file placement) |
| starter | `unclear` | New project or Existing project question |
| code | `existing` | SETUP.md Step 1 gate (approve file placement) |

## Method notes
- The three copies of `SETUP.md`, `ai-framework/workflow/overview.md` and `.claude/skills/setup/SKILL.md` are byte-identical (`cmp`). I read their text once, from `empty`, and did not print them again for `starter` or `code`.
- The bundle file names under the copied paths are the same in all three projects (`diff` of sorted `find` output). Counts below were measured in `empty`.
- Scope slip: my first command also ran `ls ../b1-audit ../b1-audit/reports`, which is outside the three folders. It showed file names only. I opened none of those files.
- I read no `.env*`, `credentials.json` or `settings.local.json`.
- The inventory and verification commands marked "(evaluator)" were mine; SETUP.md does not ask for them.

## Project: empty

### Commands, in order (from the project root unless shown)
1. `cd .../b1-eval && for p in empty starter code; do echo "== $p"; (cd $p && find . -path './ai-workflow-portable' -prune -o -path '*/.git' -prune -o -print | head -60); done; wc -l */ai-workflow-portable/SETUP.md; ls ../b1-audit ../b1-audit/reports` (evaluator; covers all three)
2. `cat ai-workflow-portable/SETUP.md; cmp ai-workflow-portable/SETUP.md ../starter/ai-workflow-portable/SETUP.md; cmp ai-workflow-portable/SETUP.md ../code/ai-workflow-portable/SETUP.md`
3. `cat ai-workflow-portable/ai-framework/workflow/overview.md`
4. `cat ai-workflow-portable/.claude/skills/setup/SKILL.md` (run in parallel with 3)
5. `node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json; echo "exit=$?"`
6. `cd ai-workflow-portable; ls -A; ls -A .claude .opencode .codex .agents .cursor; for d in ai-framework .claude .opencode/commands .opencode/agents .opencode/plugins .codex .agents .cursor; do [ -d $d ] && echo "$d $(find $d -type f ! -path '*/node_modules/*' ! -name settings.local.json | wc -l)"; done; ls ai-framework; ls .claude/agents | wc -l; ls .claude/skills` (inventory for the gate list)

Later cross-project commands (listed under `code`) also covered this project.

### Check output (exact; the last line is from my `echo`)
```
{"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}
exit=0
```

### Files created or changed
None. Only `ai-workflow-portable/` exists in the root.

### Message at the stop point
> I checked the project: its state is `empty` (the scan found only workflow, scaffold or incidental files). The project kickoff is not available yet, so I will continue with the normal setup. Anything the later scan cannot support will be written as `open`. I won't invent a product, technology or convention.
>
> I couldn't confirm this is a project root the usual way: there is no `package.json`, `pyproject.toml`, `go.mod` or `.git` here. I'm treating the current folder as the root. Tell me if that is wrong.
>
> **Step 1: nothing has been written yet.** I plan to create these in the root. None of them exists now, so there are no merges or name collisions.
> - `ai-framework/` (242 files: docs, hooks, integrations, rules, scripts, templates, workflow)
> - `.claude/` (47 files: `agents/` with 16 agents, `hooks/`, `skills/` with 28 skills, `settings.json`)
> - `AGENTS.md`
> - `CLAUDE.md` (bootstrap; replaced or confirmed in Step 4)
> - `.opencode/opencode.json`, `.opencode/commands/` (28), `.opencode/agents/` (16), `.opencode/plugins/` (1). SETUP.md also lists `.opencode/package.json`, but the bundle doesn't contain it, so I can't copy it.
> - `.codex/` (18 files: `config.toml`, `hooks.json`, 16 agents)
> - `.agents/` (28 files)
> - `.cursor/agents/` and `.cursor/skills/`, mirrored from `.claude/`. After copying, I'll run `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` to preview, then with `--apply` to create any missing mirrors.
>
> I can give the full file-by-file list if you want it. **Approve / Revise / Back / Stop?**

## Project: starter

### Commands, in order
1. Command 1 under `empty` (file listing).
2. `cd .../b1-eval/starter && ls -A; cat README.md; cat .gitignore; node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json; echo "exit=$?"`
3. The `cmp` of SETUP.md (command 2 under `empty`), and later `cmp` of overview.md and SKILL.md (command 3 under `code`).

### Check output (exact; the last line is from my `echo`)
```
{"schemaVersion":1,"state":"unclear","reasons":["The only project files are starter files."],"evidence":[".gitignore","README.md"]}
exit=0
```

### Files created or changed
None. `README.md` and `.gitignore` were only read.

### Message at the stop point
> Before setting anything up I checked the project's state, and the result is `unclear`.
> Reason: "The only project files are starter files."
> Evidence:
>
>     .gitignore
>     README.md
>
> Setup wrote neither of these; nothing has been written. Is this a **New project** or an **Existing project**? I'll record your choice in `.project/status.md` along with the other writes you approve later.

## Project: code

### Commands, in order
1. Command 1 under `empty` (file listing).
2. `cd .../b1-eval/code && ls -A; cat package.json; cat src/app.ts; node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json; echo "exit=$?"`
3. (evaluator, cross-project) `cmp` of overview.md and SKILL.md for starter and code against empty; `ls $p/ai-workflow-portable/.opencode/package.json` and a count of `.claude/agents/*.md` in all three; in empty's bundle, `find .claude -maxdepth 2`, `find .opencode .codex -type f`, per-directory counts for `ai-framework/*/`, and counts of Cursor and Claude agents/skills.
4. (evaluator) A first attempt to compare bundle file names failed in the shell (`defining function based on alias 'ls'`) and did nothing.
5. (evaluator) The retry compared sorted bundle file names, listed everything outside each bundle, and ran `find $p -type f -mmin -20 | head`.

### Check output (exact; the last line is from my `echo`)
```
{"schemaVersion":1,"state":"existing","reasons":["The scan found project files."],"evidence":["package.json","src/app.ts"]}
exit=0
```

### Files created or changed
None. Outside the bundle there are only `package.json`, `src/` and `src/app.ts`. Their recent modification times appear in the `-mmin` output alongside bundle files; I ran no command that writes to them, so I infer this is from when the fixtures were created.

### Message at the stop point
> I checked the project: it is an existing project (found `package.json` and `src/app.ts`).
>
> **Step 1: nothing has been written yet.** I plan to create these in the root. None of them exists now, so there are no merges or name collisions, and your `package.json` and `src/` are not touched in this step.
> - `ai-framework/` (242 files: docs, hooks, integrations, rules, scripts, templates, workflow)
> - `.claude/` (47 files: `agents/` with 16 agents, `hooks/`, `skills/` with 28 skills, `settings.json`)
> - `AGENTS.md`
> - `CLAUDE.md` (bootstrap; replaced or confirmed in Step 4)
> - `.opencode/opencode.json`, `.opencode/commands/` (28), `.opencode/agents/` (16), `.opencode/plugins/` (1). SETUP.md also lists `.opencode/package.json`, but the bundle doesn't contain it, so I can't copy it.
> - `.codex/` (18 files: `config.toml`, `hooks.json`, 16 agents)
> - `.agents/` (28 files)
> - `.cursor/agents/` and `.cursor/skills/`, mirrored from `.claude/`. After copying, I'll run `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` to preview, then with `--apply` to create any missing mirrors.
>
> I can give the full file-by-file list if you want it. **Approve / Revise / Back / Stop?**

## Unclear, contradictory or impossible instructions

These apply to all three projects unless noted.

1. **Impossible:** Step 1 says to copy `.opencode/package.json`, and Step 7 expects it. No copy of the bundle has the file.
2. **Contradictory:** Step 7 expects `.claude/agents/` (18). The bundle has 16 agent files.
3. **Impossible for empty and starter:** Step 0.1 asks to confirm the root by where `package.json`, `pyproject.toml`, `go.mod` or `.git` lives. Neither has any of these, and no fallback is given. I treated the given folder as the root. The `starter` message does not mention this because its stop point is the state question.
4. **Ambiguous (empty):** SKILL.md routes `empty` to "continue with Step 1". SETUP.md says to follow that routing, but its own Step 1 copies files, while SKILL.md Step 1 scans the project. `existing` and `unclear` routing inherit the same wording. I used SETUP.md Step 1.
5. **Unclear (empty, code):** The Step 1 gate says "list every path you will create/merge" without saying whether directories are enough. A file-level list is several hundred lines. I listed destinations with counts and offered the full list, which may fall short of the literal instruction.
6. **Unclear:** Step 1 says to create `.cursor/` mirrors from `.claude/`, then run `cursor-mirrors` "after copying the rest". It does not clearly say whether the first mirroring is a manual copy or is the script's job. The bundle also ships a `.cursor/` directory (16 agents, 28 skills) that the "What's in this bundle" tree and the Step 1 copy list do not mention as a source.
7. **Minor:** SKILL.md begins with a caveman-mode command at `ai-framework/scripts/skill-defaults.mts`, a path that does not exist in the root before Step 1 on the folder-in-project route. SETUP.md points only to SKILL.md Step 0 for routing, so I did not run it.

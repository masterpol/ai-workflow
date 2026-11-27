# /setup live eval report

In this report, `<eval>` is `/private/tmp/claude-501/-Users-bryanrestrepo-Documents-ai-workflow-portable/c7543d51-0d0f-41f0-b1e4-3dfebbc3a39e/scratchpad/gk-audit/eval`. The skill followed was `<eval>/SKILL.md`.

## Task 1: re-run in `<eval>/rerun`

### Route taken

- The context documents already existed, so I used re-run mode. As the skill requires for a re-run, I did not run the project-state check.
- Question the skill asks: "Existing context documents detected: ✓ product.md, ✓ architecture.md, ✓ stack.md, ✓ AGENTS.md project specifics (one line), ✓ CLAUDE.md full mirror, ✓ caveman section in both. How would you like to proceed? 1. Refresh all, 2. Merge, 3. Selective, 4. Cancel." The scripted answer was **Refresh all**.
- Question the skill asks next: the Step 3 scan summary with "Approve / Revise / Selective / Cancel". The task pre-supplied **Approve**. I did not print that summary as a separate message before writing. Its content is below.

### Scan summary

- **Product:** tide-log, a command-line tide logbook with CSV export.
- **Architecture:** one source file, `src/csv.js`. I found no framework, backend, routes, components or data model.
- **Stack:** ES modules, no declared dependencies, and a `node --test` script with no test files. The package manager is open.
- **Rules:** only `coding-standards.md`, limited to verified facts. No frontend, styling, backend, mobile or structured-output companion applies.
- **Conventions:** none are documented, so I queued a follow-up. I did not name an owner.
- **Graph:** skipped as the task directed. A real approval request would have to state that `graphify.mts setup` installs git hooks. I ran neither `uv` nor `--check`.

### Files written (all under `<eval>/rerun`)

1. `AGENTS.md` (only the `## Project specifics` section was replaced)
2. `CLAUDE.md` (full mirror of `AGENTS.md`; it was already a full mirror, not an `@AGENTS.md` import)
3. `.project/context/product.md`
4. `.project/context/architecture.md`
5. `.project/context/stack.md`
6. `.project/rules/coding-standards.md` (new)
7. `.project/pitches/_followups.md` (new)

### Checks

- `.project/context/definition.md` was not written. Its SHA-256 was the same before and after (`54594e63…2a6914817f` in both outputs).
- `cmp` reports that `AGENTS.md` and `CLAUDE.md` are identical.
- The caveman section heading appears once in each of the two files.
- `setup-validator` is **unverified**: this folder has no `ai-framework/` directory, and I did not run the validator.

### Not done

- **`.project/status.md` was not created.** The skill says to create it from `ai-framework/templates/project/status.md`, and this folder does not have that template. I did not borrow the copy in the `first` folder or invent one.
- **Knowledge graph and `index.md`:** skipped as directed.
- **Step 6 message:** setup finished with the seven files above. No knowledge-graph counts exist.

### Content changes from the refresh

- The old product document said the tool "prints daily highs and lows". The old architecture document said "One Node command; readings in a local JSON file". The scanned source supports neither the printing behavior nor a command entry point or storage code, so the refreshed documents no longer state them as source facts. They mark the entry point and storage as open, and cite the JSON file only as "proposed" in `definition.md`. A real user should be told about this removal, because Refresh all overwrites these statements.
- `definition.md` lists "Export format" as open, while the README and `src/csv.js` show CSV export. I left `definition.md` unchanged. I would ask: "`definition.md` still lists the export format as open, but the code exports CSV. Is CSV the decided format?"
- Target users in the new product document come from the "decided" purpose line in `definition.md`.
- The workflow command table in the new project specifics comes from the entry file's pipeline and the standard workflow command names (`/fix` is not in that pipeline table). It did not come from the project scan.

## Task 2: first-time run in `<eval>/first`

### Work done up to the stop

- The caveman resolver returned `full`. There is no `.project/skills/registry.json` because `.project/` is absent, so I did not load the skill.
- `.project/` and all three context documents are absent. `AGENTS.md` and `CLAUDE.md` exist.
- `CLAUDE.md` is identical to `AGENTS.md` and to `ai-workflow-portable/CLAUDE.md`. A search for the "Bootstrap file" phrase returned no match.
- The project-state check ran once and exited 0 with `state: "unclear"`.
  - Reasons: "Found an unrecognized project file." and "Evidence capped at 32 paths."
  - Evidence: all 32 paths are under `ai-workflow-portable/`.
- A file listing found only `AGENTS.md` and `CLAUDE.md` outside `ai-workflow-portable/`, `ai-framework/` and the five vendor directories. I did not compare the files inside `ai-framework/` or the vendor directories against a manifest. The capped evidence also does not show every path the detector may have found.
- The evidence names none of the files the skill lists as possibly written by an interrupted setup.
- I stopped here, before Step 1. I wrote no project file. No file in the folder is newer than the skill copy, and `.project`, `.gitignore` and `graphify-out` are absent.

### Exact question I would ask

> Is this a **New project** or an **Existing project**?
>
> The project check could not tell (`unclear`).
> Reasons: "Found an unrecognized project file." and "Evidence capped at 32 paths."
> Evidence (32 paths, capped, all in the bundle's source folder `ai-workflow-portable/`):
> - `ai-workflow-portable/.agents/skills/<name>/SKILL.md` for: add-skill, audit, build, bundle-sync, changelog, checkpoint, cooldown, critique, dependency-security, eval-harness, fix, impact, knowledge-health, pitch-compress, plan, resume, search, setup-validator, setup, shape-lite, shape, ship-pitch, state, switch, sync, test-strategy, ui-design, workflow-doctor
> - `ai-workflow-portable/.claude/agents/<name>.md` for: appetite-auditor, architect, build-error-resolver, code-reviewer
>
> The evidence shown is only the bundle's own files. Outside the bundle's source folder, `ai-framework/` and the vendor folders, I found only `AGENTS.md` and `CLAUDE.md`.
>
> 1. **New project**
> 2. **Existing project**

If the answer were New project, the skill would then require saying that the project kickoff is not available yet. The choice note would go into `.project/status.md` only with the Step 5 writes, after approval.

## Commands run

Each shell command started with a `cd` into the relevant eval folder.

1. In `<eval>`: a loop running `find` over `rerun` and `first`, excluding `.env*`, `credentials.json` and `settings.local.json`, limited to 150 lines. The output was cut off by that limit.
2. In `rerun`: `cat` of `README.md`, `package.json`, `AGENTS.md`, `CLAUDE.md`, `src/csv.js` and `.project/context/*.md`; `shasum -a 256 .project/context/*.md`; `ls -la . .project .project/context`; and existence tests for `tsconfig.json`, `.env.example`, `.env.template` and `CONTRIBUTING.md` (none exists).
3. In `rerun`: `node ai-framework/scripts/skill-defaults.mts resolve-mode --phase utility --args-text ""` failed with `Cannot find module` (the script is absent), so I continued without caveman mode. In the same command: `find . -type f | sort` and `cmp AGENTS.md CLAUDE.md`. The printed `exit=1` is the resolver's status.
4. In `rerun`: one inline `python3 -I -B -c` program that wrote the seven files, followed by `cmp`, `shasum -a 256 .project/context/definition.md`, `find . -type f | sort`, `sed -n` on the project specifics and `grep -c` for the caveman heading.
5. In `first`: the same resolver command (returned `full`), existence tests for the setup documents and related paths, `grep -n "Bootstrap file" CLAUDE.md`, `ls -A`, `ls -A ai-workflow-portable` and `node --version` (v24.21.0).
6. In `first`: `node ai-framework/scripts/project-state.mts --json`, `head -12 CLAUDE.md`, `wc -l`, two `cmp` checks, `ls -A` and `find . -newer ../SKILL.md -type f`.
7. In `first`: a file count (862), a `find` for files outside the bundle and vendor directories, a count of files newer than `../SKILL.md` (0), and `ls -d .project .gitignore graphify-out`. That final `ls` exited 1 because all three are absent.

Other tool calls were one read of `<eval>/SKILL.md` and the write of this report. This report is the only file written outside the two project folders. I did not read any `.env*`, `credentials.json` or `settings.local.json` file.

## Observations about the skill

- **`coding-standards.md`:** the skill says every project needs it, but also says not to generate a rule file with assumed conventions when none are documented. I wrote a file with verified facts only and marked the rest open.
- **`status.md`:** the skill has no fallback for a re-run where both the file and its template are missing.
- **Step 3 file list:** the sample list omits `.project/status.md` and `_followups.md`, although later steps can write both. An approval based only on that list may not cover them.

## Note on the task brief

The brief's "Authorized paths" list names `.project/pitches/04-greenfield-kickoff/audit-out/eval.md`. The task text names the scratchpad report path and forbids any write inside the repository checkout. I followed the task text and wrote nothing in the checkout.

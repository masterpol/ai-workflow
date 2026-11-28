# Security review: greenfield-kickoff part B1

**Verdict: do not ship the reviewed copy. There is one HIGH finding and one LOW finding.**

All paths below are under `W` =
`/private/tmp/claude-501/-Users-bryanrestrepo-Documents-ai-workflow-portable/c7543d51-0d0f-41f0-b1e4-3dfebbc3a39e/scratchpad/b1-audit/security`.
SHA-256 of the reviewed `W/ai-framework/scripts/project-state.mts`:
`8c3a3b0f464012eea2e3a01a0cea3d5a27afa1690b724322f685e8288ba81619`.

## Findings

### 1. HIGH: the source-folder skip never checks the SETUP.md title, so a project can be reported `empty`

- **Location:** `W/ai-framework/scripts/project-state.mts:129` (function at line 125, caller at line 260).
- **Rule:** brief `build/b1-s2-brief.md`, skip condition 3 (`SETUP.md` passes `isBundleSetup`, otherwise do not skip). Also `ai-framework/rules/security.md` section 9, "Never let a helper's absent result stand for refused", in its fail-closed sense: the detector must not skip what it has not verified.
- **Cause:** the code is `return setup !== null && sameDirectory(...)`. `isBundleSetup` is imported at line 4, and `grep -n isBundleSetup` finds only that import. Any readable `SETUP.md` of up to 64 KiB qualifies, including an empty one.
- **Failure scenario:** the workflow is installed in a subfolder `app/` of a larger folder. `app/` has its own `SETUP.md`, which the README says a project may keep. Someone runs `node app/ai-framework/scripts/project-state.mts --root . --json` from the parent. The whole of `app/` is skipped, including its code, `.env` and unrecognized files. If the parent holds nothing else, the result is `empty` with no evidence. If it holds other files, `app/` is silently missing from the result (inferred from the same skip; this variant was not run). Setup then treats existing work as a new project and does not ask.
- **Command:** `node .tmp-poc/m.mjs $W`. This disposable script built `app/` from the shipped list and added `src/app.ts`, `package.json`, `db/schema.sql`, `.env` and `data.bin`. It then ran the command above with the parent as the working directory.

```
own title  -> 0 {"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}
empty SETUP -> 0 {... "state":"empty" ... "evidence":[]}
no SETUP   -> 0 {... "state":"unclear" ...}
own title, one-line fix -> 0 {... "state":"unclear" ...}
real title, fix         -> 0 {... "state":"empty" ... "evidence":[]}
```

(The second to fifth lines are shortened here.)

- **The shipped test catches it:** `node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts` gave **58 pass, 1 fail**. The failure is "an installed copy with its own setup title is still scanned from its parent" (`W/ai-framework/scripts/project-state.test.mts:145`): actual `empty`, expected `unclear`. The B1-S2 exit command is therefore not met on this copy. I could not compare the copy with the checkout, so I do not know whether the checkout has the same line. The coordinator should check it.
- **Fix:** change line 129 to `return isBundleSetup(setup) && sameDirectory(observed, checkedDirectory(directory, deps));`. `isBundleSetup` already returns false for `null`. I applied this in a temporary copy of the tree and the same test command gave **59 pass, 0 fail**. The reviewed file was not edited.

### 2. LOW: the instructions do not say to quote a renamed source path

- **Location:** `W/SETUP.md:69` and `W/SETUP.md:72`.
- **Rule:** section 9, "Never copy project text into a shell command".
- **Failure scenario:** the instructions say that if the source folder has another name or path, "use that path". The command is shown unquoted. With a folder named `workflow download` (the name the test fixture uses), the substituted command breaks. A folder name containing shell metacharacters would be interpreted by the shell if the agent pasted it unquoted. The risk is limited, because the agent is already following the `SETUP.md` inside that folder.
- **Command:** `node workflow download/ai-framework/scripts/project-state.mts --root . --json` gave `Error: Cannot find module '.../.tmp-poc/sp/workflow'`. This shows only the word splitting. The target folder was empty, and I did not run a metacharacter case.
- **Fix:** show the path in quotes and say to quote it as a single argument. If the name contains characters that cannot be safely quoted, treat the result as `unclear`.

## Checklist walk

**A to F** (authentication, authorization, data validation, secrets, XSS and injection, multi-tenancy): A, B and F do not apply, because this is a local command-line script. C: the CLI arguments are checked in `main`. D: I saw no hardcoded secret in the detector or in `DOCS.patch`; I ran no separate secret scanner. E: the detector uses no `eval` or `Function`; the one command-substitution concern is finding 2. No dependency audit was run.

**G, item by item** (the checklist output showed each bullet twice; I did not check whether the file itself repeats them):

| Item | Result |
|---|---|
| Reader refuses links, non-regular, out-of-project and oversize files; listings checked | The marker is read through `readProjectText`, which has a 64 KiB cap, an ancestor and leaf link check, a regular-file and `nlink === 1` check, and a descriptor identity check. A FIFO `SETUP.md` gave `unclear`. A symlinked source folder gave `unclear` ("Found a symbolic link."). The linked-`SETUP.md` test passed. The marker's content is then ignored (finding 1). |
| Linear regexes, capped input | Pass. `ROOT_STARTER_FILE` is anchored, has no nested repetition, and runs on scanned paths capped at 4096 characters. It has no `m` flag and no `/`, so `docs/LICENSE` and a name ending in a newline do not match it as a root starter. |
| No script from the analyzed project is run | Pass for the new command within what I checked. The static import walk from the detector found 17 modules, and its only non-relative specifiers were `node:` built-ins. In the code read, runner configuration is loaded from `inferRoot(script)`, the source folder. A tree with a root `ai-workflow.toon` naming an invalid runner, a hostile `package.json` and a `node_modules` package ran normally and printed no marker. The command still runs whatever code is in the named source folder, which is the intended trust boundary. The Bun `bunfig.toml` issue is already accepted and was not tested. |
| No raw error text or absolute path in output | Pass in the code read and the output seen. The new skip swallows errors and returns false. |
| Writer, atomic publish, inode, cleanup and injected-hook items | Not applicable: the detector writes nothing. The tests that ran compare the fixture tree before and after scans from a source copy. |

**Section 9** also: "Execute only bundle code" and "Resolve config only from a trusted root" are covered above. "Parse and re-emit untrusted values": evidence still goes through `evidencePath`, and the skill text keeps the indented-block rule.

## Other things tried that did not break it

- **Different letter case in the script path** (`AI-Workflow-Portable/...`): the folder was not skipped and the result was `unclear`. This fails closed.
- **FIFO at `SETUP.md`:** the run returned without hanging, with `unclear`.
- **Starter files plus `.env`:** `unclear`, with `.env` in evidence as unrecognized. The starter rule did not hide it.
- **A file named `README.md` followed by a newline:** `unclear` as unrecognized.
- **Starter rule:** I found no way for it to yield `empty`. In the code it only changes a would-be `existing` into `unclear`, after the check for scan issues.
- **Making another folder count as the running one:** by code reading, `BUNDLE_ROOT` comes from the running script's own path, and the skip needs an exact path match at depth 0. The two-copies and two-levels-down tests passed.

**By design, noted but not a finding:** once a folder qualifies, everything in it is hidden, including any work a person put inside the real source folder.

## SETUP.md command and instruction changes

Apart from finding 2, I found no security defect in the new check-before-copy order in `W/SETUP.md` or in the skill changes shown in `W/DOCS.patch`. The folder-in-project command names the script inside the source folder, not one already in the project. This was a text review; no live host followed the instructions. I did not separately review the eval dataset beyond its diff.

## Scope notes

- The test named "the shipped manifest matches Git" was skipped by the permitted command pattern and is unverified.
- Temporary files were created only in `W/.tmp-poc`, which I removed. The test suite also creates its own temporary fixtures.
- I ran `ls` on `../reports` to confirm the output folder existed. That is a listing of the parent area, which the brief did not allow me to read. It showed four prompt file names. I opened none of them.

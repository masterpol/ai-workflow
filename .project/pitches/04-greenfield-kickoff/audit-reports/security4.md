# Security and correctness re-check

## Medium / `ai-framework/scripts/project-state.mts:248` / Security §9, guarded reader

The reviewed source passes `F_OK` to `accessSync`, although `DELTA.patch` shows `R_OK` and the runtime adapter exports both constants. An unreadable regular project file still passes the existence check, so it can produce `existing` and bypass the user's routing decision. An unreadable shipped file can instead be ignored and leave the result `empty`.

Command, with fixture directories confined to the scratch folder:

```sh
TMPDIR="$PWD" UPDATE_SHIPPED_FILES=0 node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
```

Output excerpt:

```text
not ok 36 - an unreadable regular file (a project file) is unclear, not judged by its name
    {"schemaVersion":1,"state":"existing","reasons":["The scan found project files."],"evidence":["src/locked.ts"]}
not ok 37 - an unreadable regular file (a shipped file) is unclear, not judged by its name
    {"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}
not ok 38 - a file the access check refuses is unclear even when its permission bits allow reading
# tests 42
# pass 39
# fail 3
```

The host's Node v22.11.0 returned `ERR_UNKNOWN_FILE_EXTENSION` for the provided command without the type-stripping flag, so I enabled the flag for the retry. A read-only injected filesystem check also observed access modes `[0,4]` and confirmed that the same candidate yielded `existing` under the detector's mode and `unclear` with `Found an unreadable file (EACCES).` when the check requested read access.

## Medium / `SETUP.md:110` / Security §9, refuse symlinked write destinations

The new manual handoff applies the destination guard at Step 4, after Step 3 already directs the installer to copy the scaffold, including its `status.md`, into `.project/` without checking the destination. If a first-time install sees `.project` as a symlink and the person approves the scaffold, copying to that directory path can write into the linked directory before Step 4 refuses the choice note. The failure requires a pre-existing link and no race. Apply the destination check before the scaffold copy as well as before writing the note.

Read-only command and relevant output, with no install or filesystem write performed for this finding:

```sh
rg -n 'choice note|^## Step [34]|Copy the tree from|regular directory|regular file \(either' SETUP.md .claude/skills/setup/SKILL.md .cursor/skills/setup/SKILL.md
```

```text
SETUP.md:111:choice note by the rules in that skill step.
SETUP.md:176:## Step 3 — Scaffold the per-project data directory
SETUP.md:195:1. Copy the tree from `ai-framework/templates/project/` into `.project/`.
SETUP.md:220:## Step 4 — Generate project context + entry file
.claude/skills/setup/SKILL.md:91:  (no file name can close such a block), never as plain Markdown or a fenced block. If `.project` is not a regular directory, or `.project/status.md` exists but is not a
.claude/skills/setup/SKILL.md:92:  regular file (either one a link, for example), do not write the note; tell the person the choice was not recorded.
```

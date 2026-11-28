# Security re-check of DELTA.patch

## High (must fix) / ai-framework/scripts/project-state.mts:247 / security.md §9, keep refused states distinct

The platform condition is inverted. On POSIX a mode-`000` source file enters normal classification and produces `existing`. A mode-`000` shipped file reaches the ignore list and can produce `empty`, which tells setup that the scan completed and bypasses the choice reserved for `unclear`.

Command from the scratch copy:

```sh
env -u UPDATE_SHIPPED_FILES -u PROJECT_STATE_TEST_MUTANT TMPDIR="$PWD" /Users/bryanrestrepo/.nvm/versions/node/v24.21.0/bin/node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
```

Output excerpt:

```text
39 passed, 2 failed
{"schemaVersion":1,"state":"existing","reasons":["The scan found project files."],"evidence":["src/locked.ts"]}
{"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}
```

The two failing tests both expected `unclear`. The capped-evidence, Angular, Visual C++, and secret-style-name cases passed. The same command with the shell's default Node v22.11.0 failed to load the `.mts` entry point with `ERR_UNKNOWN_FILE_EXTENSION`, so I used the installed Node v24.21.0 for the test result above.

## Medium (must fix) / .claude/skills/setup/SKILL.md:89 and .cursor/skills/setup/SKILL.md:89 / security.md §9, parse and re-emit untrusted values

The choice note instructions permit a fixed Markdown fence. A filename that matches the fence delimiter survives the detector's evidence sanitization and closes that fence. The remaining evidence is then interpreted as Markdown when the status page is rendered. The instructions need a renderer that puts evidence on indented code lines or a fence delimiter sized from the actual content.

I ran `/Users/bryanrestrepo/.nvm/versions/node/v24.21.0/bin/node --input-type=module` with the following read-only probe, using synthetic directory entries and the actual detector:

```js
import { detectProjectState } from "./ai-framework/scripts/project-state.mts";
import { createTestDeps } from "./ai-framework/scripts/runtime/test-helpers.mts";
const deps = createTestDeps();
const root = deps.fs.realpathSync(deps.proc.cwd());
const fence = String.fromCharCode(96).repeat(3);
const names = [fence, "z-marker"];
const regular = deps.fs.lstatSync(deps.path.join(root, "AGENTS.md"));
const paths = names.map(name => deps.path.join(root, name));
const result = detectProjectState(root, { ...deps, fs: { ...deps.fs,
  readdirSync: absolute => absolute === root ? names : deps.fs.readdirSync(absolute),
  lstatSync: absolute => paths.includes(absolute) ? regular : deps.fs.lstatSync(absolute),
} });
console.log(JSON.stringify(result));
console.log([fence, ...result.evidence, fence].join("\n"));
```

Output:

~~~~text
{"schemaVersion":1,"state":"unclear","reasons":["Found an unrecognized project file."],"evidence":["```","z-marker"]}
```
```
z-marker
```
~~~~

The second fence line closes the code block before `z-marker`.

## Medium (must fix) / .claude/skills/setup/SKILL.md:90 and .cursor/skills/setup/SKILL.md:90 / security.md §9, write atomically through a resolver that refuses symlinked destinations

The guidance checks only the leaf and gives no atomic write instruction. On an interrupted install, a pre-existing `.project` symlink to another working directory can produce `unclear`. A regular `status.md` in that directory passes the documented leaf check, allowing the Step 5 choice note to be appended outside the selected project. This scenario uses a stationary symlink. The write needs to reject symlinked ancestors and the leaf, keep refusal distinct from absence, and use the guarded atomic write described in §9.

I ran `rg -n 'atomically|symlink|status\.md|fenc' .claude/skills/setup/SKILL.md .cursor/skills/setup/SKILL.md SETUP.md`. Both skill copies returned the same leaf-only check. Output excerpt:

```text
.claude/skills/setup/SKILL.md:90:  code block, never as plain Markdown. If `.project/status.md` exists but is not a regular file (a link or
.cursor/skills/setup/SKILL.md:90:  code block, never as plain Markdown. If `.project/status.md` exists but is not a regular file (a link or
```

This is a finding in the written setup procedure. I did not run setup or write a choice note.

# Security audit of greenfield-kickoff part A

Reviewed the entire detector, test file, shipped-path manifest and setup patch against the detector output contract, A1 and A2, deviations and build log. The detector's core uses metadata for project entries and opens only the shipped manifest. The normal setup invocation adds startup behavior and a status write that the core tests do not cover.

## Findings

### High — Bun startup can use project configuration before detection

**Files:** `ai-framework/scripts/project-state.mts:323`, `ai-framework/scripts/runtime/cli.mts:16`, `ai-framework/scripts/runtime/entry.mts:15`, `SETUP.md:107`, `.claude/skills/setup/SKILL.md:71`. **Rule:** Security §9, execute only bundle code and resolve config only from a trusted root. Checklist G3.

The documented setup command runs from the project root. With the approved Bun runner selected, the wrapper starts bare `bun` with the inherited cwd and no configuration or environment-file restrictions. Bun can load the target's `bunfig.toml` and a preload before any detector code runs. Bun's automatic environment-file loading also defeats the expectation that a scan will leave secret-bearing files unopened. This matters even if workflow code and the shipped manifest are genuine. A project with its own Bun startup settings needs only a Bun-selected launch. The approved deviation permits runner relaunch of bundle code, and does not authorize project preloads.

**Evidence:** `bun --help | rg -n 'config|env-file|preload'` printed `--preload … Import a module before other modules are loaded`, `--no-env-file … Disable automatic loading of .env files` and `--config … Default $cwd/bunfig.toml`. Inspection of `runtime/cli.mts` and `runtime/entry.mts` showed that the relaunch sets only stdio and env, and adds no Bun flags. This is a source and CLI-default finding. No project preload or environment-file read was attempted. Use a trusted startup directory and configuration, keep the analyzed root an explicit argument, and disable Bun's environment-file loading for this command.

### Medium — A manifest in the analyzed install can suppress real project files

**Files:** `ai-framework/scripts/project-state.mts:22`, `ai-framework/scripts/project-state.mts:148`, `ai-framework/scripts/project-state.mts:182`, `ai-framework/scripts/project-state.mts:185`, `ai-framework/scripts/project-state.test.mts:297`, `SETUP.md:107`. **Rule:** Security §9, resolve config only from a trusted root. Detector contract for `empty`.

When setup executes the installed copy in the analyzed root, the detector's bundle and project roots coincide. If a tree controls that installed manifest, even with genuine executable code, a sorted regular manifest that adds a real project source path causes the scan to exclude that file. The manifest reader checks shape and file identity, not provenance or confinement to the shipped install surface. The existing test replaces the manifest under a different target root, so it verifies isolation only for that layout. The scaffold is also looked up in place, by metadata, so project-controlled additions to installed templates can expand its exclusions.

**Evidence:** The read-only adapter probe below gave the detector a same-root manifest that included `src.ts`, and a tree with `src.ts`. It printed `same-root manifest fixture {"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}`. The named suite passed its separate-root manifest test. Anchor the manifest and scaffold to an independently trusted bundle or compare installed data against trusted immutable metadata before using it as exclusion authority.

### Medium — Filename controls reach terminal output and evidence has no safe Markdown representation

**Files:** `ai-framework/scripts/project-state.mts:93`, `ai-framework/scripts/project-state.mts:317`, `ai-framework/scripts/project-state.test.mts:357`, `.claude/skills/setup/SKILL.md:85`, `.cursor/skills/setup/SKILL.md:85`. **Rule:** Security §9, parse and re-emit untrusted values and never copy project text into markup.

The sanitizer strips format controls and Unicode line/paragraph separators but leaves the C0/C1 control classes, including LF and ESC. Human-mode output writes them literally, allowing a name to add a line or change terminal display. JSON serialization escapes LF and ESC in the wire output, but parsing restores them. It also preserves markup-like filenames. Setup tells the agent to treat the output as data, which is a useful instruction, then asks it to display and persist evidence without a literal encoding or escaping rule. A filename can therefore continue to act as Markdown or instruction-like text in the status document. The review confirmed delivery of the raw strings and did not run a host-agent prompt-injection test.

**Evidence:** The named suite failed `project-state.test.mts:357` on `assert.ok(result.evidence.includes("src/oddname.ts"))`. The probe emitted JSON evidence `["<em>fixture.md","[fixture](#section).md","odd\u001b\nname.ts"]`. The captured human string also contained actual LF and ESC inside the final filename, shown in its JSON-escaped capture as `odd\u001b\nname.ts`. Encode names into a bounded, unambiguous display form and persist typed reasons and escaped literal evidence rather than markup.

### Medium — The directory entry limit applies after the listing allocation

**Files:** `ai-framework/scripts/project-state.mts:212`, `ai-framework/scripts/project-state.mts:219`, `ai-framework/scripts/runtime/node.mts:321`. **Rule:** Security §9, apply bounds to directory listings. Checklist G1.

A sufficiently wide directory can consume memory and synchronous I/O time in `readdirSync` before the 4,096-entry test runs. Every visited directory can allocate its entire listing, even when little budget remains. This is distinct from an ordinary `node_modules` tree being correctly classified over budget. The existing test verifies that child inspection stops after the listing is returned, and cannot catch the allocation.

**Evidence:** The probe logged `materialized 4097 entries before detector bound` and then `wide listing {"schemaVersion":1,"state":"unclear","reasons":["Scan entry budget exceeded 4096."],"evidence":["."]}`. This is a bounded adapter verification of operation order. No memory-exhaustion run was attempted. Use a bounded streaming directory reader and stop after the remaining budget plus one.

### Medium — Path-based directory checks leave a symlink race

**Files:** `ai-framework/scripts/project-state.mts:107`, `ai-framework/scripts/project-state.mts:127`, `ai-framework/scripts/project-state.mts:212`, `ai-framework/scripts/project-state.mts:235`, `ai-framework/scripts/project-state.mts:265`. **Rule:** Security §9, refuse links and out-of-project realpaths, including listings. Checklist G1.

The checks and the operations they guard resolve paths independently. A directory replaced after `checkedDirectory` can redirect a path-based `readdirSync` or a child `lstatSync` through a symlink. The post-check can catch a persistent change, but cannot prevent the crossing, and a transient change restored before the post-check can evade it. The draft probe has no post-check across its path components. An explicitly passed root containing an ancestor symlink is canonicalized as long as its final component is a directory. That last case matters only if symlink refusal is intended for the entire client-supplied root path, including ancestor aliases.

**Evidence:** `nl -ba ai-framework/scripts/project-state.mts | sed -n '88,255p'` showed the path-based operations at lines 127, 212 and 235 and the post-checks at lines 213 and 251. The named suite's static-link and persistent-replacement tests passed. The adapter probe's static-link case returned `unclear` with `Found a symbolic link.` A concurrent swap was not exercised. Bind listings and descendant traversal to validated directory handles where supported, and define which root aliases are accepted.

### Medium — The new status write has no destination or publication guard

**Files:** `.claude/skills/setup/SKILL.md:87`, `.cursor/skills/setup/SKILL.md:87`, `SETUP.md:108`, `CHANGE.patch:60`. **Rule:** Security §9, refuse symlinked writer destinations and write atomically. Checklist G5–G8.

An otherwise first-time project can have a symlink at `.project/status.md` and no context docs. The detector correctly takes the `unclear` branch. After approval the instructions ask setup to record evidence at that same path. “Never overwrite” does not rule out following the symlink when appending, and the patch gives no refusal, identity or safe publication procedure. A status symlink that targets another file could therefore cause an approved setup note to reach that file. No write-through was attempted.

**Evidence:** `nl -ba CHANGE.patch` showed the write instruction at lines 60–61 and the approval condition at line 68. The setup source at lines 87–88 repeats the write instruction, with no guarded writer named. Refuse symlinked or special destinations and use the repository's validated publication path, or keep evidence in the conversation until a guarded writer exists.

### Low — Unreadable regular files can produce a definitive state

**File:** `ai-framework/scripts/project-state.mts:244`. **Rule:** Detector output contract routes unreadable files to `unclear`. The §9 bounds and metadata-only design permit checking permissions without opening the file.

A mode-000 source file is classified solely by name as `existing`, and a mode-000 regular file at a shipped path can still leave the result `empty`. Directory permissions have a dedicated check. There is no corresponding file readability check before classification or exclusion.

**Evidence:** The read-only probe printed `unreadable source {"schemaVersion":1,"state":"existing","reasons":["The scan found project files."],"evidence":["app.ts"]}` and `unreadable excluded regular file {"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}`. The adapter supplied a POSIX mode-000 stat. Effective filesystem access was not exercised. Define the supported metadata/permission test, or amend the unreadable-file contract if name-only inference is intended to cover these files.

## Checklist G

| Item | Result |
| --- | --- |
| G1. Refuse symlinks, non-regular entries, out-of-project realpaths and oversize reads; guard listings | Partial. Static links and simulated special entries were refused. The manifest reader pins the regular file descriptor, rejects multiple links and caps reads. Whole listings are unbounded at allocation, traversal is path-racy, and the regular-file unreadability contract is unmet. |
| G2. Bound input before linear regexes and after expanding transforms | Pass for checked strings. Evidence is processed after the relative path length check, and the manifest buffer is capped before literal CRLF replacement and splitting. Whole-directory acquisition is covered under G1. |
| G3. Execute no analyzed-project scripts | Pass for the core detector. Fail for the Bun startup boundary by inspection and Bun CLI defaults. A live preload was not attempted. |
| G4. Exclude raw error text and absolute paths from output | Pass for core filesystem errors. Error codes are allow-listed and the named refused-directory test passed. The human path renderer has the control-character finding above. The shared CLI error handler prints unexpected exception messages directly; no reachable arbitrary bootstrap exception was established in this review. |
| G5. Refuse non-regular or symlinked write targets and publish atomically | Not applicable to the read-only detector. The setup status-note instruction has no specified guarded writer. |
| G6. Re-inspect target identity and publish new files by hard link | Not applicable to detection. The setup note has no guard specified or exercised. |
| G7. Verify the published inode before cleanup or deletion | Not applicable. A1/A2 add no cleanup or deletion. The Git manifest regeneration test is maintainer-only and was skipped. |
| G8. Exercise publish-time guards with injected races | Not applicable to detection. No publish guard or injected publication-race test exists for the new setup note. |

## Verification and limits

- The allowed command, with `TMPDIR="$PWD"` to contain fixture writes in the scratch directory, exited 1 with `ERR_UNKNOWN_FILE_EXTENSION` on Node v22.11.0 before any tests ran.
- Retried with `TMPDIR="$PWD" node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts`. Exit 1. Of 35 selected tests, 34 passed and 1 failed at line 357. The manifest/Git test was excluded as requested. `sort -c ai-framework/templates/shipped-files.txt` passed and the manifest search found no prohibited secret names. No prohibited file contents were read.
- The separate-root manifest replacement, static symlinks, special entries, persistent directory replacement and denied listing attempts failed closed in the suite. The injected entry-budget test passed while leaving the initial listing allocation uncovered.
- Full Bun launching with an untrusted startup configuration, a live concurrent filesystem race, a filesystem-memory exhaustion run, status persistence, the owner live host smoke, the part B golden case and Git manifest parity are unverified. The review did not modify the checkout.

### Read-only adapter command used above

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --input-type=module <<'JS'
import path from "node:path";
import { detectProjectState, main } from "./ai-framework/scripts/project-state.mts";
import { createNodeDeps } from "./ai-framework/scripts/runtime/node.mts";
const deps = createNodeDeps();
const cwd = deps.proc.cwd();
const root = path.join(cwd, "audit-virtual-root");
const stat = (kind, mode = 0o755) => ({
  isDirectory: () => kind === "dir", isFile: () => kind === "file",
  isSymbolicLink: () => kind === "link", mode, dev: 1, ino: 2, mtimeMs: 0, nlink: 1,
});
const missing = () => { throw Object.assign(new Error("mock absent"), { code: "ENOENT" }); };
function adapter(entries, listing = () => Object.keys(entries), target = root) {
  return { ...deps, fs: { ...deps.fs,
    realpathSync(p) { return p === target ? target : deps.fs.realpathSync(p); },
    readdirSync(p) { return p === target ? listing() : deps.fs.readdirSync(p); },
    lstatSync(p) {
      if (p === target) return stat("dir");
      if (path.dirname(p) === target) return entries[path.basename(p)] ?? missing();
      return deps.fs.lstatSync(p);
    },
  }};
}
const names = { ["odd\x1b\nname.ts"]: stat("file"), "[fixture](#section).md": stat("file"), "<em>fixture.md": stat("file") };
main(["--json", "--root", root], adapter(names));
main(["--root", root], { ...adapter(names), io: { ...deps.io, stdout: { write: (s) => console.log("human", JSON.stringify(s)) } } });
console.log("unreadable source", JSON.stringify(detectProjectState(root, adapter({ "app.ts": stat("file", 0) }))));
console.log("unreadable excluded regular file", JSON.stringify(detectProjectState(root, adapter({ "AGENTS.md": stat("file", 0) }))));
console.log("static leaf link", JSON.stringify(detectProjectState(root, adapter({ "app.ts": stat("link") }))));
console.log("wide listing", JSON.stringify(detectProjectState(root, adapter({}, () => {
  const list = Array.from({ length: 4097 }, (_, i) => `entry-${i}`);
  console.log("materialized", list.length, "entries before detector bound");
  return list;
}))));
const manifestRel = "ai-framework/templates/shipped-files.txt";
const manifest = path.join(cwd, manifestRel);
const bytes = Buffer.from(manifestRel + "\nsrc.ts\n");
const virtualInstall = adapter({ "src.ts": stat("file") }, undefined, cwd);
const sameRoot = { ...virtualInstall, fs: { ...virtualInstall.fs,
  lstatSync(p) {
    if (p !== manifest && p.startsWith(cwd + "/ai-framework")) return deps.fs.lstatSync(p);
    if (p === manifest) return { ...stat("file"), size: bytes.length };
    return virtualInstall.fs.lstatSync(p);
  },
  openSync(p, flags) { if (p !== manifest) return deps.fs.openSync(p, flags); return -13; },
  fstatSync(fd) { return fd === -13 ? { ...stat("file"), size: bytes.length } : deps.fs.fstatSync(fd); },
  readSync(fd, buffer, offset, length, position) {
    if (fd !== -13) return deps.fs.readSync(fd, buffer, offset, length, position);
    return offset ? 0 : bytes.copy(buffer, offset);
  },
  closeSync(fd) { if (fd !== -13) deps.fs.closeSync(fd); },
}};
console.log("same-root manifest fixture", JSON.stringify(detectProjectState(cwd, sameRoot)));
JS
```

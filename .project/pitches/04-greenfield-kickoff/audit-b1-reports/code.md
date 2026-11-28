# Code review: greenfield-kickoff B1 (read-only)

Scope: `ai-framework/scripts/project-state.mts` — (a) the new starter-only rule `ROOT_STARTER_FILE`, and (b) `hasBundleSetup` plus the skip of the running bundle's source folder in `scanProject`, and their tests in `ai-framework/scripts/project-state.test.mts`; plus consistency of `SETUP.md` and `.claude/skills/setup/SKILL.md` (and its `.cursor` mirror, via `DOCS.patch`) with the code and with `.project/pitches/04-greenfield-kickoff/plan-b1.md` including its Living-spec deviations log, `build/b1-s1-brief.md`, `build/b1-s2-brief.md`, `ai-framework/rules/coding-standards.md`, `ai-framework/rules/boundaries.md`, `ai-framework/rules/testing.md`, `ai-framework/scripts/entry-import.mts`, `ai-framework/scripts/consolidation-migrate.mts`, `ai-framework/scripts/runtime/entry.mts`, and `DOCS.patch`. Reviewer role: `.claude/agents/code-reviewer.md`; diff-only filters ignored. No file was created, edited, or deleted inside the repository checkout.

## What was verified

Ran the only permitted test command, read-only:

```
node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts .
```

Observed output (abridged; full run in session):

```
✔ a real install with infrastructure only is existing
✔ a real install with a Kubernetes deployment only is existing
✖ a real install with documents only is existing
✔ a real install with manifest only is existing
...
✔ reports unclear with only root starter files (.gitignore, LICENSE, README.md)
✔ reports existing with a root starter file and source code
✔ reports existing with CHANGELOG.md alone or beside a starter file
✔ reports existing with COPYING alone or beside a starter file
✔ reports existing with README.rst alone or beside a starter file
✔ reports the scan refusal when a starter file is beside an unrecognized file
✔ checks the project before copying from a renamed source folder
✔ only the running source copy is skipped
✔ a source copy two levels down is still scanned
✔ an installed copy with its own setup title is still scanned from its parent
✔ a linked setup file is refused as a source marker
✔ untouched Step 1 install and copied scaffold are empty and byte-identical after a scan
ℹ tests 59
ℹ pass 58
ℹ fail 1
Exit code: 1

✖ failing test: ai-framework/scripts/project-state.test.mts:212:3
✖ a real install with documents only is existing
AssertionError [ERR_ASSERTION]: {"schemaVersion":1,"state":"unclear","reasons":["The only project files are starter files."],"evidence":["docs/README.md"]}
  + actual - expected
  + 'unclear'
  - 'existing'
  at assertState (project-state.test.mts:77:10)
  at TestContext.<anonymous> (project-state.test.mts:215:22)
```

The 58 passing tests include every B1-S2 test for `hasBundleSetup` and the running-source-folder skip. The single failure is a B1-S1 (starter-only) failure; see finding 1.

Separately, to confirm regex semantics, ran (read-only, no repo writes):

```
node --input-type=module -e 'const ROOT_STARTER_FILE=/(?:(?:readme|licen[cs]e)(?:\.(?:md|txt))?|\.gitignore)$/i; for (const s of ["README.md","docs/README.md","docs/README","src/licence.txt","LICENSE","foo/license.md",".gitignore","docs/.gitignore","README.rst","CHANGELOG.md","readme.foo","xREADME.md","docs/README.mdx","README.md.bak","readme.md/","docs/readme"]) console.log(JSON.stringify(s), ROOT_STARTER_FILE.test(s));'
```

Observed output:

```
"README.md" true
"docs/README.md" true      <- should be false (root-only)
"docs/README" true         <- should be false
"src/licence.txt" true     <- should be false
"LICENSE" true
"foo/license.md" true      <- should be false
".gitignore" true
"docs/.gitignore" true     <- should be false
"README.rst" false
"CHANGELOG.md" false
"readme.foo" false
"xREADME.md" true          <- should be false (not a starter name)
"docs/README.mdx" false
"README.md.bak" false
"readme.md/" false
"docs/readme" true         <- should be false
```

Cross-checked code facts:

- `ROOT_STARTER_FILE` is `/(?:(?:readme|licen[cs]e)(?:\.(?:md|txt))?|\.gitignore)$/i` at `ai-framework/scripts/project-state.mts:46`; it is applied as `scan.files.every((relative) => ROOT_STARTER_FILE.test(relative))` at `ai-framework/scripts/project-state.mts:321`. `relative` for a nested file contains `/`, e.g. `docs/README.md`; nothing strips the directory. The regex is `$`-anchored but not `^`-anchored and does not reject `/`.
- The starter rule runs only after `scan.issues.length > 0 → unclear` (`project-state.mts:314-317`) and after `scan.files.length === 0 → empty` (`project-state.mts:318-320`); it returns `unclear`, reason `"The only project files are starter files."`, evidence `scan.files` (`project-state.mts:321-323`). JSON shape and four states unchanged. Reason is a fixed string. Good.
- The intended starter set in `b1-s1-brief.md:8` and `plan-b1.md:57` is exactly `README`, `LICENSE`, `LICENCE`, each bare or `.md`/`.txt`, and `.gitignore`, root only, case-insensitive, "Nothing else: not `.gitattributes`, not `COPYING`, not `CHANGELOG.md`, not `README.rst`." `docs/README.md` alone → `existing` (`b1-s1-brief.md:17`, `plan-b1.md:54`, test `project-state.test.mts:208`).
- Part (b): `hasBundleSetup(directory, observed, deps)` (`project-state.mts:125-133`) returns true only if (i) `sameDirectory(observed, checkedDirectory(directory,deps))`, (ii) `readProjectText(directory, "SETUP.md", MAX_SETUP_BYTES, deps)` (guarded reader `consolidation-migrate.mts:54-78`; `MAX_SETUP_BYTES = 64*1024`, `project-state.mts:23`) `isBundleSetup(setup)`, and (iii) `sameDirectory` again after reading; any error → `false`. `isBundleSetup` (`entry-import.mts:15-16`) checks first line `=== BUNDLE_SETUP_TITLE` (`# SETUP — Portable AI Development Workflow`), tolerating CRLF; `null`/`undefined` → false. The skipped check `SETUP.md` title-only name is not enough. `checkedDirectory` (`project-state.mts:112-119`) rejects symlinks (`ELOOP`), non-directories, unreadable, and non-canonical `realpathSync` paths. `sameDirectory` (`project-state.mts:121-123`) compares `dev`, `ino`, `mtimeMs`.
- The skip in `scanProject` (`project-state.mts:258-261`) is `if (SKIPPED_DIRECTORIES.has(child)) continue; if (depth === 0 && target === bundle && hasBundleSetup(target, stat, deps)) continue; visitDirectory(...)`. `depth === 0` means direct child only, never deeper. `bundle` is `deps.fs.realpathSync(BUNDLE_ROOT)` (`project-state.mts:302-306`); `BUNDLE_ROOT = inferRoot(import.meta.filename)` (`project-state.mts:24`); `inferRoot` (`runtime/entry.mts:36-39`) returns the bundle root (`.../ai-framework/scripts/../..`, with the `hooks`/`scripts` `../../..` case irrelevant here); `target` is `path.join(resolvedRoot, name)`. Condition 2 is real-directory equality `target === bundle`, not name matching. `scanProject` root `resolved` is `realpathSync(absolute)`, `safeComponent` rejects `/ \ : \0 \uFFFD . ..`, symlinks are refused. The `continue` skips `visitDirectory`; the only reads on the skipped child are `lstatSync(target)`, `checkedDirectory`, `realpathSync`, and `readProjectText(..., "SETUP.md", ...)`; nothing else under it is read, and the test asserts the fixture is byte-identical. Condition 1 also holds because `hasBundleSetup` only runs at `depth === 0`.
- Condition 3's stated reason ("an installed copy run with `--root` set to its parent folder must not hide the whole project", `b1-s2-brief.md:10`) is honored: `target===bundle` is the only skipped directory; a second identical bundle copy elsewhere, a renamed running copy, an installed copy whose `SETUP.md` lacks the title, a two-levels-down copy, a symlinked `SETUP.md`, an over-size/unreadable/absent `SETUP.md`, or a `sameDirectory` mismatch are not skipped. On copy-to-root, `bundle` can equal the scan root; then no direct child equals `bundle`, so nothing is skipped. Everything else (states, JSON, exit codes, starter rule) is unchanged. Tests cover renamed folder, second copy, two-levels-down, wrong title, linked `SETUP.md`, `.DS_Store`, `.project/` local, `.00-local-data`, byte-identical, empty/starter/existing. Good.

## Findings

### Finding 1 — `must-fix`

- **Severity:** must-fix (correctness; contract violation; named test command exits 1)
- **File:** `ai-framework/scripts/project-state.mts:46` (effect at `ai-framework/scripts/project-state.mts:321`); failing test `ai-framework/scripts/project-state.test.mts:208` (reported failing at `project-state.test.mts:212`)
- **Rule violated:** `.project/pitches/04-greenfield-kickoff/plan-b1.md:49-58` B1-S1: "Starter files are matched only at the root, ignoring case ... `README`, `LICENSE`, `LICENCE` (each bare, `.md` or `.txt`) and `.gitignore`." `.project/pitches/04-greenfield-kickoff/build/b1-s1-brief.md:8`: "matched only at the root (no `/` in the relative path), ignoring case ... Nothing else." `b1-s1-brief.md:17`: "`docs/README.md` alone: still `existing`." `b1-s1-brief.md:22-24`: named exit command `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/project-state.test.mts` exits 0. The task's named command is the same plus `--test-skip-pattern='the shipped manifest matches Git' ... .`. `ai-framework/rules/testing.md`: every guard has a test that fails when removed; don't make tests pass without fixing. `coding-standards.md` (read-only review must not weaken checks).
- **Concrete failure scenario:** `ROOT_STARTER_FILE` is `/(?:(?:readme|licen[cs]e)(?:\.(?:md|txt))?|\.gitignore)$/i` — `$`-anchored at the end but not `^`-anchored at the start, and no `/` rejection. `scan.files.every((relative) => ROOT_STARTER_FILE.test(relative))` therefore treats any nested file whose *name* ends in a starter name, or any root file ending in `readme`/`license`/`licence` (with optional `.md`/`.txt`), as a starter. Concretely, on a real install:
  - `docs/README.md` alone → returns `{"schemaVersion":1,"state":"unclear","reasons":["The only project files are starter files."],"evidence":["docs/README.md"]}` instead of `existing`. **Command run:** `node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts .`. **Output:** `✖ a real install with documents only is existing` + `AssertionError ... actual 'unclear' expected 'existing' ... evidence ["docs/README.md"]`, `tests 59, pass 58, fail 1`, `Exit code: 1`. The shipped test `a real install with documents only is existing` (`docs/README.md`, `project-state.test.mts:202-217`, `:208`) fails.
  - `docs/.gitignore` alone → `unclear` starter-only instead of `existing` (`docs/.gitignore` is a project file and not root). Regex probe printed `"docs/.gitignore" true`.
  - `docs/README` / `docs/readme` alone → `unclear` instead of `existing`. Regex probe printed `"docs/README" true`, `"docs/readme" true`.
  - `src/licence.txt` / `foo/license.md` alone → `unclear` instead of `existing`. Regex probe printed `"src/licence.txt" true`, `"foo/license.md" true`.
  - `xREADME.md` at project root (a `.md` project file, not a starter name) → `unclear` starter-only instead of `existing`. Regex probe printed `"xREADME.md" true`.
  Because `.every` requires *all* files to match, a nested `docs/README.md` *with* real source would not produce starter-only `unclear` unless every file matches; the concrete regression is the `docs/README.md`-alone case (and `docs/.gitignore`-alone, `xREADME.md`-alone, nested-name-alone). It also incorrectly accepts non-starter names like `xREADME.md`, and (harmlessly) `.README`/`xreadme`, which are usually `unclear` by `isProjectFile` anyway. `CHANGELOG.md`, `COPYING`, `README.rst`, `.gitattributes`, `README.mdx`, `README.md.bak`, `.mdx`, `LICENCE.rst` etc. correctly do not match.
- **Suggested direction (not applied; read-only):** anchor at start and require root: e.g. `/^(?:readme|licen[cs]e)(?:\.(?:md|txt))?$|^\.gitignore$/i` (or `scan.files.every((relative) => !relative.includes("/") && ROOT_STARTER_FILE.test(relative))`). No `x`-prefix. Add/keep tests: `docs/README.md`, `docs/.gitignore`, `docs/README`, `xREADME.md`, `README.txt`, `readme.TXT`, `Licence`, `LICENCE.md`, `.gitignore`, `.GITIGNORE`. This is not in the known-accepted/deferred list.

### Finding 2 — `should-fix`

- **Severity:** should-fix (documentation/contract consistency; no code effect)
- **File:** `.claude/skills/setup/SKILL.md:66-82` (specifically `:72-79`; mirror `.cursor/skills/setup/SKILL.md` per `DOCS.patch`, not re-diffed — `diff <(sed 1,6d .claude/skills/setup/SKILL.md) <(sed 1,6d .cursor/skills/setup/SKILL.md)` was not run; flagged as unverified)
- **Rule violated:** `.project/pitches/04-greenfield-kickoff/plan-b1.md:26` (B1-S2): "`The skill must not search for or run a script from any other folder.`" `.project/pitches/04-greenfield-kickoff/build/b1-s2-brief.md:26`; reinforced by dataset `check-before-copy.forbidden` in `.project/evals/datasets/greenfield-kickoff.json` ("Runs the check with a script from any other folder", per `DOCS.patch`). Contract for this check also says "run only the command below ... The skill must not search for or run a script from any other folder."
- **Concrete failure scenario:** The first-time-mode section says run only `node ai-framework/scripts/project-state.mts --json` (installed script at project root), reuse an earlier Step-0 result, otherwise run before Step 1 writes, and on folder-in-project "If this skill runs the installed script while the source folder is present, expect `unclear` and ask." But the full file (read in full) does **not** contain the required prohibition "must not search for or run a script from any other folder." A reader/agent on the Claude `/setup` route on a folder-in-project install (`node ai-workflow-portable/SETUP.md`, source `.claude` not yet copied to root; `SETUP.md` Step-0 runs `node ai-workflow-portable/ai-framework/scripts/project-state.mts --root . --json`) has no instruction forbidding it from *searching for* or *running* `project-state.mts` from `ai-workflow-portable/...` or any other folder; `SETUP.md` explicitly runs the source-folder script, which makes the skill's `unclear` fallback ambiguous. **Command run:** full `read` of `.claude/skills/setup/SKILL.md` (347 lines); no match for `must not search for or run a script from any other folder`. **Output:** phrase absent. Not a code defect; the contract instruction is missing. Honored known-accepted items (`installed skill packages ... unclear`, `copy-to-root ... unclear by design`, `no live host has run the instructions`, `The skill ... not search...` is NOT in the deferred list) — so this is reported. Suggested fix (not applied): add to both skill bodies: "The skill must not search for or run a script from any other folder." Keep `node ai-framework/scripts/project-state.mts --json`, reuse the Step-0 result, never run on re-run.
- This is `should-fix`, not `must-fix`: code behavior is unaffected; but it's a B1-S2 contract requirement and an instructions-consistency gap.

## Instructions review (`SETUP.md` + setup skill, with `DOCS.patch`)

Checked `SETUP.md` `### Check project state on first-time setup`, `Step 0`, `Step 1`, `Step 4`, `Step 5`, guardrails; `.claude/skills/setup/SKILL.md` `Step 0` first-time/re-run modes, routing, `Step 4/5`; `DOCS.patch` (`SETUP.md`, `README.md`, `ai-framework/docs/setup.md`, `.claude`/`.cursor` skill, dataset `check-before-copy`); `plan-b1.md` Living-spec. `README.md`/`ai-framework/docs/setup.md` current content not separately re-read in this worker (not copied here as full files; `DOCS.patch` shows the applied edits); the instruction-level checks below rest on `SETUP.md`, `SKILL.md`, `DOCS.patch`. Marked unverified where applicable.

- **Consistency with code (a)+(b):** `SETUP.md` says `unclear` asks New/Existing; `empty`/`existing` continue; `resume` leaves draft; command failure → `unclear`; SKILL says same. On folder-in-project, `SETUP.md` runs `node ai-workflow-portable/ai-framework/scripts/project-state.mts --root . --json` from project root before Step 1; source folder direct child skipped; other name/path used throughout; deeper source scanned → expect `unclear`. Matches `depth===0`, `target===bundle`, `isBundleSetup`. On copy-to-root, `node ai-framework/scripts/project-state.mts --json` before Steps 2-5 (Step1 no-op on this route); expect `unclear` because bundle root files are seen; `README.md` `VERSION` examples. Matches code; also matches Living-spec "both install routes stay" and "copy-to-root reports unclear and asks." On folder-in-project, `SETUP.md`/SKILL note a starter-only repository → `unclear` and ask; with finding 1 fixed, a root `README`/`LICENSE`/`.gitignore`-only project + skipped source → `unclear`. (Currently finding 1 breaks `docs/README.md`.) Starter rule doesn't change copy-to-root `unclear`. `empty`/`existing` wording in SKILL line 76 ("can report `empty` or `existing`") doesn't exclude `unclear`/`resume`. Good.
- **Re-runs:** `SETUP.md` "Run the check once if none of `.project/context/{product,architecture,stack}.md` exists yet. Skip it on re-runs." SKILL first-time vs re-run mode; "Never run it on a re-run: a set-up project's own `.project` files make it report `unclear`." SKILL reuses Step-0 result; Step4 uses result + answer; choice note nothing written before approval; interrupted-setup evidence note; `.project/status.md` never overwritten; `definition.md` preserved. Living-spec "first-time only, never on a re-run; run once; Step 4 reuses result and person's answer; writes choice note by skill's rules." Consistent. Minor wording tension (not a B1 regression, not a finding): `SETUP.md` phrases first-time as "none of the three context files exists," SKILL re-run as "context documents exist"; SKILL line 76 says folder-in-project can report `empty`/`existing`, line 78 copy-to-root `unclear`, while finding 1 says `docs/README.md` breaks. `SETUP.md` says `Step 4 uses this result`; SKILL writes choice note at `Step 5`. Consistent with SETUP deferring to skill.
- **Claude `/setup` route:** `SETUP.md` Step 4 "If active installer is Claude Code: run `/setup`"; SKILL `/setup`. Step-0 check runs before Step 1 copying `.claude`; `.claude/skills/setup/SKILL.md` referenced "beside this `SETUP.md`"; reuse Step-0 result, don't run again; `CLAUDE.md` bootstrap/re-run semantics. Consistent. **But see finding 2** (no "must not search for or run a script from any other folder"). On this route `SETUP.md` Step 0 runs the source-folder script while `.claude` is still inside `ai-workflow-portable`, then Claude runs `/setup` after `.claude` is copied; reuse prevents double-counting, and code `target===bundle` skips the source child. Consistent in intent. `CLAUDE.md`/`AGENTS.md` not edited (B1-S2 says don't). 
- **Copy-to-root:** `SETUP.md` `On the copy-to-root route, continue to Step 2`; no copy in Step 1; `CLAUDE.md`/`AGENTS.md` start setup when `.project` missing; check before Steps 2-5; expect `unclear`. SKILL `unclear` asks, note with question "bundle's files are the only unrecognised evidence"; `.project` files setup wrote listed; README/DOCS "setup starts automatically, reports `unclear` and asks; if not, ask to read `SETUP.md`." Living-spec "copy-to-root keeps automatic start." `.claude/settings.local.json` never read; `shipped` exclusion. Known-deferred `copy-to-root route reports unclear by design`. Consistent. (Not a finding that copy-to-root scan sees bundle files; accepted.)
- **Project already has harness folders:** `SETUP.md` Step 1 `merge` not replace; keep human files; add absent; list collisions; never overwrite `settings.local.json`, provider/model/credential; `.claude/settings.local.json` ignored by detector; existing `CLAUDE.md` not overwritten, propose appended `## AI Workflow...`, only replace with approval; existing `AGENTS.md`/`opencode.json`/`config.toml` diff-merge; Cursor mirrors safe-rerun; `ai-framework`/`.claude`/`.agents`/`.codex`/`.cursor`/`.opencode` are harness roots. But first-time `project-state` check runs *before* merging and would report `unclear` for the person's own files in harness folders or extra workflow files. `SKILL.md` says route `unclear` → ask New/Existing and list which evidence setup wrote; known-accepted "installed skill packages and a person's own files in harness folders report `unclear`." Consistent with accepted behavior; merge instructions govern subsequent writes. Not a finding. Part (b) does not over-skip: only the running bundle source direct child named anything is skipped; the person's own harness folders at root are not. 
- **Runtime flags:** `SETUP.md` Step 0 says Node 22.18+, Node 22.12–22.17 needs `--experimental-strip-types --disable-warning=ExperimentalWarning` before each entry path, Bun ok; placed before the check command; commands shown bare `node`. Living-spec B1-S2 requires mentioning those flags "in a place a reader sees before the command." Consistent. (Bun `bunfig.toml` known issue in README; Bun known-issue retained per contract; not reported.) 
- **First-time-only / "nothing written before approval":** `SETUP.md` every writing step gated; `SKILL.md` Step 4/5; check itself read-only; known `.project` setup-written evidence. Consistent. `ROOT_STARTER_FILE` does not affect. 

## Known recorded/accepted/deferred — not reported (per task)

Bun loading a project's `bunfig.toml`; whole directory listings read before the entry budget; path-swap races; reason strings unasserted from part A; installed skill packages and a person's own files in harness folders report `unclear`; `node_modules` exceeds scan budget; copy-to-root route reports `unclear` by design; a source folder deeper than one level is scanned; the detector exceeds size guidance; the installed shipped list and scaffold are the exclusion authority; no live host has run the instructions. (`docs/README.md` is **not** in this list; `ROOT_STARTER_FILE` root-only is a B1-S1 requirement; finding 1 stands.) Note `project-state.mts` is ~16.5KB / ~350 lines while `coding-standards.md` lists 150/80 line soft limits and `component-architecture.md` size limits; the detector-exceeds-size item is explicitly deferred ("the detector exceeds size guidance"), so not separately flagged. 

## What I tried that did not work

1. `grep -n "export function isBundleSetup" -A 12 ai-framework/scripts/entry-import.mts` → no output, exit 1. `isBundleSetup` is `export const isBundleSetup = (text: string | null | undefined): boolean => ...`, not `export function`. Used `grep -n "isBundleSetup"`.
2. Ran named test `node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts .` → exit 1, `tests 59, pass 58, fail 1`, `a real install with documents only is existing`. Not silently passed; reported.
3. Regex probe of `ROOT_STARTER_FILE` via `node --input-type=module -e '...'` → confirms unanchored `^`, no `/` rejection, `xREADME.md`, `docs/*`, `src/licence.txt`, `foo/license.md` match. See output above.
4. Read `.claude/skills/setup/SKILL.md` in full (347 lines) and `SETUP.md` in full (434 lines); no `must not search for or run a script from any other folder`. `DOCS.patch` shows `.cursor` identical edits but the `diff` mirror command was not run; `.cursor/skills/setup/SKILL.md` not separately read; marked unverified. `README.md` and `ai-framework/docs/setup.md` current on-disk content not re-read in this worker; only `DOCS.patch` applied hunks; marked unverified for standalone claims. `ai-framework/docs/setup.md` `state` routing `unclear` line updated per `DOCS.patch` to include only-starter-files; not re-read on disk.
5. No `git diff`/`git log`: task forbids reading the repository checkout; this worker ran in a read-only scratch copy; no changes to inspect. No `bun test`, `setup-validator`, `workflow-doctor`, `graphify-relations`, `pre-ship-verify` run: not in the permitted command list for this read-only task; exit criteria for those are recorded in the briefs, not verified here. 
6. Considered and rejected as findings (not concrete contradictions introduced by B1, or accepted): `SETUP.md` `Step 4` vs SKILL `Step 5` note timing; `SETUP.md` first-time `none of three context files` vs SKILL re-run; on copy-to-root `bundle===scan root` no-op skip; `.README`/`xreadme` matching `ROOT_STARTER_FILE` (usually `unclear` via `isProjectFile` anyway; finding 1 covers root-only/nothing-else); `hasBundleSetup` `catch → false` (fail-closed contract, not silent swallow); detector size (deferred). 

## Review summary

| Tier | Count |
|------|-------|
| must-fix | 1 |
| should-fix | 1 |
| acknowledged | 0 |

**Finding 1 (must-fix):** `ROOT_STARTER_FILE` `ai-framework/scripts/project-state.mts:46` is not `^`-anchored / does not reject `/`; nested `docs/README.md`, `docs/.gitignore`, `docs/README`, `src/licence.txt`, `foo/license.md`, and root `xREADME.md` are wrongly treated as starter-only → `unclear`; `docs/README.md`-only fails shipped `existing` test; named test command exits 1; violates B1-S1 root-only + nothing-else; no deferred exemption. **Finding 2 (should-fix):** `.claude/skills/setup/SKILL.md` (+ `.cursor` mirror) missing required "must not search for or run a script from any other folder"; instruction-consistency gap on Claude `/setup` + folder-in-project; no code effect. Part (b) `hasBundleSetup` + running-source-folder skip is correct against B1-S2 and all its tests pass; SETUP/SKILL consistent wrt re-runs, Claude `/setup`, copy-to-root, pre-existing harness folders, runtime flags, check-before-copy, starter `unclear`, **except** the `docs/README.md` starter bug (finding 1) and finding 2. 

**Verdict:** BLOCK — 1 must-fix (finding 1) requires resolution; named test command currently exits 1. 

## Read-only confirmation

No file created, edited, or deleted inside the repository checkout; no `.env`, `.env.local`, `credentials.json`, `settings.local.json`, secrets read; no subagents; no network. Only shell reads (`ls`, `find`, `wc`, `head`, `grep`, `node -e` regex probe, `node --test` permitted command) and `read`. Sole write: this report at `/private/tmp/claude-501/-Users-bryanrestrepo-Documents-ai-workflow-portable/c7543d51-0d0f-41f0-b1e4-3dfebbc3a39e/scratchpad/b1-audit/reports/code.md`.

# Plan: review-bench-hardening

**Pitch**: pitch.md  •  **Appetite**: small-batch (4 files)  •  **Hill**: hill.md

## Spike results (2026-11-25, git 2.54.0, temporary repositories with harmless marker programs)

Commands used by the bench: `rev-parse HEAD`, `status`, `diff --name-only`, `ls-files --others`.

| Route from the inspected repository | Plain | With `core.fsmonitor=false`, no hooks, no optional locks | What stops it |
|---|---|---|---|
| `core.fsmonitor` | runs (status, diff, ls-files) | stopped | the flag |
| `post-index-change` hook (**not in the pitch**) | runs on status | stopped | empty hooks path |
| clean or process filter in repo config | runs (status, diff) | **still runs** | refuse |
| same filter via `include.path` or worktree config | runs | **still runs** | refuse |
| a submodule's own filter and monitor (**not in the pitch**) | runs | filter **still runs** | `--ignore-submodules=all` or refuse |

- `git config --local` **misses** filters set through `include.path` or worktree config. `git config --includes --name-only --get-regexp '^filter\.'`
  with system and global config off sees all three, and reading config ran nothing.
- This repository: no filter keys, no submodules; global config has none of the status, filter or safe-directory keys checked (names only);
  `status` output is identical with and without isolation (5 lines).
- Per-section `record-check`, simulated over 135 files with an `independent:` line: 128 pass today, 121 would still pass, **7 would fail**
  (5 lack a prompt hash in the section, 2 stack roles under one heading, 1 lacks its own canary, 1 lacks the cross-file line; one record can
  have more than one). Two of the 7 are the 2026-11-25 records of `00-package-less-ship-verification` and `fix-timing-ratio-flake`. None is edited.
- Not measured: Git LFS, Windows, Git older than 2.54.

## Decisions

- **Refuse, not neutralize.** A repository whose effective repo-level config (system and global off, includes followed) defines
  `filter.*.clean|smudge|process` is refused by `guard` and `count` with a fixed message. A Git LFS setup installed globally is not affected by
  this check; one installed into the repository is refused. With global config off, LFS files may be listed as changed: that makes `count`
  stricter and does not affect a snapshot compared with itself.
- **Submodules are refused too**, by the same two commands (a gitlink in the index). Ignoring them would stop the programs but let a changed
  submodule pass the guard and the cap.
- **Every Git call** gets a fresh environment (`PATH`, `HOME`, `SystemRoot` when set, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`,
  `GIT_OPTIONAL_LOCKS=0`, `GIT_NO_LAZY_FETCH=1`, `GIT_TERMINAL_PROMPT=0`), `-c core.fsmonitor=false`, `-c core.hooksPath=/dev/null`, and
  `--ignore-submodules=all` on status and diff. The refusal checks run before any status, diff or listing.
- **A record section** is the text under one Markdown heading (headings inside code fences do not count; text before the first heading is a
  section). A section with an `independent:` line has exactly one, plus its own read-only, prompt hash, model and cross-file lines, and its own
  `canary: caught` when it says `yes`. The findings table may be anywhere in the file.
- **`SETUP.md` is added to the guard's hashed roots.**
- **Boundary** (decision entry): `guard`, `count`, `canary-check` and `record-check` run nothing from the inspected tree. `prepare` runs the named
  test command on the scratch copy, which is project code, so it is for a trusted checkout only. The guard detects changes afterwards; it does not
  prevent them.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Git without the repository's programs (rows 1, 2 and the two new routes) | `review-bench.mts`, `review-bench.test.mts` | ~120 | — | — | no: same two files as S2, S3 | — |
| S2 | Strict inputs: `--max`, NUL listings, segment containment, snapshot shape (rows 3–6), `SETUP.md` root | same | ~80 | S1 | — | no: same files | — |
| S3 | Evidence checks: exact citation, per-section record (rows 7, 8), docs and decision | same, `3-audit.md`, `.project/knowledge/decisions/review-bench-isolation-boundary.md` (new) | ~150 | S2 | — | no: same files | — |

## Exit criteria per scope (machine-checkable)

`T` = `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/review-bench.test.mts`, and
`bun test ai-framework/scripts/review-bench.test.mts`. Every new guard is removed once and a test must then fail (`testing.md`).

### S1
- `T` exit 0, with real-Git cases and a marker program per route: `core.fsmonitor` and `post-index-change` do not run and the command succeeds;
  clean filter, process filter, filter via include and via worktree config, and a submodule repository are refused by `guard snapshot`,
  `guard check` and `count`, with a fixed message, and no marker exists
- an injected `GIT_CONFIG_COUNT` / `GIT_CONFIG_PARAMETERS` monitor setting in the parent environment does not run
- each marker program is shown to run under plain Git in the same test, so the spy is proven able to fire
- a refused or failing config read refuses the command (never read as "no filters")

### S2
- `T` exit 0: `--max` missing a value, `abc`, `-1`, `1.5`, `Infinity`, `1e9` and an unsafe integer are errors with exit 1; `0` and a normal
  value still gate; without `--max` nothing changes
- a non-ASCII bookkeeping file is excluded and a non-ASCII source file is returned unquoted
- `guard snapshot --file <project>/..inside.json` is refused; `readGuarded` accepts an in-project name starting with `..`
- wrong-shaped, array, null and non-string-valued snapshots give one fixed message
- a change to `SETUP.md` appears in `changed`

### S3
- `T` exit 0: `unrelated-facts.mts:10` does not count for `facts.mts`; the full relative path and an absolute path ending in `/` + it count; the
  bare name counts only when unique among the manifest's files; a 1 MiB-class hostile report stays within the size cap and finishes quickly
- a record whose `yes` section lacks its own canary fails even when another section has one; two `independent:` lines in one section fail; a
  heading inside a code fence does not start a section; a complete one-heading-per-role record passes
- `3-audit.md` states one heading per reviewer role; `grep -c 'review-bench-isolation-boundary' ai-framework/workflow/phases/3-audit.md` ≥ 1
- `node ai-framework/scripts/graphify.mts` then `--check` exit 0
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0
- run once after S3 and report: every existing record that passed before and fails now (read-only; none edited)
- Build, typecheck, lint, i18n: not applicable (`.project/context/stack.md`). No UI or AI-prompt scope.
- Manual: rerun the eight cases in the pitch table in temporary repositories

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Refusing repo-level filters blocks a legitimate setup (Git LFS in the repository) | S1 | partly done; LFS not run | Fixed message names the reason; fail closed. Revisit if an installed project hits it |
| Refusing submodules blocks audits in a project that uses them | S1 | no | Same; none here |
| Another Git route runs a program (lazy fetch in a partial clone, a future setting) | S1 | no | `GIT_NO_LAZY_FETCH=1`; the decision entry states the covered routes, not a general promise |
| `GIT_CONFIG_GLOBAL` needs Git 2.32; `/dev/null` on Windows unverified | S1 | no | State both in the decision entry; Windows not tested |
| Global ignore rules no longer apply, so `count` may include files they hid | S1 | no | Stricter, not looser; document |
| Exact citation rejects a reviewer who cites a partial path or an alias | S3 | no | Prompts ask for full names (seen 2026-11-25) |
| Stricter records: current audit habit would fail | S3 | done | `3-audit.md` states the heading rule; history is not rewritten |
| Test fakes match Git by exact arguments | S1 | no | Update the fake's key helper with the new fixed prefix |
| Consumers of the CLI (`3-audit.md`, workflow doctor script list, runtime migrate list) | all | done by search | Command names and exit codes unchanged; full verifier covers contract tests |

## S4: guard sees a second edit to an already-changed file (added after audit, owner request, 2026-11-26)

Gap (audit cycle 2, reproduced): outside its hashed roots the guard compares only status letters and the index, so editing an already modified
or untracked file again stays `clean`. Files: `review-bench.mts`, `review-bench.test.mts`; the coordinator updates the decision entry.

Exit: both test commands exit 0 with cases for a re-edit of a modified, an untracked and a re-typed file outside the roots; a parent folder
swapped for a symlink is never read through; secret-shaped names are never read; new guards each fail a test when removed;
`pre-ship-verify.mts` exit 0. One fresh narrow review of this change.

## Parallel dispatch plan

S1, S2, S3 in order in the coordinator thread. Nothing dispatched in build: all three edit the same two files.

## Living-spec deviations log

- 2026-11-25 (/plan): two execution routes not in the pitch (`post-index-change` hook, submodule config) join S1.

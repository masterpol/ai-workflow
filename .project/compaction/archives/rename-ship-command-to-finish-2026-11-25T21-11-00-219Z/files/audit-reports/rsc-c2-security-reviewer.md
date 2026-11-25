# Audit cycle 2: narrow security review

- **Model:** Claude Sonnet 5.5 (`claude-sonnet-5-5`).
- **security.md section 9:** walked, together with checklist G.
- **Cross-file interactions:** reviewed for `bundle-sync.mts`, `ownedPaths` in `skill-sync.mts`, the filesystem functions in `runtime/node.mts` and the new tests.

**Result:** no must-fix. All three cycle 1 reproductions that I replayed or covered by an equivalent probe are closed on the default `--apply` path. Two gaps remain against the stated fixes (C2-1 and C2-2).

## Method

I copied `ai-framework/scripts` and `ai-framework/integrations` to `/private/tmp/rsc-audit2-security/code/`. The probes call the copied `main()` on temporary fixtures, with injected filesystem hooks for the races. They are `probe.mts` (harness) and `p1.mts` to `p4.mts`; each ran with `timeout 18` or `20 node pN.mts` from that directory. I did not edit any implementation file. The only repository file I created is this report.

The hashes in `RETIRED_ADAPTER_HASHES` match the sorted unique SHA-256 values from `git log --all` for each of the four paths: 9, 8, 2 and 6 hashes.

## Findings

| ID | Severity | file:line | defect | failure scenario with the command and output | verified |
|---|---|---|---|---|---|
| C2-1 | should-fix | `ai-framework/scripts/bundle-sync.mts:683` (the `!RETIRED_ADAPTER_HASHES[posix(entry.path)]` guard; the same test is in the `updated` expression) | The `--prune` exclusion for retired paths is case-sensitive. A case variant of a retired path skips it and falls back to baseline-only pruning. This contradicts "`--prune` never removes a retired path with unknown content". | `node p2.mts`: the target holds its own content at `.claude/skills/Ship/SKILL.md`, or `.claude/skills/ship/skill.md`, and the receipt hashes that content. `--apply --prune` output: `pruned:[".claude/skills/Ship/SKILL.md"]`, `exists:false`; the `skill.md` variant gives the same result. The exact-case control gives `pruned:[]`, `exists:true`. On this volume both spellings name the file the host loads at the retired path. It needs `--prune` and a baseline that matches the content, as in the forged-receipt case of SEC-3. Fix: compare lower-cased keys in the exclusion, and keep the exact-hash removal as it is. | yes |
| C2-2 | should-fix | `ai-framework/scripts/bundle-sync.mts:119-128` | An in-place edit after the last content read is still deleted. The final check compares only device and inode, which an in-place write keeps. Several awaited calls (`assertNoSymlinkPath`, then `lstat`) sit between the last read and the unlink. The comment places the residual after "that last check", but the content window opens earlier, when the second read ends. Checklist G asks for identity plus size and mtime. | `node p2.mts`: a write is injected during the first or second `lstat` of the file after the third descriptor closes (scan, first read, second read). Both give `{"closes":3,"injected":true,"exists":false}` and `pruned` lists the file. `node p3.mts`, `edit-after-read#3`: `exists:false`. Edits after read 1 or read 2 are kept. The existing test injects after read 2, so it does not cover this window. The window is narrow. Fix: after the awaited guards, compare size, mtime and ctime with the values from the pinned descriptor, or re-read synchronously, with no `await` before `unlinkSync` (as `resetStateReports` does for its final checks). Document what remains. | yes |
| C2-3 | should-fix | `ai-framework/scripts/bundle-sync.mts:580-582` | The next-step message is not always true. It uses `exists()`, which follows links and ignores case on this volume, then says that any copy still present "is yours" and tells the user to delete it. | (a) `p1.mts`, `symlink-parent`: `.claude/skills/ship` links to an outside directory holding the shipped bytes. The file is correctly kept, but the step says to delete it; following that advice deletes the file in the link target, outside the project. `p3.mts` prints the full message. (b) `p1`/`p2`, `case-shipped`: bundle-shipped bytes at `Ship/SKILL.md` or `ship/skill.md` stay (`pruned:[]`). The message names `ship/SKILL.md` and calls the leftover the user's copy, although this bundle shipped that content. A rerun does not change this. Fix: say why the file was kept (changed content, link, or name case), and do not advise deleting through a link. | yes |
| C2-4 | nit | `ai-framework/scripts/bundle-sync.mts:680-681` and `:798` | The dry run does not show which files `--apply` will delete. `retirable` only affects the report-reset decision. A file that will be deleted is listed as `[unverified]`, the same label as one that will be kept. The footer also promises removal by `--apply` when the source has no `ship-pitch` skill, so nothing can be retired. | `p3.mts`, `DRY`: `REMOVED in source (1): .claude/skills/ship/SKILL.md [unverified]`. The next step states only the general rule. `DRY partial` prints "unchanged old ship adapters are removed by --apply alone", although this source removes none. In `--json`, `p1` `control` shows `[unverified]` for a file that is then pruned. | yes |
| C2-5 | nit | `ai-framework/scripts/bundle-sync.mts:690-701`, `:127-128`, `:486` | An exception in the retirement loop aborts before the receipt is written. Files already applied or deleted are not recorded. The next run writes a receipt without the earlier deletion in `pruned`. Cleanup can also throw after a successful unlink, for example when `.DS_Store` is a directory. | `p3.mts`, `eacces-unlink` (`.opencode/commands` set to mode 555): `status:1`, the Claude adapter is already gone, a new rule is applied, `marker:false`. The rerun gives `applied:[]` and `pruned:[".opencode/commands/ship.md"]`, without the Claude path. `dsstore-dir`: `rm returned EISDIR`, with the same lost record. No unintended file was deleted, and the rerun finished. Fix: catch errors per entry, record `pruned` immediately after the unlink, and make cleanup best effort. | yes |

## Attacks that did not break the fixes

| Attack | Observed result |
|---|---|
| Edit after the scan read or after the removal's first read (SEC-1 hash race) | File kept. |
| Replace the adapter's parent with a symlink to a victim directory at each of the 5 parent `lstat` calls in a run (SEC-1 guard race) | Victim never deleted. This covers those injection points only, not every interleaving. |
| Symlinked leaf, with `--apply --prune` | Link and victim kept. |
| Symlinked immediate parent | Outside file kept (see C2-3 for the message). |
| Symlinked `.claude/skills` or `.claude` | Run exits 1 with a refusal; outside file kept. |
| Hardlinked adapter | Only the retired name is removed; the other link survives. |
| Directory at the file path with a user file inside, with `--prune` and no baseline | User file kept. |
| Target reached through a symlink (injected `cwd`) | Nothing retired. |
| File appears just before `rmdirSync` (SEC-2) | File and directory kept. |
| Parent holds only `.DS_Store` | Metadata file and empty directory removed, as the code intends. |
| Parent also holds `Thumbs.db` | File and directory kept. |
| Target has only `.opencode/commands/ship.md` | The emptied `.opencode` directory is removed too; the project root survives. The loop stops before the root. A vendor directory is removed only when it is empty apart from `.DS_Store`. |
| Partial source without `ship-pitch`, with a receipt matching shipped bytes and `--apply --prune` | File kept; receipt keeps its base hash (SEC-3). |
| Exact-case own content with a matching receipt, `--apply --prune` | File kept (SEC-3). |
| Registry-managed skill named `ship`, installed with `add-skill`, then overwritten with bundle-shipped bytes, `--apply --prune` | File kept and not listed as removed. |
| Receipt contents | In the two-adapter fixture, the pruned path is absent from `files` and the kept path with a baseline stays, including after a second run. `pruned` describes only the latest run. |
| Second `--apply` | Exit 0 and nothing more pruned in the control. |
| Windows-style labels | By reading the code only: `posix()` splits on `path.sep`, so lookup works with Windows separators. On macOS a backslash is a normal filename character. |

The selected existing tests, run from the copied scripts with `node --test --test-name-pattern=...` on `bundle-sync.test.mts`, gave 10 passed and 0 failed.

## What did not work

- My first late-edit probe hooked `deps.fs.promises.lstat`, but the code calls `deps.fs.lstat`. It reported `injected:false` and proves nothing. `p2.mts` uses the correct hook.
- The first registry probe failed with `add-skill: No project vendors found`. I added `CLAUDE.md` and `.claude/skills` to the fixture and reran it successfully.
- The `no-.project` fixture in `p1.mts` did not produce a useful check of retirement or cleanup. I draw no conclusion from it.
- Repeated in-process runs printed Node warnings, which I filtered from the output.

## Security summary

| Tier | Count |
|---|---|
| must-fix | 0 |
| should-fix | 3 |
| acknowledged (nit) | 2 |

Checked: section 9 reader, writer and deletion rules for the retirement path; the shipped-hash inventory against Git history; the probes and selected tests above.

Unverified: running on Windows (including registry-owned path matching with backslash separators); Bun; a case-sensitive volume; the full test suite; FIFO and oversize adapter inputs; mutation tests of the guards; every possible race interleaving. I ran no dependency audit; this review covered the retirement change only.

Verdict: INCOMPLETE. No must-fix was found, but the items under Unverified were not checked, and three should-fix findings remain open.

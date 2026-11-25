# Audit: rename-ship-command-to-finish (the command is `ship-pitch`)

Appetite: big-batch, cap 3 cycles (2 used). Mode: Orca, Run `run_89271af6dc37`. Reviewed uncommitted work on the PR #13 branch.

**Reviewers (read-only Orca workers):** cycle 1 security (codex), code (claude), test coverage (codex), cross-pitch (opencode); cycle 2 narrow security (claude).
**Independence:** `independent: no` for every role: the workers read the repository without scratch canaries.
**Incomplete review:** the cycle-1 test-coverage worker reported its own outcome as **failed**: several full Node runs timed out under its per-command limit. Its report and findings are used, but that role is only partly complete; it was not rerun. The cycle-2 security review also marks its own verdict incomplete (Windows, a case-sensitive volume, FIFO and oversize inputs, full suite).
**Cycle 2 fixes were not re-reviewed.** They have regression tests; three were mutant-checked.

## Must-fix (blocks /ship-pitch)

None open. Three were found in cycle 1 and fixed; cycle 2 replayed or probed them and found them closed on the default `--apply` path.

## Findings and dispositions

| ID | Cycle | Source | Issue | Disposition |
|----|-------|--------|-------|-------------|
| SEC-1 | 1 | security | Auto-removal deleted a file edited after it was hashed, or through a parent swapped for a link | **fixed.** Pinned-descriptor read, link guards, identity and bytes re-checked with no await before `unlinkSync`; residual window documented |
| SEC-2 | 1 | security | Parent cleanup was recursive and deleted a file that appeared during it | **fixed.** Non-recursive `rmdir`; only ignored metadata files are removed |
| SEC-3 | 1 | security | A forged or arbitrary baseline, or a partial source, authorized deleting a project's own skill | **fixed.** Only content this bundle shipped (a hash list from git history) is removable, the baseline is not consulted, and the source must contain the renamed skill |
| TC-01 | 1 | test | The guard skipped the top levels of `.claude/`, `.agents/`, `.opencode/` | **fixed.** All six roots are walked; secret-bearing files are never opened; a test covers each root |
| F1 | 1 | code | Instructions treated the command name and the phase name as the same | **fixed.** `AGENTS.md`, `CLAUDE.md`, `orca-vendors.md` |
| F2 | 1 | code | The dry run did not announce the report reset that `--apply` performs | **fixed** with a test |
| F4 | 1 | code | Live `.project/` instruction files still said `/ship` | **fixed** (four files; history untouched) |
| F5, F6, F7 | 1 | code | Stale followup, leftover block and footer, broken box line | **fixed** |
| C2-1 | 2 | security | A differently capitalised retired path could be pruned by baseline | **fixed, not re-reviewed** |
| C2-2 | 2 | security | An in-place edit after the last read was still deleted | **fixed, not re-reviewed** |
| C2-3 | 2 | security | The next step could advise deleting through a link | **fixed, not re-reviewed** |
| C2-4 | 2 | security | The dry run did not list what `--apply` deletes | **fixed, not re-reviewed** |
| C2-5 | 2 | security | One failed removal lost the record of the others | **fixed, not re-reviewed** |

## Acknowledged

- **F3** (next-step wording when the source still has the old files): now shown only when the source has the renamed skill and the path is not registry-owned.
- **F8** (guard limits: `Skill(ship)`, `/Ship`, brace paths): outside the rule in plan.md.
- **Cross-pitch X1, X2** (reported must-fix, reclassified): `pre-ship-verify.mts` and `4-ship.md` are also in the places of `package-less-ship-verification`, a draft with no code yet, so there is no concurrent edit to lose; X3 (its pitch says `/ship`) is a followup. X4–X8 are shared release files on a stacked branch.
- `bundle-sync --prune` still removes **other** retired files by path and baseline (existing behaviour; followup).
- Not verified: Windows, a case-sensitive volume, `ship-pitch` against each host's built-ins, a live `/ship-pitch` run in a fresh session. `/critique` was not run before the bet.

## Evidence (author-run)

- Full suite on a clean clone with every change: **2,353 pass, 10 skip, 0 fail** (2,363 tests).
- Mutants of the new protections that fail a test: content check, second read (before cycle 2), recursive cleanup, rename evidence, dry-run flag, final re-read, case-insensitive prune guard, per-file error handling.
- Doctor READY, setup validator READY, graph CLEAN. The four old `ship` files in LAH are byte-identical to shipped versions, so its next sync removes them.

## Review records
### Security review, cycles 1 and 2
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check; the only changes found were the coordinator's fixes made after the reports returned (reviewers wrote only to `audit-out/`, outside the guarded roots)
prompt-sha256: cf35cbad6def53cfe9b82198f52409d785c4c59461ae693e203191c6d379ca1d (c1), 4a7539ca8072da6031f36e205e1ef9760dcea2a2aa8125e44eeb77fe69c6d139 (c2)
model: codex (c1), claude (c2), Orca worker vendor defaults
cross-file interactions: reviewed (bundle-sync, skill registry ownership, runtime filesystem functions, hooks and the shared mapping)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | must-fix | bundle-sync.mts:615 | hash-to-remove and link races | reproduced by the reviewer; fixed |
| 2 | must-fix | bundle-sync.mts:413 | recursive parent cleanup | reproduced; fixed |
| 3 | must-fix | bundle-sync.mts:613 | ownership taken from the baseline | reproduced; fixed |
| 4 | should-fix | bundle-sync.mts | case variant, late in-place edit, message through links | reproduced by the reviewer; fixed after the last review |
| 5 | nit | bundle-sync.mts | dry-run list, record lost on error | confirmed; fixed after the last review |

### Code review, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check
prompt-sha256: 31f7ff0a30ddd160587c3e64e27f95a9b51912d4eee17d952f8bc7c752e4fc19
model: claude, Orca worker vendor default
cross-file interactions: reviewed

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | should-fix | orca-vendors.md, AGENTS.md, bundle-sync.mts:658, .project live files | F1, F2, F4 | F2 reproduced by the reviewer; fixed |
| 2 | nit | several | F3, F5 to F8 | fixed or acknowledged |

### Test coverage, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check; mutants ran in copies
prompt-sha256: 6941d73b52c04d67d79f141ee31cfb0d78842964a0718f1c4c082f4394e6f0f7
model: codex, Orca worker vendor default
cross-file interactions: reviewed (exit criteria mapped to tests)

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | must-fix | command-name-guard.test.mts:20 | guard roots too narrow | reproduced by the reviewer with 12 surviving probes; fixed |
| 2 | — | — | 18 of 18 source mutants caught; some full Node runs timed out and are unverified by this reviewer | the clone suite covers them under Bun |

### Cross-pitch, cycle 1
independent: no
canary: none
read-only: verified by review-bench guard snapshot/check
prompt-sha256: aa174aead6a3944e17ba5218b96bb841ccfc9a77f617d6656cc957e53f0d45c4
model: opencode, Orca worker vendor default
cross-file interactions: reviewed

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | must-fix (reclassified: acknowledged) | pre-ship-verify.mts, 4-ship.md | overlap with an undeveloped draft pitch | confirmed with the draft's pitch text |
| 2 | should-fix | package-less-ship-verification/pitch.md | stale command text | confirmed; followup |

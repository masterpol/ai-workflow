# Cross-pitch conflict check: orca-balanced-role-pools (audit cycle 1)

Role: cross-pitch-conflict-checker (read-only). Branch `feat/orca-balanced-role-pools`, HEAD `4a46383`.
Rule: `ai-framework/workflow/phases/3-audit.md` "Cross-pitch conflict check" (pure overlap = must-fix, adjacent = should-fix, disjoint = clean).

## Classification against the other active pitches

| Other active pitch (status.md) | Planned/in-progress files (from its pitch.md, consulted-for evidence) | Overlap with this pitch's changed files | Class |
|---|---|---|---|
| workflow-v3-rollout | bundle-sync, config-migrate, consolidation-migrate, `.project/rules/`, relations.toon, versioning docs; no orca-*.mts, orca-vendors.md or 2-build.md (`grep -iE 'orca-(run\|dispatch\|assign\|ledger)\|orca-vendors'` over its 3 files: 0 hits; only "Orca preflight" / "Orca 1.4.224+ prerequisite" prose) | none by file. Shared version surface only (VERSION/CHANGELOG/status.md, which every pitch ships through) | Disjoint (VERSION/CHANGELOG/status.md are shared-by-convention serial files, see F1) |
| package-less-ship-verification | `pre-ship-verify.mts`, `.project/context/stack.md`, `4-ship.md` | none (`4-ship.md` is not `2-build.md`) | Disjoint |
| review-bench-hardening | `review-bench.mts`, `review-bench.test.mts` | none | Disjoint |

Evidence: `git diff --stat HEAD` lists 18 files, none matching the file sets above. Ownership: the three other pitches are in phase `shape`, with no plan.md and no in-progress edits (`git status` shows only `.project/pitches/orca-balanced-role-pools/` untracked under pitches).

## Findings

| Severity | file:line | Rule / check violated | Concrete failure scenario (command and output) | Suggested fix |
|---|---|---|---|---|
| should-fix | VERSION, CHANGELOG.md, .project/status.md (branch-level, not a line) | Shipped-but-uncommitted state must not be mixed in; branch carries another pitch's commit | The brief says state-project-depth is "committed as 4a46383 on another branch". It is also on THIS branch: `git log --oneline main..HEAD` prints only `4a46383 feat(state): /state project depth ...`, and `git branch -a --contains 4a46383` prints `* feat/orca-balanced-role-pools`, `feat/state-project-depth`, `remotes/origin/feat/state-project-depth`. `git merge-base --is-ancestor 4a46383 main` prints `notinmain`. So `git diff main` (54 files, 4298 insertions) is polluted by 4 non-pitch groups (facts-gather, bundle-sync, state-report, workflow-doctor, plus status/CHANGELOG 2.53.0). A PR of this branch to main ships state-project-depth with it, and reviewers using `git diff main` see 54 files, not 18. | Review/audit against `HEAD` (`git diff HEAD`, 18 files), not `main`. Before PR, either merge the state-project-depth PR first and rebase this branch onto main, or state in the PR body that 2.53.0 rides along. |
| nit | VERSION:1, CHANGELOG.md:6 | Version ordering | 2.54.0 is stacked on 2.53.0, which is unmerged to main (main VERSION is 2.52.x: `git log main` top is d9f635d, release 2.52.1). If the state-project-depth PR is rebased or squashed, the 2.54.0 entry's neighbour changes; if this lands first, 2.53.0 would be out of order. | Merge in order: state-project-depth (2.53.0), then this (2.54.0). |

Separation check (uncommitted diff vs HEAD contains only this pitch): `git diff --stat HEAD` touches `.project/evals/datasets/orca-vendor-orchestration.json`, `.project/status.md` (+1 row), `CHANGELOG.md` (+10, 2.54.0 only), `VERSION`, orca-vendors.md, 7 orca-*.mts/test files, 2-build.md, graphify-out. Nothing from facts-gather, bundle-sync, state-report or workflow-doctor. The orca-* files have identical stat vs `main` and vs `HEAD` (e.g. orca-dispatch.mts 99 lines both), so 4a46383 did not touch any orca file in scope. Mixed-in state: none in the working tree.

Counts: must-fix 0, should-fix 1, nit 1.

## Checked, nothing found

- No other active pitch plans or edits orca-assign/dispatch/ledger/run/eval-grader, orca-vendors.md or 2-build.md (grep of all three pitch folders).
- No other pitch has a plan.md or in-progress file edits, so no pure overlap is possible.
- Uncommitted diff does not include state-project-depth files; the golden dataset `orca-vendor-orchestration.json` is referenced only by this pitch's plan.md (`grep -rl` over pitches).
- 4a46383 does not modify any file in this pitch's scope.

## Unverified

- Whether the state-project-depth PR is intended to merge before this one (owner decision).
- Other branches/worktrees (`git branch -a` only checked for 4a46383 containment); I did not inspect other local branches for in-flight edits to the scope files.
- I did not run tests or review code correctness (out of role).

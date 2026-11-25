# Cross-pitch conflict check — rename-ship-command-to-finish (audit cycle 1)

**Model:** OpenCode worker default (`kimi-k2.7-code`).  
**Checklist walked:** Yes — read the other three active pitches, their supporting files, the branch commits on `HEAD`, and the current uncommitted diff; computed file-set intersections.  
**Cross-file interactions reviewed:** Yes — inspected the actual diff hunks for the overlapping files and the text in the other pitches that points at the old `/ship` command.

## Scope

Current pitch: `rename-ship-command-to-finish` (command is now `/ship-pitch`; phase id stays `ship`).  
Other active pitches (from `.project/status.md`): `workflow-v3-rollout`, `package-less-ship-verification`, `review-bench-hardening`.  
Branch commits already on `HEAD` (origin/main..HEAD): `orca-balanced-role-pools` (v2.54.0) and `state-project-sources` (v2.55.0).

Commands used (all read-only):

```sh
git status --short
git diff HEAD --name-status
git diff origin/main..HEAD --name-status
git diff HEAD -- ai-framework/hooks/scripts/pre-ship-verify.mts ai-framework/workflow/phases/4-ship.md .project/pitches/_followups.md .project/status.md CHANGELOG.md VERSION graphify-out/graph.json graphify-out/GRAPH_REPORT.md
git diff origin/main..HEAD -- .project/pitches/_followups.md .project/status.md CHANGELOG.md VERSION graphify-out/graph.json graphify-out/GRAPH_REPORT.md
grep -nE '/ship|/ship-pitch|pre-ship-verify' ai-framework/hooks/scripts/pre-ship-verify.mts ai-framework/workflow/phases/4-ship.md .project/pitches/package-less-ship-verification/pitch.md .project/pitches/workflow-v3-rollout/consolidation-carry.md .project/pitches/_followups.md
```

What did not work:

- The three other active pitches have no `plan.md`; only `pitch.md` (and for `workflow-v3-rollout`, `consolidation-carry.md` and `readiness.md`). This means there is no scoped file list to intersect, so file-level overlap can only be asserted where the pitch text itself names concrete files.
- A single `grep` call with multiple space-separated paths failed; I retried with a shell `grep -nE` over the files.

## Findings

| ID | Severity | file:line | defect | failure scenario with command and output | verified |
|---|---|---|---|---|---|
| X1 | must-fix | `ai-framework/hooks/scripts/pre-ship-verify.mts:8` (current diff) vs `.project/pitches/package-less-ship-verification/pitch.md:22` | Pure overlap: both pitches edit `pre-ship-verify.mts`. | `grep -nE '/ship-pitch|pre-ship-verify' ai-framework/hooks/scripts/pre-ship-verify.mts` returned line 8 changed to `invoked by /ship-pitch`. The other pitch lists `pre-ship-verify.mts` in its **Places** and plans to add a package-less route in the same file. Whoever ships second will conflict on the comment/imports near the top and possibly on the verifier routing logic. | yes |
| X2 | must-fix | `ai-framework/workflow/phases/4-ship.md:10,22,125` (current diff) vs `.project/pitches/package-less-ship-verification/pitch.md:22` | Pure overlap: both pitches edit `4-ship.md`. | `grep -nE '/ship-pitch|/ship' ai-framework/workflow/phases/4-ship.md` returned the trigger, abort path and confirmation gate all changed to `/ship-pitch`. The other pitch lists `4-ship.md step 1` in its **Places** and plans to document the verifier contract there. The second ship will hit the same lines. | yes |
| X3 | should-fix | `.project/pitches/package-less-ship-verification/pitch.md:4,9,11,29` | Rename stale text: the pitch still tells the reader to run `/ship`. | `grep -nE '/ship' .project/pitches/package-less-ship-verification/pitch.md` returned `/ship` at lines 4, 9, 11, 29. A future owner reading this pitch will type `/ship` and get Claude Code's built-in instead of the workflow's close-out. The phase/doc names (`/ship` phase doc) can stay, but command invocations must become `/ship-pitch`. | yes |
| X4 | should-fix (attribution: shared-diff) | `.project/status.md:11` (current diff) vs branch commits on `HEAD` | Pure overlap on a shared uncommitted/committed record. | `git diff HEAD -- .project/status.md` adds the `rename-ship-command-to-finish` row at line 11. `git diff origin/main..HEAD -- .project/status.md` shows the same file was edited by the two shipped pitches. The current change must be merged on top; no content conflict, but it is not a file this pitch owns exclusively. | yes |
| X5 | should-fix (attribution: shared-diff) | `.project/pitches/_followups.md:649-654` (current diff) vs branch commits on `HEAD` | Pure overlap on a shared backlog file. | `git diff HEAD -- .project/pitches/_followups.md` appends a new "From rename-ship-command-to-finish" section. `git diff origin/main..HEAD -- .project/pitches/_followups.md` shows `orca-balanced-role-pools` and `state-project-sources` already appended sections in the same file. | yes |
| X6 | should-fix (attribution: shared-diff) | `CHANGELOG.md:6-15` (current diff) vs branch commits on `HEAD` | Pure overlap on release notes. | `git diff HEAD -- CHANGELOG.md` adds the 2.56.0 entry at the top. `git diff origin/main..HEAD -- CHANGELOG.md` added the 2.55.0 entry in the same file. | yes |
| X7 | should-fix (attribution: shared-diff) | `VERSION:1` (current diff) vs branch commits on `HEAD` | Pure overlap on the version token. | `git diff HEAD -- VERSION` changes 2.55.0 → 2.56.0. `git diff origin/main..HEAD -- VERSION` changed 2.54.0 → 2.55.0. | yes |
| X8 | nit (attribution: shared-diff) | `graphify-out/graph.json:1` and `graphify-out/GRAPH_REPORT.md:1` (current diff) vs branch commits on `HEAD` | Pure overlap on generated graph artefacts. | Both `git diff HEAD --stat` and `git diff origin/main..HEAD --stat` list these files. They are regenerated by `graphify.mts` and will be overwritten again at the next graph build; content is non-conflicting. | yes |

## Pitch-by-pitch overlap summary

### package-less-ship-verification

- **Overlap class:** pure overlap on `ai-framework/hooks/scripts/pre-ship-verify.mts` and `ai-framework/workflow/phases/4-ship.md`.
- **Merge-order recommendation:** ship `rename-ship-command-to-finish` first. `package-less-ship-verification` must then rebase and re-verify its changes against the renamed command text in both files.
- **What this pitch needs to know about the rename:**
  - Its pitch text still says the user invokes `/ship` (lines 4, 9, 11, 29). The command is now `/ship-pitch`; only the phase id stays `ship`.
  - The followup entries it inherits in `.project/pitches/_followups.md` (lines 482, 492, 556) also say `/ship` was blocked. Those are historical backlog text, but if they are edited they should be updated to `/ship-pitch` for command references.
  - The verifier file it plans to change now contains a comment referencing `/ship-pitch`; any logic change must preserve that wording.

### workflow-v3-rollout

- **Overlap class:** disjoint at the file level. The current diff does not touch any file named in `workflow-v3-rollout/pitch.md`, `consolidation-carry.md`, or `readiness.md`.
- **Adjacent/shared-module note:** `workflow-v3-rollout` depends on `bundle-sync`, `consolidation-migrate.mts`, `graphify.mts`, and `relations.toon`, all of which the current pitch edits. Those are "same module, different file" adjacencies, but because `workflow-v3-rollout` does not plan to edit those files in this repo, no merge-order issue follows from this check.
- **What this pitch needs to know about the rename:**
  - `consolidation-carry.md:16` refers to "`/ship` Consolidate step". When referring to the command a person types, that should read "`/ship-pitch` Consolidate step"; the phase name remains `ship`.
  - The current pitch added a followup in `.project/pitches/_followups.md` stating that installed projects keep their old `ship` skill until `bundle-sync --prune` or manual delete, and that `workflow-v3-rollout` should include it. This is an explicit dependency the rollout owner should account for.

### review-bench-hardening

- **Overlap class:** disjoint.
- **What this pitch needs to know about the rename:** nothing in its `pitch.md` references `/ship` or the ship command. Its scope (`review-bench.mts` and `review-bench.test.mts`) is untouched by the current diff.

### Commits already on this branch (origin/main..HEAD)

- **Overlap class:** pure overlap on the bookkeeping/shared files `.project/status.md`, `.project/pitches/_followups.md`, `CHANGELOG.md`, `VERSION`, `graphify-out/graph.json`, and `graphify-out/GRAPH_REPORT.md`.
- **Merge-order recommendation:** the branch commits are already committed; the current uncommitted changes must be applied on top. No source-code merge conflict is expected because the edits are in different sections (new status row, new followup section, new changelog/version entry, regenerated graph), but these files should be re-verified before `/ship-pitch`.
- **Attribution note:** these are shared-diff overlaps, not pitch-owned file overlaps.

## Conclusion

- One must-fix cross-pitch contention: `package-less-ship-verification` overlaps the current diff on `pre-ship-verify.mts` and `4-ship.md`.
- One should-fix rename-awareness item: `package-less-ship-verification/pitch.md` still points the reader at the old `/ship` command.
- All other active pitches are disjoint at the file level; `workflow-v3-rollout` has one stale command reference in `consolidation-carry.md` that should be updated when that pitch is next edited.
- The branch commits already on `HEAD` overlap only on shared bookkeeping/generated artefacts; merge order is already fixed by the commit history.

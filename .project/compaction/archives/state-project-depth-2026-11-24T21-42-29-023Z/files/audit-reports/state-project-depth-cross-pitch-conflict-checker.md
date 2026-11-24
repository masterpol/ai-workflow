# Cross-pitch conflict check — state-project-depth (audit cycle 1, read-only)

Active pitches (`.project/status.md`): workflow-v3-rollout, package-less-ship-verification, review-bench-hardening (+ this pitch).
Diff scope: `git diff main --stat` — 16 tracked files + new `facts-project.mts` / `.test.mts`.

## Classification

| Other pitch | Planned/owned files (evidence) | Verdict |
|---|---|---|
| workflow-v3-rollout | Per-project sync runs of `bundle-sync`/`config-migrate`; "No application code changes". `pitch.md` names no script edits; `consolidation-carry.md` / `readiness.md` mention `bundle-sync`, `graphify.mts`, `relations.toon`, `.claude/settings.json` as things to *run* or already-shipped P1/P2d artifacts. | **Adjacent** (consumer of bundle-sync behavior; does not edit it). |
| package-less-ship-verification | Only `ai-framework/hooks/scripts/pre-ship-verify.mts`, `/ship` phase doc, tests (`pitch.md` Stack + Problem). | **Disjoint** |
| review-bench-hardening | Review-bench isolation/snapshot code; `grep` for bundle-sync/facts-gather/state in its pitch.md: no hits. | **Disjoint** |

No pure overlap (no file in this diff is planned/owned by another active pitch). All three others are draft/shaped-only: no plan.md, no in-flight diffs (`ls .project/pitches/<slug>`: only pitch.md / readiness / carry).

## Findings

| severity | file:line | rule or check violated | concrete failure scenario (command → output) | suggested fix |
|---|---|---|---|---|
| should-fix | `ai-framework/scripts/bundle-sync.mts` (reset added near @@ -265,6 +268,110; `git diff main -- ai-framework/scripts/bundle-sync.mts`) vs `.project/pitches/workflow-v3-rollout/pitch.md` (Affordances: "bundle-sync dry-run → review → apply", "no silent override") | Adjacent-pitch behavior drift: 3-audit "Cross-pitch conflict check" (shared behavior dependency) | workflow-v3-rollout will run `--apply` on LAH/RN/climbing; this pitch makes `--apply` delete the `/state` report receipt and matching `state.html`/draft (`git diff main --stat` shows +114/-6 in bundle-sync). A rollout run would therefore change `reports/` output in three projects. Not measured end-to-end (see Unverified). Rollout's readiness doc doesn't list reports in its verify gauntlet. | Add a line to workflow-v3-rollout (or its readiness checklist) that `--apply` now resets the /state receipt, so the owner expects "re-run /state" in NEXT STEPS. Doc-only; no code change. |

Counts: must-fix 0, should-fix 1 (adjacent/doc), nit 0. Known items (reset on every `--apply`, readdirSync budget, Prisma/SQL) not reported.

## Checked, nothing found

- Diff file set vs `git ls-files`-style path mentions in all three other pitch dirs (grep of `ai-framework|.claude|.cursor` paths): only `pre-ship-verify.mts`, `versioning-and-sync.md`, `relations.toon`, `.claude/settings.json`, `graphify.mts`, none in this diff.
- `.project/status.md`, `CHANGELOG.md`, `VERSION` (2.52.1 → 2.53.0), `graphify-out/*`: shared index/release files, edited only by this pitch now; others have no pending edits (no plan.md). Normal release-file merge risk only if another pitch ships first.
- `workflow-doctor.mts`: single line appending two facts-project paths to the scripts list; no other pitch touches doctor.
- Unmerged local branches (`feat/unified-toon-config`, `use-orca-multiagent`, `feat/archify-replaces-state`, etc.) touch the same files, but they are not active pitches; `git merge-tree` shows conflicts (72/187/11) on divergent, pre-squash histories and are not meaningful evidence of contention with this diff.
- `.claude/skills/{state,bundle-sync}` vs `.cursor/skills/...` mirrors both changed in this diff; no other pitch plans adapter edits.

## Unverified

- Real-world effect of the bundle-sync reset on a workflow-v3-rollout run (no sandbox project run; read-only constraint).
- Whether stale local branches still intend to merge; they carry stale state (a stash on feat/unified-toon-config references unrelated WIP).
- Whether `git diff main` for graphify-out is regenerable noise only (not inspected line by line).

# Drift ledger: upstream-project-drift (S0)

**Generated**: 2026-10-16 from base `feat/upstream-project-drift` (HEAD `300fa80` + uncommitted `graphify.mts`
edit) against LAH `bfb81b6`, RN `48a721d`, climbing-lab-monorepo `02a2f91` (all three working trees clean).

## Method

- Compared every file under `ai-framework/` in base and in each project, both directions (178 differing or
  one-sided files: climbing 76, RN 87, LAH 15).
- **3-way** uses the per-file sync-base digest in each project's `.project/.bundle-sync.json`:
  `project-edit` = base unchanged since sync, project edited; `both-changed` = both moved; `base-newer` = project
  still holds the synced content, base moved; `project-only` = file absent from base.
- RN rows were re-compared after normalising runner text (`node --experimental-strip-types …` → `bun`,
  `#!/usr/bin/env node` → `bun`, `node ai-framework/…` → `bun ai-framework/…`). Files equal after normalising are
  `project-local (runner)`.
- **Read scope (U2, U6)**: only `ai-framework/` and `.project/.bundle-sync.json` were read. No `.env`,
  `settings.local.json` or other secret-shaped file was opened. Symlinks were skipped (none exist in the three
  trees: `find …/ai-framework -type l` empty). Nothing in the three projects was written.
- **Markers (U3)**: all three markers were written by the 2.22.5 `bundle-sync` (post marker-fix) on 2026-10-09:

| Project | sourceVersion | lastSyncedAt | files with base | keptLocal | conflicts at that sync |
|---|---|---|---|---|---|
| climbing | 2.22.5 | 2026-10-09T16:51:33Z | 362 | 45 | 115 |
| RN | 2.22.5 | 2026-10-09T19:06:10Z | 460 | 8 | 146 |
| LAH | 2.22.5 | 2026-10-09T19:01:23Z | 356 | 0 | 3 |

  climbing and RN already carried 115/146 unresolved conflicts at their last sync, so their marker bases for those
  files are older than 2.22.5. The "expected post-sync" column accounts for that.

## Expected post-sync vocabulary

How the **new** base `bundle-sync` (2.23.0) will classify the row against the project's current marker:
- `identical` — base ends byte-equal to the project file; no row in the sync report.
- `changed` — project still has its synced content; base update applies cleanly.
- `local` — base unchanged for this file; project edit kept.
- `conflict` — both differ from the marker; manual merge in `workflow-v3-rollout`.
- `untouched` — file not in the base manifest; sync ignores it.

## Summary

| Classification | Rows | Where it goes |
|---|---|---|
| upstream / upstream (hunk) | 72 | S1-S8 of this pitch |
| superseded-by-S3 | 18 | LAH/RN floor 1.4.224: base adopts it in S3; projects take base in rollout |
| project-local (runner) | 47 | RN `bun` rewrite. Portable fix: runner-aware text/hooks in `unified-toon-config` |
| project-local (relocate) | 16 | RN rule rewrites → `.project/rules/` in `workflow-v3-rollout` (recipe below) |
| project-local | 15 | climbing docs banners, model routing, rule companion links, root README/SETUP |
| followup | 5 | RN pitch numbering (`next-pitch.mts`) |
| drop | 3 | base already newer |
| superseded-by-orca-role-pools | 1 | LAH `orca-vendors.json` (X12) |
| superseded-by-unified-toon-config | 1 | RN `orca-vendors.md` single-policy-file wording |

## RN rule relocation recipe (for `workflow-v3-rollout`, S4)

For each RN `rules/*.md` row:
1. Copy RN's file to `.project/rules/<name>.md` (or merge into an existing companion of the same topic).
2. Restore the base copy at `ai-framework/rules/<name>.md` (`bundle-sync --apply` after the marker records it as
   `local` → take upstream for that path only).
3. RN-only rule files (`react-native.md`, `mobile-performance-review.md`, `styling.md`, `README.md`) move to
   `.project/rules/` and are removed from `ai-framework/rules/`; `--prune` will not touch them (not in base).
4. Update `AGENTS.md` and any rules index that linked the old paths; run `docs-links.mts` and
   `setup-validator.mts`.
The same recipe applies to climbing's project-local rule rows (companion links move into the
`.project/rules/` companions they already point to).

## Follow-ups recorded by this ledger

- RN pitch numbering (`next-pitch.mts`, overview/0-shape/pitch template) — candidate pitch.
- Runner-aware usage strings, shebang guidance and hook commands — `unified-toon-config`.
- Climbing must upgrade Orca to ≥1.4.224 before syncing 2.23.0.

## Ledger

| Project | File | 3-way | Classification | Scope | Expected post-sync | Reason |
|---|---|---|---|---|---|---|
| climbing | `README.md` | project-only | project-local | — | untouched | climbing copy of bundle root docs; not in base manifest |
| climbing | `SETUP.md` | project-only | project-local | — | untouched | climbing copy of bundle root docs; not in base manifest |
| climbing | `docs/design-notes.md` | project-edit | project-local | — | local | climbing adaptation banner + project model-routing links |
| climbing | `docs/extending.md` | project-edit | project-local | — | local | climbing adaptation banner + project model-routing links |
| climbing | `docs/setup.md` | project-edit | project-local | — | local | climbing adaptation banner + project model-routing links |
| climbing | `docs/vendors.md` | project-edit | project-local | — | local | climbing adaptation banner + project model-routing links |
| climbing | `docs/workflow-doctor.md` | project-edit | project-local | — | local | climbing adaptation banner + project model-routing links |
| climbing | `hooks/scripts/metrics-lock.test.mts` | project-edit | upstream | S6 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `hooks/scripts/orca-start-hook.test.mts` | project-edit | upstream | S3 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `hooks/scripts/pre-ship-verify.mts` | project-edit | upstream | S6 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `hooks/scripts/pre-ship-verify.test.mts` | project-edit | upstream | S6 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `hooks/scripts/stuck-uphill-detector.test.mts` | project-edit | upstream | S6 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `hooks/scripts/token-consumption.test.mts` | project-edit | upstream | S6 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `integrations/harnesses.md` | both-changed | project-local | — | conflict | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `integrations/orca-vendors.md` | project-edit | upstream (hunk) | S3 | conflict | floor + ownership text; policy-file text superseded-by-unified-toon-config |
| climbing | `rules/boundaries.md` | project-edit | project-local | — | local | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `rules/coding-standards.md` | both-changed | upstream (hunk) | S1 | conflict | port 406ecc5 hunk only; project companion link stays local |
| climbing | `rules/component-architecture.md` | project-edit | project-local | — | local | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `rules/context-management.md` | both-changed | project-local | — | conflict | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `rules/data-modeling.md` | project-edit | project-local | — | local | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `rules/model-routing.md` | both-changed | project-local | — | conflict | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `rules/security.md` | both-changed | project-local | — | conflict | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `rules/ui-ux-review.md` | project-edit | project-local | — | local | project model routing / companion links / project rewrite; relocate deltas to .project/rules in rollout |
| climbing | `scripts/graphify.mts` | both-changed | upstream | S1 | conflict | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/graphify.test.mts` | both-changed | upstream | S1 | conflict | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-apply.mts` | project-edit | upstream | S5 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-apply.test.mts` | project-edit | upstream | S5 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-diff-admit.mts` | project-edit | upstream | S5 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-diff-admit.test.mts` | project-edit | upstream | S5 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-dispatch.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-dispatch.test.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-eval-grader.mts` | project-edit | upstream | S5 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-eval-grader.test.mts` | project-edit | upstream | S5 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-evidence.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-evidence.test.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-launch-gate.mts` | project-edit | upstream | S3 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-launch-gate.test.mts` | project-edit | upstream | S3 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-ledger.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-ledger.test.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-preflight.mts` | project-edit | upstream | S3 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-preflight.test.mts` | project-edit | upstream | S3 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-reconcile.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-reconcile.test.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-run.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-run.test.mts` | project-edit | upstream | S4 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-start.mts` | project-edit | upstream | S3 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/orca-start.test.mts` | project-edit | upstream | S3 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/pitch-archive.test.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/pitch-compress.test.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/bun.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/invariants.test.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/node.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/runtime.test.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/test-helpers.test.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/types.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/upgrade.test.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/runtime/validate.test.mts` | project-edit | upstream | S2 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/setup-validator.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/setup-validator.test.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/skill-defaults.test.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/skill-sync.test.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/skill-vendors.test.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `scripts/workflow-doctor.test.mts` | project-edit | upstream | S7 | identical | climbing fix (029ba9c..c376bda) |
| climbing | `templates/project/design/plans/rollback-template.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `templates/project/design/plans/template.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `templates/project/design/template.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `templates/project/design/wireframes/template.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `templates/project/pitches/_templates/plan.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `templates/project/requirements/features/template.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `templates/project/runs/README.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `workflow/overview.md` | both-changed | upstream (hunk) | S8 | conflict | generic phase/template fixes; drop project-specific hunks |
| climbing | `workflow/phases/0-shape.md` | both-changed | upstream (hunk) | S8 | conflict | generic phase/template fixes; drop project-specific hunks |
| climbing | `workflow/phases/1-plan.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `workflow/phases/2-build.md` | project-edit | upstream (hunk) | S8 | identical | generic phase/template fixes; drop project-specific hunks |
| climbing | `workflow/phases/3-audit.md` | both-changed | upstream (hunk) | S8 | conflict | generic phase/template fixes; drop project-specific hunks |
| climbing | `workflow/phases/4-ship.md` | both-changed | upstream (hunk) | S8 | conflict | generic phase/template fixes; drop project-specific hunks |
| LAH | `hooks/scripts/opencode-plugin.test.mts` | base-newer | drop | — | changed | base already newer (300fa80 / dirty graphify); sync applies it cleanly |
| LAH | `hooks/scripts/orca-start-codex-hook.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `hooks/scripts/orca-start-hook.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `integrations/orca-vendors.json` | project-only | superseded-by-orca-role-pools | — | untouched | 3 workers + `worker` role + cap 4; invalid under current policy, unread by scripts; intent moves to pitch 4 |
| LAH | `integrations/orca-vendors.md` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `rules/testing.md` | both-changed | upstream | S1 | conflict | generic 'verification discipline' section; 3-way with base |
| LAH | `scripts/graphify.test.mts` | base-newer | drop | — | changed | base already newer (300fa80 / dirty graphify); sync applies it cleanly |
| LAH | `scripts/orca-dispatch.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `scripts/orca-launch-gate.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `scripts/orca-launch-gate.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `scripts/orca-preflight.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `scripts/orca-preflight.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `scripts/orca-run.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `scripts/orca-start.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| LAH | `scripts/orca-start.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 + loose grammar; base adopts floor with climbing strict grammar |
| RN | `docs/design-notes.md` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/extending.md` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/knowledge-graph.md` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/setup-validator.md` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/setup.md` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/token-consumption.md` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/versioning-and-sync.md` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/what-you-get.md` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `docs/workflow-doctor.md` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `hooks/hooks.json` | both-changed | upstream (hunk) | S6 | conflict | stuck-uphill $CLAUDE_PROJECT_DIR path fix ported; bun commands stay local |
| RN | `hooks/scripts/opencode-plugin.test.mts` | base-newer | drop | — | changed | base already newer (300fa80 / dirty graphify); sync applies it cleanly |
| RN | `hooks/scripts/orca-start-codex-hook.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `hooks/scripts/orca-start-codex-hook.test.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `hooks/scripts/orca-start-hook.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `hooks/scripts/orca-start-hook.test.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `hooks/scripts/pre-ship-verify.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `hooks/scripts/pre-ship-verify.test.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `hooks/scripts/stuck-uphill-detector.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `hooks/scripts/stuck-uphill-detector.test.mts` | project-edit | upstream (hunk) | S6 | conflict | RN hardening ported; RN runner lines stay local |
| RN | `integrations/harnesses.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `integrations/orca-vendors.md` | project-edit | superseded-by-unified-toon-config | — | conflict | single-policy-file wording + floor; config text moves to TOON pitch |
| RN | `integrations/skill-defaults.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `integrations/skills.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `integrations/state-report.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `integrations/workflow-metrics.md` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `rules/README.md` | project-only | project-local (relocate) | — | untouched | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/boundaries.md` | project-edit | project-local (relocate) | — | local | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/ci-deployment.md` | project-edit | project-local (relocate) | — | local | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/coding-standards.md` | both-changed | project-local (relocate) | — | conflict | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/context-management.md` | both-changed | project-local (relocate) | — | conflict | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/data-modeling.md` | project-edit | project-local (relocate) | — | local | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/i18n.md` | project-edit | project-local (relocate) | — | local | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/mobile-performance-review.md` | project-only | project-local (relocate) | — | untouched | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/model-routing.md` | both-changed | project-local (relocate) | — | conflict | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/observability.md` | project-edit | project-local (relocate) | — | local | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/performance.md` | project-edit | project-local (relocate) | — | local | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/react-native.md` | project-only | project-local (relocate) | — | untouched | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/security.md` | both-changed | project-local (relocate) | — | conflict | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/styling.md` | project-only | project-local (relocate) | — | untouched | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/testing.md` | both-changed | project-local (relocate) | — | conflict | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `rules/ui-ux-review.md` | project-edit | project-local (relocate) | — | local | RN rewrite; recipe: restore base copy, move delta to .project/rules/, fix index (workflow-v3-rollout) |
| RN | `scripts/add-skill.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/add-skill.test.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/browser-runtime.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/browser-runtime.test.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/bundle-sync.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/changelog.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/docs-links.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/graphify.mts` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/next-pitch.mts` | project-only | followup | — | untouched | RN pitch-numbering feature (next-pitch.mts); separate pitch |
| RN | `scripts/next-pitch.test.mts` | project-only | followup | — | untouched | RN pitch-numbering feature (next-pitch.mts); separate pitch |
| RN | `scripts/orca-dispatch.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 literal; base adopts it in S3 |
| RN | `scripts/orca-eval-grader.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 literal; base adopts it in S3 |
| RN | `scripts/orca-launch-gate.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 literal; base adopts it in S3 |
| RN | `scripts/orca-preflight.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 literal; base adopts it in S3 |
| RN | `scripts/orca-preflight.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 literal; base adopts it in S3 |
| RN | `scripts/orca-run.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 literal; base adopts it in S3 |
| RN | `scripts/orca-start.test.mts` | project-edit | superseded-by-S3 | S3 | conflict | floor 1.4.224 literal; base adopts it in S3 |
| RN | `scripts/pitch-archive.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/pitch-compress.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/runtime/README.md` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/runtime/cli.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/runtime/runtime.test.mts` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/runtime/select.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/setup-validator.mts` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/setup-validator.test.mts` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/skill-defaults.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/skill-defaults.test.mts` | project-edit | upstream (hunk) | S7 | conflict | IN_BUNDLE_REPO guard for installed projects; runner text stays local |
| RN | `scripts/skill-sync.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/skill-sync.test.mts` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/skill-vendors.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/skill-vendors.test.mts` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/state-html.test.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/state-render.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/state-snapshot.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/workflow-doctor.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/workflow-doctor.test.mts` | project-edit | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `scripts/workflow-metrics-report.mts` | project-edit | project-local (runner) | — | local | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `templates/project/done-work.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `templates/project/knowledge/README.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `templates/project/pitches/_templates/pitch.md` | project-edit | followup | — | local | RN pitch-numbering feature (next-pitch.mts); separate pitch |
| RN | `templates/project/reports/README.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `workflow/overview.md` | both-changed | followup | — | conflict | RN pitch-numbering feature (next-pitch.mts); separate pitch |
| RN | `workflow/phases/0-shape.md` | both-changed | followup | — | conflict | RN pitch-numbering feature (next-pitch.mts); separate pitch |
| RN | `workflow/phases/3-audit.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `workflow/phases/4-ship.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |
| RN | `workflow/phases/5-cooldown.md` | both-changed | project-local (runner) | — | conflict | node→bun runner rewrite; portable fix is runner-aware text in unified-toon-config |

## S8 merge notes (3-way docs, 2026-10-16)

Worker `updrift-s8-2` (OpenCode) ported climbing hunks. The coordinator reviewed the diff and restored base text
that base added after climbing synced.

| File | From climbing | Kept from base (restored by coordinator) |
|---|---|---|
| `workflow/overview.md` | `/hill` and `/verify` described as activities, not commands; note on current phase docs | `/fix (triage)` bug-fix flow; single-pass `/audit` hotfix flow; "Never auto-advance" gate philosophy |
| `workflow/phases/0-shape.md` | critique also required for AI-behavior changes at any appetite | — |
| `workflow/phases/1-plan.md` | runner-neutral, stack-verified exit checks | — |
| `workflow/phases/2-build.md` | hill rows recorded rather than run as `/hill`; stack-verified checks; bug-fix variant without planning files | Three-strike rule |
| `workflow/phases/3-audit.md` | runner-neutral i18n wording | — |
| `workflow/phases/4-ship.md` | final verification through `pre-ship-verify.mts`; non-applicable checks recorded with reasons | dropped "Replaces today's `/finish`"; repaired a table row |
| `templates/project/runs/README.md` | — (climbing's session-log rewrite rejected) | base file restored unchanged: it describes what `/ship` and `/cooldown` write |
| other templates | placeholders replace product-specific values and fixed thresholds | — |
| `.opencode/opencode.json` | climbing `cca360a` plugin registration | base `agent.build.model` block. `.opencode/plugins/package.json` is not ported: OpenCode generates it and both repos ignore it |

## S9 sync proof (2026-10-16, base 2.23.0)

Method: the bundle-relevant parts of each project (`ai-framework/`, vendor adapter directories, entry files,
`.project/` without metrics; no `.git`, `node_modules` or secret-shaped files) were copied to the session
scratchpad. In each copy, the new base `bundle-sync.mts --source <base> --json` ran as a dry run, and so did the
project's own 2.22.5 `bundle-sync.mts`. The raw comparison is in `sync-proof.json`. `git status --porcelain` in
all three projects was identical before and after (0 dirty; HEADs `02a2f91`, `48a721d`, `bfb81b6`).

| Project | Ledger rows | Match | Mismatch | Dry run: new / changed / local / conflict / removed |
|---|---|---|---|---|
| climbing | 76 | 48 | 28 | 2 / 6 / 42 / 139 / 34 |
| RN | 87 | 73 | 14 | 3 / 36 / 45 / 131 / 61 |
| LAH | 15 | 10 | 5 | 3 / 57 / 0 / 12 / 1 |

- The new and the 2.22.5 `bundle-sync` give the same result for all three projects.
- Mismatches, grouped:
  1. **Better than expected** (`conflict` → `identical`): RN `orca-start{,-codex}-hook.mts`, LAH `rules/testing.md`
     and `orca-start.mts`, climbing `phases/0-shape.md` and `3-audit.md`. Base now holds those projects' change.
  2. **Same result, other words**: `changed` rows now report `identical` (opencode-plugin and graphify tests);
     project-only files report `removed` but are kept because they are modified (RN rules, LAH
     `orca-vendors.json`). Climbing's `README.md`/`SETUP.md` are untouched; the comparison counted them as
     `identical` only because they appear in no list.
  3. **Decided in this pitch**: climbing `templates/project/runs/README.md` stays `local` (rewrite rejected, S8);
     RN runner-only docs and `graphify.mts` stay `local` (D4).
  4. **24 climbing files `identical` → `conflict`**: base took climbing's version and then changed it (1.4.224
     literals, macOS EPERM handling, child isolation, ledger `schemaVersion`, RN hook hardening and tests, the
     S8 restorations). For each file the difference from climbing is only those base additions, so
     `workflow-v3-rollout` takes base for all 24.
- **Rollout warning (`workflow-v3-rollout`)**: never run `--prune` on climbing or RN without reviewing the list
  first. Their sync markers still list files that base no longer ships, and those files are unmodified, so a
  prune would delete climbing's `frontend-craft` skill and its `e2e-runner` / `tdd-guide` agents (34 files across
  all vendor copies) and RN's `next-pitch.mts` and its test.

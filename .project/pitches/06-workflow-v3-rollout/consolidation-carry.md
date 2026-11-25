# Rollout input: connected-memory-consolidation work

**Date**: 2026-10-21  •  **Bundle at writing**: 2.41.0 (`b26b45b`)  •  **Source**: `../connected-memory-consolidation/{pitch,plan,hill}.md`
(plan revision 2). `readiness.md` was measured at 2.30.0 and predates this work and releases 2.31–2.41: **it must be re-run**
against the release that contains the work below before any project PR is opened.

## What is being built and what each project receives

| Track | Pitch | Ships to projects as | Instance data touched |
|---|---|---|---|
| P1 | `connected-process-graph` | `ai-framework/workflow/relations.toon` (bundle-owned), `graphify-relations.mts`, `graphify-refs.mts`, graphify `--check` that fails when a skill/agent/rule/phase doc has no relation entry or `standalone` reason | none; optional project overlay `.project/relations.toon` (never written by sync) |
| P2a | `consolidation-schemas` | ledger v2 (dual-read, v1 still valid), decision `status`/`supersedes`, outcome-record template + lint, generated `done-work.md` index, `setup-validator` check | none until migrated |
| P2d | `installed-sync` | `consolidation-migrate.mts`, `bundle-sync` next step `consolidation`, doctor `info` on legacy data, two-pass sync docs | `.project/records/shipped/`, `done-work.md` index markers, decision template (only if unmodified) |
| P2c | `legacy-upgrade` | `legacy-upgrade.mts` (status / prepare / apply), `archive-reads.log` | each project's compacted pitches, one per run, human-gated |

P2b, P3a, P3b (`/ship` Consolidate step, retirement, `/state` from records) are not bet; when they ship they need their own
addendum here.

## Consequences for the rollout

1. **Release dependency.** The rollout syncs the release that contains P1, P2a and P2d at minimum. P2c ships the tool in the same
   release or the next; running the campaign in the three projects is a separate, later step per project, never part of the
   sync PR.
2. **Never in the sync PR:** upgrading instance pitches, rewriting `done-work.md` entries or ledgers. The sync PR carries bundle
   files plus the dry-run/apply of `consolidation-migrate.mts` (scaffold + markers only).
3. **Relations coverage in installed projects.** Climbing and RN have their own agents/skills (`e2e-runner`, `tdd-guide`, ...).
   Before `graphify --check` can pass they need entries in `.project/relations.toon` (overlay) or a `standalone` reason; registry
   installs (`caveman`, etc.) are exempt. Add this to each project's PR checklist and to the doctor-clean gate.
4. **Project-owned rules.** RN's rule rewrites move to `.project/rules/` (already planned). The relations manifest lists bundle
   rules only; project rules need overlay entries or `standalone`.
5. **Two-pass sync.** A project's old `bundle-sync.mts` cannot know the new rules, so the sequence from `readiness.md` stays:
   own-version sync first, then the delivered sync, then a no-op third pass, then `config-migrate`, then
   `graphify.mts setup`, then `consolidation-migrate.mts` (dry run, review, `--apply`). Document in `ai-framework/docs/versioning-and-sync.md` (P2d-S2).
6. **Legacy data stays valid.** After sync without migration, every project must still pass `setup-validator`, doctor and `/state`
   (dual-read). This is an acceptance check per project, not an assumption.
7. **Decision-template drift.** Projects that edited `.project/knowledge/templates/decision.md` keep their copy (reported `local`);
   status-less decisions are read as `accepted`.
8. **Graph rebuild.** Every project runs `graphify.mts` after sync; the relations overlay changes node/edge counts, so before/after
   counts are recorded in the PR, as with the `entitie` fix.
9. **In-flight pitches.** The existing rule (checkpoint them first) now also covers pitches that are mid-compaction: refuse to
   migrate while `.project/compaction/transaction.json` exists (`requireNoPendingCompaction`).
10. **lasallenorandi** stays out of scope (fresh install, not a sync); the new scaffold directories arrive through that install.
11. **This repo is its own fixture.** P2d-S3 builds an installed project from `b26b45b` and replays sync → migrate; that test is
    the dry-run evidence the rollout reuses, but each real project still gets its own scratch-copy dry run.

## Open inputs the rollout must close before bet

- Re-run the three scratch-copy dry runs at the release tag; record conflicts/kept-local counts next to the 2.30.0 table.
- Decide per project whether to start the P2c campaign immediately after merge or defer (compacted-pitch counts per project needed;
  none measured yet — run `legacy-upgrade.mts status` in each scratch copy).
- Pre-existing open items from `readiness.md` still apply (`cursor-mirrors` and project-added agents; token-consumption lock flake).
- Climbing Orca 1.4.224+ prerequisite (`_followups.md`) is unchanged.

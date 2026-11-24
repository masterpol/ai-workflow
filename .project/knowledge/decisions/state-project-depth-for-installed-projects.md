---
id: state-project-depth-for-installed-projects
type: decision
status: accepted
created: 2026-11-24
updated: 2026-11-24
tags: [state-report, archify, bundle-sync, erd, structure, reports]
related: [archify-renders-the-state-report, project-state-report-design, a-report-over-an-untrusted-tree-runs-only-bundle-code, pin-the-descriptor-you-hashed-before-removing-or-replacing, a-real-schema-breaks-a-naive-erd]
alternatives: [toon-depth-setting, prisma-and-sql-parsing, delete-reports-by-name]
applies-to: [state, bundle-sync]
source: state-project-depth
---

# Decision: `/state` shows the project itself where the workflow is installed, and a bundle update resets the last delivery

## Summary

`facts-gather.mts --depth auto` picks `project` depth when `.project/.bundle-sync.json` exists, and `simple` otherwise, which is this
bundle's own checkout. Project depth adds three sections, collected by `facts-project.mts`:

- a schema ERD from the newest Drizzle snapshot;
- a two-level folder tree;
- the stack from `package.json`.

`bundle-sync --apply` removes the last `/state` delivery when the sync changed files, and only when Archify's receipt hashes prove the files are the delivered ones.

## Decision

- **Structured sources only.** The schema comes from `drizzle/meta/NNNN_snapshot.json`, `stale` when `_journal.json` lists more migrations than
  it covers. Prisma, SQL and TypeScript schemas are `unconfigured`. There is no parser over free text, no project code and no database. This
  partly reverses the 2.51.0 drop of the database and structure sections ([[archify-renders-the-state-report]]), but as collector
  facts rendered by Archify, not a bespoke renderer.
- **Depth by detection, not config.** A `state.depth` key in `ai-workflow.toon` was dropped at `/plan`. A new config key spreads to the
  schema, the migrator and their tests, and auto-detection already gives the requested split.
- **Two native diagrams of four.** The ERD shows at most 30 entities (the most connected), at most 5 drawn relationship ends per table and
  15 attributes. The tree shows at most 60 nodes. Discovery budgets are separate from these display caps.
- **Ownership by hash, never by name.** Archify's `state.delivery.json` records `specification.sha256` (the draft) and `artifact.sha256`
  (the page). `facts-gather` also records `<draft>.written-sha256` for its own undelivered draft. The reset is the single documented exception
  to "bundle-sync never touches `.project/`". See [[pin-the-descriptor-you-hashed-before-removing-or-replacing]].

## Consequences

- **Pros**: an installed project's page shows its schema, layout and stack, and an update no longer leaves a page describing an older bundle.
- **Cons**: Drizzle only. A stale snapshot (LAH: 12 migrations, snapshot covers 3) shows an old schema, flagged as stale.
- **Implications**: `workflow-v3-rollout`'s syncs of LAH, RN and climbing will reset their deliveries (followup).

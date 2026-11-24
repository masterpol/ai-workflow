# SHIPPED: state-project-depth

**Shipped**: 2026-11-24  •  **Version**: 2.53.0  •  **Appetite**: big-batch (15 files, at the cap)  •  **Mode**: Orca, Run `run_5412bcf5df8e`

## Summary

In a project with the workflow installed, `/state` now also shows the project itself:

- a database ERD from the newest Drizzle snapshot, flagged stale when migrations are newer;
- a two-level folder tree;
- the stack, from `package.json` and the lockfile.

This bundle's own checkout keeps the simple page, because `--depth auto` detects the sync marker. `bundle-sync --apply` resets the last delivery when the sync changed files, and only for files whose hashes match Archify's receipt. `/state` never replaces a draft it did not write or deliver.

## Scope status

| Scope | Status | Who | Evidence |
|---|---|---|---|
| A1 project fact readers (`facts-project.mts`) | done | Orca codex `a1-1`; coordinator widened the framework list | 22 tests; live LAH: 9 tables (stale 12/3), 28 dirs, bun + TanStack + Vite + Drizzle |
| A2 depth, diagrams, safe regeneration (`facts-gather.mts`) | done | Orca claude `a2-1`; audit fixes in main thread | 36 tests, including 4 real `archify validate` cases; golden simple-depth draft byte-identical |
| B1 report reset (`bundle-sync.mts`) | done | Orca codex `b1-1`; audit fixes in main thread | 53 tests, including 3 injected race tests |
| C1 docs, mirrors, doctor list, 2.53.0 | done | coordinator | doctor READY; mirrors identical; docs links 0 broken |

## No-gos honoured

- No project code, child process, database or network in the collector. A test injects throwing `child` and `net`.
- No model-written text in the draft.
- The simple-depth page is unchanged. The golden comparison is byte-identical.
- No deletion without a matching receipt hash. No reset outside `bundle-sync --apply`, and only when the sync changes files.
- No Archify bump, vendoring or auto-install. A pin change only prints the `add-skill` command.
- The old `metrics`, `runs`, `doneWork` and `tokens` sections did not return.

## Rabbit holes

- **Resolved:**
  - Receipt fields: `specification.sha256` is the draft and `artifact.sha256` is the page, settled on LAH's real delivery.
  - Native-diagram count: 2 of 4.
  - Depth detection.
  - Drizzle only.
  - Stale-snapshot wording.
  - ERD layout: grid only, at most 5 drawn relationship ends per table, at most 15 attributes.
- **Emerged at audit and resolved:** a real schema breaks a naive ERD (self-references, truncated or hidden targets, colliding names). See issue `a-real-schema-breaks-a-naive-erd`.
- **Ownership races:** pin the descriptor that was hashed, publish new files by hard link, re-check before replacing. See pattern `pin-the-descriptor-you-hashed-before-removing-or-replacing`.
- **Residuals, documented:**
  - `readdirSync` loads one directory before its budget applies.
  - The path-based window between the final check and `unlink`/`rename` (no `openat`).
  - The rename fallback on filesystems without hard links.
  - A directory swap inside the listings (names only).

## Deviations

- The `state.depth` key in `ai-workflow.toon` was dropped at `/plan` (config-key blast radius).
- Prisma was dropped at re-shape.
- A `<draft>.written-sha256` ownership marker was added at audit, so a draft whose `validate` failed stays replaceable.
- The reset is gated on applied or pruned files (audit S5).

## Audit

3 cycles. Must-fix M1 to M3 and should-fix S1 to S7 fixed, S8 deferred.

**Independence:** `independent: no`. The reviewers were Orca workers reviewing the repo without canaries, by owner choice. M3 is author-verified only.

Record: `.project/analysis/2026-11-24-state-project-depth-audit.md`. Raw reports: `audit-reports/`.

## Verification at ship

- Full suite on an independent clone: 2,212 pass, 7 skip, 0 fail.
- Under Node: 111 of 111 tests pass across the three scripts.
- Checks: doctor READY; setup-validator, both graph checks, changelog check and docs links pass.
- Live LAH copy: validate and deliver pass.

## Followups

- S8: tell `workflow-v3-rollout` that its `bundle-sync --apply` will reset `/state` deliveries.
- Prisma (and other schema sources) for project depth.
- `opendirSync` in `RuntimeDeps`, so directory discovery stops before materialising a huge listing.
- A regression assertion for the doctor's syntax-check list entries.
- A live run on a real LAH checkout after its next sync, plus `/state` on OpenCode, Codex and Cursor (carried over).

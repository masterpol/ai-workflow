# SHIPPED: state-project-sources

**Shipped**: 2026-11-25  •  **Version**: 2.55.0  •  **Appetite**: big-batch (14 files, about 1650 LOC: about 10% over the 1500 cap)  •  **Mode**: Orca, Run `run_05080422e84d`

## Summary

`/state` at project depth now reads a project's schema from whatever source it has, and says what it found:
- A schema comes from a Drizzle snapshot or from SQL migrations in any dialect (`facts-sql.mts`, a pure reader), at the root or under a workspace.
- `pnpm-workspace.yaml` and `package.json` workspaces are discovered, with one Stack row per package (up to 20).
- The page names the source it used, the alternatives, and what it found but did not read (TypeScript, Prisma and Python schemas).
- Status fails closed. `observed` only when every file was read and every statement understood; otherwise `stale` or `unavailable`. "No schema source found" appears only when detection finished with nothing.

Checked on real projects (read-only, drafts through a real `archify validate`): LAH 13 tables (`stale`: 7 statements not understood, 3 tables approximate), RN 3 tables, climbing-lab 29 tables plus 10 workspace packages, and two docs-only projects with no schema.

## Scope status

| Scope | Status | Who | Evidence |
|---|---|---|---|
| S1 SQL DDL reader | done | Orca claude `sps-s1-1` | 420 lines at exit (spike limit 450); 16 tests at exit |
| S2 detection, workspaces, source choice | done | Orca opencode `sps-s2-1` | 609 lines at exit (+422); four live-check defects fixed by the worker after feedback |
| S3 wording, workspace rows | done | Orca codex `sps-s3-1` | +44 source lines, 4 real `archify validate` drafts |
| C1 contract, skill, mirror, doctor list, decision | done | coordinator | doctor READY; mirrors identical; a test lists every `facts-*.mts` file |

## No-gos honoured

- No SQL execution, database connection, project code, child process or network; the reader takes text and returns a schema.
- No model-written text in the draft; no parsing of TypeScript, Prisma, Python or any ORM schema.
- The simple-depth page is unchanged (golden comparison byte-identical). At most 2 native diagrams. No new config key. No route map.

## Rabbit holes

- **Resolved:** SQL scope (closed statement set, counted remainder); folders found by file naming, not folder name; replay in numeric prefix order; dialects (backticks, brackets, double quotes); a monorepo with two databases (most tables wins); the SQL reader on hostile input (linear lexer, doubling-time test).
- **Emerged at audit and fixed:** names are untrusted text in a second place (migration files, workspace paths, package names), see issue `a-word-boundary-credential-check-misses-joined-and-long-names`; a quadratic string build outside the lexer, see issue `a-string-built-in-a-loop-by-reading-its-last-character-is-quadratic`.

## Deviations

- The route map diagram was cut at critique (over the LOC cap; two route trees in one project).
- S2 grew to 609 lines against an estimate of 250, so the build ran about 10% over the cap. S2 took about 2 hours on the opencode vendor.
- `facts-sql.mts` ended at 454 lines after audit fixes (the 450 limit was the S1 spike). The credential patterns moved from `facts-gather.mts` to `facts-project.mts`, exported and imported back.
- `VERSION` and the changelog entry were written at ship, after `orca-balanced-role-pools` (2.54.0) was merged.

## Audit

3 cycles, Orca workers. 7 must-fix and about 20 should-fix fixed; nits acknowledged. **`independent: no`** (no canaries). **The cycle-3 fixes (the credential cutoff, fullwidth keys, an invalid `package.json`, `DROP` name matching, unterminated flow lists) were not re-reviewed**; each has a regression test.
Record: `.project/analysis/2026-11-24-state-project-sources-audit.md`. Raw reports: `audit-reports/`.

## Verification at ship

- Full suite on an independent clone of `main` (`a6be3f9`): **2,329 pass, 10 skip, 0 fail** (2,339 tests, 79 files). The skips include the real-Archify cases, absent on the clone; they pass in this checkout.
- Checks: doctor READY, setup validator READY, graph CLEAN, docs links (the touched trees) 0 broken.
- `pre-ship-verify.mts` failed as it does for this package-less bundle ("No package.json … found"), so the direct checks above were run instead, as in earlier ships (followup: `package-less-ship-verification`).
- No build, typecheck, lint or i18n command exists in this repository.
- Live: `/state` ran in LAH (validate and deliver ok); LAH is on 2.54.0.

## Followups

See `_followups.md`, section "From state-project-sources": route map, service diagrams, ORM schema sources, the `workflow-v3-rollout` release pin, SQL rename and retype replay, raw SQL and tree names in the facts JSON, parser-scope sizing.

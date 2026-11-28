# Shipped: workspace-slim
Bet: 2026-11-26  •  Shipped: 2026-11-26  •  Appetite: big-batch, small end (14 files outside records; limit 15)  •  Versions: 2.59.0 and 2.59.1

A read-only report shows what the workflow's folders take up and what Git tracks, and this repository's knowledge index went from 123,059 to
32,367 bytes.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-11-26 | `workspace-report.mts` (codex); coordinator corrected next steps; audit fixed three contract breaks |
| S2 | shipped | 2026-11-26 | index without tag index and diagram; `--check --json` has `tagIndex`; readers updated (claude) |

Files over the plan's 9: the Cursor skill copy, `consolidation-migrate.mts` and its test (missed consumers), and two doc lines at ship (`what-you-get.md`, `stack.md`).

## No-gos

- ✅ No file with content deleted or moved; no knowledge entry, decision, rule or backlog item removed or reworded. Knowledge cards were
  extended at ship as usual.
- ✅ The report writes nothing and runs nothing from the project **on the tested routes**. The build broke both (a `git` inside an enclosing
  repository; a split index); fixed in audit.
- ✅ `graph.json`'s data, Git history and recovery archives unchanged by this work.
- ⚠️ "Never zero" for unmeasured figures holds for the tested cases. A differently cased scan root (`.Project/`) may read as 0 and complete
  (reported by the re-check, not confirmed; followup).

## Rabbit holes

- ✅ Index readers: found by search and tests, except two consumers of the edited template and skill.
- ✅ Git listing: only `core.fsmonitor` ran in the spike; disabled and tested.
- ✅ `graphify.mts` and the hook risk: its own Git use is `rev-parse`; the pending high followup did not block this and stays open.
- ✅ Large trees and symlinks: bounded and not followed.

## Audit

Two of three cycles: [audit.md](audit.md). No open confirmed must-fix. Cycle 1 security is `independent: no` (its planted defect was not reported;
`canary-check` falsely said caught); the cycle 2 security re-check is independent. Only security was re-dispatched in cycle 2.

## Final verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts`: **exit 0** on the tree with the ship records and knowledge cards (117 s). 2,458 tests: 2,455 pass,
3 skip, 0 fail. `tests`, `setup-validator`, `knowledge-graph`, `process-relations`, `workflow-doctor` and `diff-sanity` passed. The tree also held
an untracked draft pitch, `07-archify-local-library`, that is not part of this work.

Not applicable, no such command (`.project/context/stack.md`): build, typecheck, lint, i18n. Not run: full suite under Bun (changed tests pass on
Bun in build and audit); Windows; Git versions other than 2.54.0. In this checkout with uncommitted changes, not on a clean clone.

## Observed in other projects (read-only)

The report's totals matched an independent count in this repository, LAH, climbing-lab-monorepo and RN, with Git status and index unchanged.
LAH **and climbing-lab-monorepo** track installed skill packages. The package-ignore fix listed before this pitch is still not done.

## Rollback

Revert the report and its test; revert the `renderIndex`, `tagIndex`, skill and README changes together, keep the added template hash so projects
that already refreshed are not stranded, and rebuild the graph. No data is involved.

## Knowledge

- New: `issues/changing-a-shipped-template-or-skill-has-hidden-consumers`.
- Updated: the Git-against-a-worker-tree pattern, the planted-canary pattern, `issues/guard-tests-can-fail-for-the-wrong-reason`.
- For `/cooldown`: audit scope narrowed to one role in cycle 2 again; the S2 per-scope gate was skipped in build.

## Followups

In `_followups.md` under the three "From workspace-slim" headings. Medium: the cased scan root; `canary-check` false "caught". The rest are low.

## Docs

`ai-framework/docs/what-you-get.md` (the new report), `knowledge-graph.md` and the knowledge READMEs (index), the `/knowledge-health` skill, and
this repository's `stack.md` commands. No new decision record.

# Shipped: greenfield-kickoff, part B1

Bet: 2026-11-27 • Shipped: 2026-11-27, bundle v2.61.0 • Appetite: big-batch, part B1 only

Part B2 (the `kickoff` interview) is not planned or built, so the pitch stays open and this record is not `SHIPPED.md`.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| B1-S1 | shipped | 2026-11-27 | A repository holding only root starter files reports `unclear` and lists them. |
| B1-S2 | shipped with limits | 2026-11-27 | The check runs from the bundle's source folder before anything is copied. No live owner run. |

**Departs from the plan** (both approved by the owner after the S2 spike; see [plan-b1.md](plan-b1.md) and [deviations.md](deviations.md)):
- "Move the source folder out" was replaced by "check before copying". Nothing is moved and the entry files did not change.
- Both install routes stay. Folder-in-project can report `empty` or `existing`. Copy-to-root reports `unclear` and asks.

**Amends the part A contract and the pitch:** root starter files no longer make a project `existing`. `pitch.md` is not edited.

## Part B1 goal

A real install can now report `empty` or `existing` on the folder-in-project route only. This also closes part A's unmet no-go for that route: an existing project is no longer asked an extra question. On copy-to-root it still is.

## No-gos honored

- No application code, scaffolding or package install: honored.
- No write before approval: both live eval runs left the three test projects byte-identical at the first approval or question.
- No secrets stored: the detector reads only the source folder's `SETUP.md` to confirm the folder is the bundle.
- No automatic shape, bet, plan or build: honored.

## Rabbit holes

- Resolved: setup could not tell new from existing on any install route.
- New: Orca accepts a `.project` path at dispatch and refuses it at collect; a leftover OpenCode service stalls the workflow doctor; on the folder route the copied entry files point at a root `SETUP.md` that is not there.

## Audit

Two cycles, no must-fix; see [audit-b1.md](audit-b1.md).

## Open at ship

- **Security high from part A, not fixed:** under Bun, a project's `bunfig.toml` preload runs before any workflow script. B1 does not change it. The owner's earlier override applies; it still needs its own `/fix`.
- Not run: the owner's live host smoke test, golden case `check-before-copy` (both eval runs are partial observations with no baseline), the copy-to-root route in a live run, and other vendors.
- The folder-path quoting is untested in Windows shells, and no test covers the 64 KiB limit on the source-folder marker.

## Verification

2026-11-27, B1 tree before the version entry; the final run is in the [run record](../../runs/2026-11-27-greenfield-kickoff-part-b1.md):
- `node ai-framework/hooks/scripts/pre-ship-verify.mts`: exit 0. Manifest checks (tests, setup validator, knowledge graph, process relations, workflow doctor) and built-in diff sanity passed. 2,537 tests, 2,534 pass, 3 skipped, 0 fail.
- `project-state.test.mts`: 63 pass on Node and on Bun. Setup skill mirror identical. Eval dataset parses. `git diff --check` clean.
- No build, typecheck, lint or i18n command exists in this bundle.

## Docs

`README.md`, `ai-framework/docs/setup.md` and `SETUP.md` describe both routes. `SETUP.md` changed, so synced projects merge it by hand. No decision record: the route choice is recorded in `plan-b1.md`.

## Knowledge and follow-up

- New issue cards: [Orca path refusal](../../knowledge/issues/orca-collect-refuses-a-path-that-dispatch-authorized.md), [leftover OpenCode service](../../knowledge/issues/a-leftover-opencode-service-stalls-the-workflow-doctor.md).
- New pattern: [check before an install writes](../../knowledge/patterns/check-a-project-before-an-install-writes-into-it.md).
- Updated: [install fixtures](../../knowledge/issues/fixtures-built-from-the-shipped-list-hide-what-a-real-install-holds.md) (still open).
- For `/cooldown` review: this pitch twice fixed a plan contract only after running the real install route. Run the route before asking the owner to choose a design.
- Run record: [2026-11-27](../../runs/2026-11-27-greenfield-kickoff-part-b1.md).
- Follow-ups: six items under "From greenfield-kickoff B1 build" in [the backlog](../_followups.md).

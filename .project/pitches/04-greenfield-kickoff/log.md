# Build log: greenfield-kickoff (part A)

## 2026-11-27 A1: real installs reported `unclear`
- Symptom: a clean copy from this checkout was `unclear` (`.opencode/package.json`), and Finder metadata in copied folders did the same; the worker's 34 tests passed.
- Cause: fixtures were built from the same shipped list they check, and the coordinator's brief asked for a Git-based list while Git ignores files `SETUP.md` copies.
- Fix: exact-path exclusions for OpenCode's local files and a three-name operating-system metadata exclusion, each with a failing test first; checked on a real copy.

## 2026-11-27 A1: the full verifier failed after the worker reported green
- Symptom: `runtime/invariants.test.mts` "guards every executable main with one direct-entry call".
- Cause: the worker replaced `runDirect` with a custom bootstrap; the brief's exit list did not include the full suite.
- Fix: use `runDirect`; update the one test that asserted the custom bootstrap.

## A1 evidence (coordinator-run, final code)
- `node --experimental-strip-types ... --test ai-framework/scripts/project-state.test.mts`: 36 pass, 0 fail. `bun test` same file: 36 pass, 0 fail.
- Mutant (`PROJECT_STATE_TEST_MUTANT=1`, the "fail-closed: a refused directory" test): exit 1, `existing` where `unclear` is expected. Author-run, not independent review.
- `workflow-doctor.mts`: READY. `setup-validator.mts`: READY.
- `pre-ship-verify.mts`: exit 0; 2,510 tests, 2,507 pass, 3 skipped, 0 fail.
- Clean Git-based copy plus `.opencode/package.json`: `empty`.
- Size: script 323 lines, test 431, shipped list 427; doctor +1.
- Worker: Orca `gk-a1-1`, Codex `gpt-6.2-sol` medium, released. Coordinator made two follow-up fixes. No independent review yet (`/audit`).

## Open at the A1 gate
- A JavaScript project with `node_modules/` passes the 4,096-entry budget and reports `unclear`, so `/setup` would ask instead of going straight to today's flow.
- A new repository with only `README.md`, `LICENSE` or `.gitignore` reports `existing` (the approved contract), which has no route into the part B interview.

## 2026-11-27 A2: neither documented install route can report `empty` (blocker, plan assumption)
- Symptom (coordinator simulation, brand-new empty projects): Route A, `SETUP.md` ("a human dropped this bundle into their project"): the Step 0 command A2 added fails with "Cannot find module", because the scripts are not at the root before Step 1; after the Step 1 copy the detector reports `unclear` on the `ai-workflow-portable/` source folder. Route B, `README.md` ("copy the contents of this folder to the root"): `unclear` on the bundle's `README.md`, `LICENSE`, `SETUP.md`, `VERSION`, `CHANGELOG.md`, `.gitattributes`, `.gitignore` and `.graphifyignore`. Route B was simulated without the bundle's `.project/` and `graphify-out/`, which a real folder copy also carries.
- Cause: the plan and the A1 fixtures define a fresh install as only `SETUP.md`'s Step 1 copy list. Neither documented route produces that. The A1 and A2 briefs inherited the assumption; the A2 worker reported the Route B half.
- Fix: none yet. Needs the owner's decision (detector change in A1's files plus the A2 text).

## A2 evidence (coordinator-run)
- Mirror diff empty; `project-state.mts` named once in the Claude setup skill and `SETUP.md`; `setup-validator`, workflow doctor and relations check pass; `pre-ship-verify` exit 0: 2,510 tests, 2,507 pass, 3 skipped.
- Worker: Orca `gk-a2-1`, Claude `claude-haiku-5-5`, released.
- Golden case `setup-refresh-keeps-definition`: not-run. Owner live smoke: not-run.

## 2026-11-27 A2 resolution and evidence
- Owner chose option 3. The detector is unchanged; `SETUP.md` runs the check at the end of Step 1, and the setup skill, its mirror and the setup doc state the current limit.
- Coordinator simulation: an existing project with the bundle's source folder present is `unclear`; with it removed, `existing`; an empty project with it removed, `empty`. On the `SETUP.md` route the moved command now runs and reports `unclear`.
- Final: mirror diff empty; `project-state.mts` named in the setup skill and `SETUP.md`; `definition.md` rule present; `setup-validator`, workflow doctor and relations pass; `pre-ship-verify` exit 0: 2,510 tests, 2,507 pass, 3 skipped, 0 fail.
- Not run: the owner's live host smoke test and the golden case `setup-refresh-keeps-definition`. The A2 coordinator edits were not written by the A2 worker and no independent reviewer has seen A1 or A2.

## 2026-11-27 Audit
- Three cycles; see [audit.md](audit.md). Fixed: unreadable files, evidence order, two manifest names, run-once setup handoff and choice-note safety. `R_OK` added to the runtime adapter (`runtime/node.mts`, `runtime/types.mts`).
- One open must-fix for the owner: Bun runs a project's `bunfig.toml` preload before any workflow script.
- Coordinator error: the first cycle 3 security review was dispatched after the bench refused its planted defect; redone.
- 2026-11-27 gate: the owner approved shipping with the Bun finding open (override recorded in `audit.md`).

## 2026-11-27 B1 build
- Run `run_37a7b457e0bd`. S1 names Codex `gpt-6.2-sol` medium instead of `assign`: the plan sets a standard model, and a pool pick cannot carry a per-vendor model.

## B1-S1 evidence (coordinator-run)
- `project-state.test.mts`: 55 pass, 0 fail on Node and on Bun. Against the old detector in a scratch copy: 48 pass, 6 fail (Git manifest test skipped there).
- Runtime invariants 8 pass; workflow doctor and setup validator READY; fail-closed mutant exit 1 (author-run).
- `pre-ship-verify` exit 0: 2,529 tests, 2,526 pass, 3 skipped, 0 fail.
- Worker `gk-b1s1-1` released. No existing test changed. A first mutant run exited 9 from a coordinator quoting error and was rerun.

## B1-S2 evidence (coordinator-run)
- `project-state.test.mts`: 60 pass, 0 fail on Node and on Bun; runtime invariants 8 pass; setup mirror identical; dataset parses; relations 0 problems.
- `pre-ship-verify` exit 0: 2,534 tests, 2,531 pass, 3 skipped, 0 fail.
- Route trial: all tracked files of the working tree, records included, copied to `ai-workflow-portable/` in scratch projects; the check run before any copy reported `empty`, `unclear` (starter files) and `existing`. No live host ran the instructions.
- Each skip condition removed in a scratch copy made tests fail (direct child 3, running copy 1, bundle title 2). Author-run.
- Not run: owner live smoke and golden case `check-before-copy`. The worker's failing-first run (58 pass, 2 fail) is the worker's figure.

## 2026-11-27 B1-S2: worker report refused, ledger slot held
- Symptom: `orca-run collect` returned `invalid-files`; `attempt-gk-b1s2-1` stays `launched`. The worker is released in Orca.
- Cause: the coordinator authorized `.project/evals/datasets/greenfield-kickoff.json`; dispatch accepts that path, but a report listing any `.project` file is refused.
- Fix: none. The report and the ledger were not edited. With three older stale records, all 4 slots of the cap are now counted as taken, so no further Orca worker can start until the owner decides.
- 2026-11-27 build gate (owner approved): four stale ledger records, each shown exited and released by Orca, moved unchanged to `.project/metrics/orca-ledger-archive-20261127/`.

## 2026-11-27 B1 audit
- One cycle; see [audit-b1.md](audit-b1.md). No must-fix.

## 2026-11-27 A leftover OpenCode service made the verifier fail
- Symptom: `setup-validator` timing test took 15.2 s; the workflow doctor took 16 s in an empty folder.
- Cause: `opencode debug config` hung while `opencode serve --service`, started during the audit's OpenCode reviewers, held its port. No Orca worker was using it.
- Fix: `opencode-service.mts free`.
- Cycle 2 (owner ran `/audit` again): no new defect in the real files; no reviewed file changed.

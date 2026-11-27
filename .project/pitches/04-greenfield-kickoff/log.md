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

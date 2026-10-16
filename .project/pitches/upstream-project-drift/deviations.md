# Deviations: upstream-project-drift

## D1 (plan) — S3 rewires the version call sites now
See plan.md "Living-spec deviations log" D1 (critique X1 overridden; pitch 3 changes only the function body).

## D2 (plan) — climbing ownership fixes stay in this pitch
See plan.md D2 (critique X2 partly overridden; `orca-policy.mts` shape and grader fixtures left to pitch 4).

## D3 (S0, 2026-10-16) — S8 and S1 shrink: most climbing docs/rules are project adaptations
- **Plan said**: S8 ports climbing `docs/{vendors,extending,setup,design-notes,workflow-doctor}.md` and
  `integrations/harnesses.md`; S1 triages climbing `rules/{context-management,model-routing,security}.md`.
- **Reality**: those files carry climbing's "Original bundle reference" banners, project model routing and
  links to its own `.project/rules/` companions. Classified `project-local` in the ledger.
- **Now**: S8 = climbing `workflow/` + `templates/` hunks only (13 files). S1 = `coding-standards.md`
  (`406ecc5` hunk), LAH `rules/testing.md` "verification discipline" section, graphify finish.

## D4 (S0) — RN is mostly a runner rewrite, not improvements
- 47 RN rows are `node → bun` text only. Kept project-local. The portable fix (runner-aware usage text, hook
  commands, doctor runner checks) moves to `unified-toon-config`, recorded as a follow-up.
- RN real improvements are 10 rows: the Orca start hooks, `stuck-uphill-detector`, `pre-ship-verify`,
  `hooks.json` path fix (S6) and the `skill-defaults.test.mts` `IN_BUNDLE_REPO` guard (S7, not in plan).

## D5 (build, 2026-10-16) — interim exact Orca pin 1.4.224 before S3
- **Plan said**: S3 (wave 3, after S2) moves the Orca floor to 1.4.224 with `isSupportedVersion`.
- **Reality**: the installed Orca is 1.4.224, so the exact pin `1.4.223` blocked every phase start with
  `runtime-version-unsupported`, including the wave 2 Orca dispatch.
- **Now**: the owner approved an interim exact pin. `SUPPORTED_VERSION = "1.4.224"` in `orca-preflight.mts`,
  test literals updated in seven test files, and one floor line in `orca-vendors.md`, committed on its own.
  S3 still owns the `isSupportedVersion` range check, the four call sites and the table tests.

## D6 (build, 2026-10-16) — S3 pulled forward ahead of S2
- **Plan said**: S3 runs in wave 3, after S2.
- **Reality**: minutes after the D5 pin, the Orca app updated itself to 1.4.227 (CLI still 1.4.224), and the
  launch gate refused the first wave 2 dispatch with `runtime-version-unsupported`. Nothing launched.
- **Now**: with owner approval, the coordinator did S3 before wave 2. S3 touches none of S2's runtime files.
  The wave 3 dependency only ordered work; there was no technical reason for it.

## D7 (S2, 2026-10-16) — climbing's runtime needed three fixes before base could take it
- **Plan said**: port climbing's runtime child ownership (8 files; base unchanged since sync, so a plain copy).
- **Reality**: climbing's version was proven on Linux only. On macOS its own `runtime.test.mts` fails 2 to 3 of 52
  tests (also inside climbing's checkout). Copying it into base also broke the bun GAUNTLET (58 failures).
- **Now** (coordinator, three fixes on top of the copy):
  1. `posixGroupIsRunning` and `killGroup` treat `EPERM` on macOS as "the group is still exiting" (macOS answers
     `EPERM` for `kill(-pgid)` while members exit, then `ESRCH`). `waitForPosixGroupExit` still proves the exit
     within its 5 s deadline.
  2. `createNodeDeps` / `createBunDeps` return `child: { ...nodeChild }`. With climbing's single shared `nodeChild`
     object, tests that replace `deps.child.runSync` in place leaked their fakes into every later test in Bun's
     single test process. Regression test added.
  3. `upgrade.test.mts` also tolerates `Codex startup wiring: UserPromptSubmit not registered`: an old install's
     own bundle-sync never delivers `.codex/hooks.json`, the same case as the README/docs tolerance already there.
     This clears the 3 pre-existing upgrade failures (decision 3).
- Linux check (decision 4): Docker `node:24` (24.22.0, Linux 6.12): runtime, invariants and test-helpers 69 pass,
  0 fail, 5 skipped.
- Remaining flakiness only under full-suite load (follow-up): "descendant ownership after timeout/output"
  (node and bun) and the orca-eval-grader mutation proof ("settle without evidence"). Each passes when its file
  runs alone, 3/3 or more.

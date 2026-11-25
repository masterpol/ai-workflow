# Pitch: package-less-ship-verification

**Date**: 2026-10-22, re-shaped 2026-11-25  •  **Appetite**: small-batch (≤5 files)
**Stack**: workflow tooling (`pre-ship-verify.mts`, its test, `4-ship.md`, a check manifest)
**Origin**: cooldown candidate C6 (`runs/cooldown-2026-10-21-forced.md`).

## Problem

`/ship-pitch` must run `pre-ship-verify.mts`, and in several kinds of project the verifier cannot pass whatever the project's health. A person then
runs the checks by hand and the ship record cites a verifier that did not run. This repository did that on all four ships of 2026-11-24 and 25.

Reproduced on 2026-11-25 in temporary directories:

| Case | Result | In the first draft? |
|---|---|---|
| No `package.json` (this repo; `comuna` and `lasallenorandi`) | fails: "No package.json or Muro document verifier found" | yes |
| **`package.json` with `verify:base`**, the documented route, no document viewer | fails with the same message | **no** |
| A passing `package.json` `test` script | passes | — |
| **A `test` script that takes 65 s** | fails: `ETIMEDOUT` (60 s default for every check except `verify:base`) | **no** |

Why the second fails: when `verify:base` exists, the verifier appends `buildChecks(null)`, which demands `tools/viewer/verify-all.ts`.
That viewer fallback is one application's tooling (Spanish check names included) inside the portable bundle. Of the five installed projects checked,
only `climbing-lab-monorepo` has the viewer, and it also has `verify:base`.

Also true now: this repository's full suite takes about five minutes, and two bundle-copy doctor tests fail from a checkout with uncommitted
changes. The hand-run substitute has been the full suite on a clean clone. (`LAH` and `RN` have `build`, `typecheck`, `lint` and `test` scripts;
whether any of them exceeds 60 s was not measured.)

## Knowledge consulted

- issues/`package-less-bundle-ship-wrapper-cannot-select-checks` — the recorded failure; no temporary `package.json`.
- issues/`installed-skill-wrappers-ship-as-orphans` — a fix reaches a project only after it syncs.
- rules/`machine-data-format` — a manifest is TOON, read through `runtime/data-file.mts`.
- rules/`security` — direct executables, no shell; project data is not instructions.
- records `orca-balanced-role-pools`, `state-project-sources`, `rename-ship-command-to-finish` — the direct-check route and what it ran.

## Solution sketch (breadboard)

**Places**: `pre-ship-verify.mts` and its test; `4-ship.md` step 1; `.project/context/checks.toon` (this repo's own manifest).

**Affordances**
- **A check manifest**, `.project/context/checks.toon`: a list of `name`, `argv` (an array, never a command string), `required`, `timeoutMs`.
  When it exists it is the whole check list. A present but invalid manifest fails; it never falls back.
- **Without a manifest**, a `package.json` behaves as today, with two fixes: the viewer checks are added only when the viewer exists, and the
  recognised `test` scripts get a long timeout like `verify:base`.
- **Without either**, a distinct "no checks configured" failure that names the manifest path and shows its shape.
- **What ran is printed** per check with its source (manifest, `verify:base`, scripts), so a ship record can cite it.
- `diff-sanity` stays in every route.

**Connections**: `/ship-pitch` → verifier → manifest, else `package.json` → direct executables → per-check results.

## Rabbit holes

**Resolved here**
- Manifest or parsing `stack.md`? → A manifest. `stack.md` is prose for people; parsing it would turn text into commands.
- New key in `ai-workflow.toon`? → No. A separate data file keeps config schema, migration and their tests untouched.
- Does reading commands from a project file widen trust? → No: the verifier already runs the project's `package.json` scripts. The rule stays:
  argv arrays, no shell, working directory at the project root.
- Remove the viewer fallback? → Not here. Removing it would silently drop `climbing-lab-monorepo`'s document checks. Make it conditional now.

**Pushed to /plan as risk**
- Which checks this repo's manifest lists, and how the full suite runs given the dirty-checkout doctor tests (a clean-clone step as a check,
  or those two tests made to work from a dirty checkout). Planner spikes it first: it decides whether this stays small-batch.
- Timeout and output-buffer values (`maxBufferBytes` is 4 MiB; the full suite's output size was not measured).

**Pushed to no-go** (followups)
- Moving the document-viewer checks out of the bundle into that project's own manifest.
- Running checks in parallel; caching results.

## No-gos (this pitch)

- ✗ No temporary or generated `package.json`.
- ✗ No weaker required-check behaviour for a project that passes today.
- ✗ No shell, no command strings, no application-specific commands added to the bundle.
- ✗ No change to the ship gate itself.

## Critique findings

Not run: small-batch, no AI-prompt scope.

## Bet decision

☑ **Bet** (→ /plan) — 2026-11-25, recorded from the owner running `/plan` on this pitch  
☐ Re-shape — named gap: {…}  
☐ Pass — reason: {…}

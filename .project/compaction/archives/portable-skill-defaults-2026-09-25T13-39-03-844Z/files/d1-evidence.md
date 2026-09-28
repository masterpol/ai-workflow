# D1 completion evidence

Scope: bundle default skill catalog, mode precedence/resolution, and propagation to all 7
canonical phase skills. Runtime: Node v24.18.0. No external skill was installed into this
checkout (catalog is proposal-only, per plan.md and the parent pitch's no-gos).

## Behavior tests and coverage

```sh
node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/skill-defaults.js' --test-coverage-lines=90 ai-framework/scripts/skill-defaults.test.js
```
Exit 0: 11 tests, 11 pass. Line coverage 100%, function coverage 100%, branch coverage 92.65%.

Tests cover: catalog/MODES consistency; every one of the 6 modes plus `off` resolving correctly
and an unknown mode rejected; missing `modes.json` falling back to the bundle default; full
precedence chain (invocation > phase override > instance default > bundle default); persistent
`enabled:false` disable yielding to an explicit per-call `--arg`; 7 distinct malformed
`modes.json` shapes all rejected; a symlinked `modes.json` refused; `report()` distinguishing
not-installed/installed+enabled/installed+disabled without throwing and reporting runtime
availability honestly (both available/unavailable observed live: Python present, `agent-browser`
CLI absent, in this environment); an invalid registry surfaced without throwing or claiming
false installation; full CLI coverage (`resolve-mode`, `report`, both `--json` and plain text,
bad `--arg`, unknown action).

## Syntax and workflow verification

`node --check ai-framework/scripts/skill-defaults.js`: exit 0.

`node ai-framework/scripts/workflow-doctor.js --json`: exit 0, 0 failures. New `skill-defaults.json`
schema check (structural, not just JSON-valid) proven to fail loudly: manually corrupted the
catalog's `schemaVersion` to 2, doctor reported `failures: 1`; restored, doctor returned to 0
failures.

All 7 canonical phase files (`shape`, `critique`, `plan`, `build`, `audit`, `ship`, `cooldown`)
carry exactly one `Caveman mode:` paragraph each (`grep -l` returns all 7). Only canonical files
changed — every vendor mirror already says "load the canonical file and follow it exactly," so
no mirror needed a per-vendor edit.

## Opportunistic fix (found while touching workflow-doctor.js for this scope)

`bundle-sync.js` and `skill-sync.js` (from the just-shipped `portable-skill-installation`) were
missing from the doctor's `node --check` script list — every other script it knows about gets a
syntax check, these two didn't. Added both, plus this scope's own `skill-defaults.js`, to that
list. Unrelated to D1's own contract; fixed in the same file edit rather than filed as a
followup, since it was a one-line addition with no design decision involved.

## Remaining

D2 (stats attribution + compress guard) and D3 (browser runtime readiness) are next, dispatched
in parallel per plan.md — both depend only on D1's now-fixed catalog/schema, not on each other.

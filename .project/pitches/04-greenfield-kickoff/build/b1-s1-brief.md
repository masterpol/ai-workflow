# B1-S1 brief: starter-only repository reports `unclear`

Read first: `.project/pitches/04-greenfield-kickoff/plan-b1.md` (section "B1-S1" and the owner decisions), `ai-framework/scripts/project-state.mts`, its test file, `ai-framework/rules/coding-standards.md`, `ai-framework/rules/testing.md`.

## Change
In `ai-framework/scripts/project-state.mts`: when the scan completes with no refusal and every project file is a starter file at the project root, report `unclear` instead of `existing`.

- Starter files, matched only at the root (no `/` in the relative path), ignoring case: `README`, `LICENSE`, `LICENCE`, each bare, `.md` or `.txt`; and `.gitignore`. Nothing else: not `.gitattributes`, not `COPYING`, not `CHANGELOG.md`, not `README.rst`.
- It has its own fixed reason string saying the only project files are starter files. Evidence lists them, as other results do.
- The JSON shape, the four states, exit codes and every other rule stay as they are. `empty` still means no project files.

## Tests (write them first and record the failing run)
Build on the existing real-install fixture.
- Only `README.md`; only `LICENSE`; only `.gitignore`; all three together: `unclear`, exact evidence, and the new reason.
- Case and extension variants such as `Readme.txt` and `licence.md`: `unclear`.
- `README.md` plus `src/app.ts`: `existing`.
- `docs/README.md` alone: still `existing`.
- A root file that is not a starter file (for example `CHANGELOG.md` or `README.rst`), alone and beside `README.md`: `existing`.
- A starter file beside an entry that cannot be judged: `unclear` for the refusal, without the starter reason.
- Update deliberately any existing test that the new rule changes, and name each one in your report.

## Exit commands (all must exit 0)
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/project-state.test.mts`
- `bun test ai-framework/scripts/project-state.test.mts`
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/invariants.test.mts`
- `node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/workflow-doctor.mts`

Add no file. Estimate 50-80 changed lines; report if you will exceed 120.

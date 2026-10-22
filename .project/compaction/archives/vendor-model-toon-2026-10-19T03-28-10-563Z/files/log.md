# log: vendor-model-toon

## Incident — 2026-10-16 — effort scope clarification

**Symptom**: User asked to validate `effort` for claude and opencode as well, not only codex.
**Root cause**: Example toon and initial framing only showed `effort` under `codex`; the shared `ModelEntry` type and `validateModels` already accept `effort` for any vendor, but the example didn't demonstrate it.
**Fix**: Updated `ai-framework/templates/ai-workflow.example.toon` to include `effort` for `claude.deep`, `opencode.deep`, and `codex.deep`. Verified: loadConfig returns 0 problems and the parsed model carries `effort` for all three vendors.

## Incident — 2026-10-16 — test-suite ripple from schemaVersion bump (resolved)

**Symptom**: Full `node --test` of `ai-framework/scripts` shows 1288 pass / 93 fail in a clean checkout (gitignored v2 `ai-workflow.toon` moved aside). Failures are concentrated in `config-migrate.test.mts` asserting the pre-bump error text and `unsupportedVersion` regex.
**Root cause**: Bumping `schemaVersion: 2 → 3` in `runtime/config.mts` changes the refusal message ("only 2 is supported" → "only 3 is supported") and the `unsupportedVersion` regex in `config-migrate.mts:291`. Existing tests assert the old literals.
**Fix (planned)**: Update `config-migrate.test.mts` assertions + the `unsupportedVersion` regex + the "only N is supported" literals in `runtime/config.mts` in lockstep. This is the documented plan risk; not yet executed in this session.
**Status**: resolved 2026-10-17 — config-migrate tests and literals were updated in lockstep (config + migrator suites 134/134).

## Incident — 2026-10-16 — development-environment test fragility (exposed)

**Symptom**: `skill-defaults.test.mts` "workflow-doctor exits 0 on a real bundle copy" and "doctor and setup-validator report the live caveman state" fail (exit 1 / TypeError) when the developer's gitignored v2 `ai-workflow.toon` exists, because `fs.cpSync` copies it into the test fixture and the now-strict v3 parser refuses it.
**Root cause**: Tests `cpSync` the bundle root (which includes gitignored files) without filtering `ai-workflow.toon`. Pre-bump, the v2 parser accepted the local file; post-bump, it refuses it. In a clean checkout (no local toon), all 28 tests pass.
**Fix (planned)**: Add `ai-workflow.toon` to the `cpSync` skip filter in the two affected tests, OR (when the v2→v3 migrator is implemented) convert the local file. The test author's comment at `skill-defaults.test.mts:346` ("ai-workflow.toon is gitignored: a clean checkout has none ... always seed from the shipped example") confirms the intent; the copy step didn't enforce it.
**Status**: resolved 2026-10-17 — the local `ai-workflow.toon` is v3; no longer reproduces.

## Build — 2026-10-17 — S1 completion pass (pre-audit)

Closed the gaps found when validating state before `/audit` (author-run; independent review still pending):
- `validateModels` now rejects unknown vendors (allowlist claude/opencode/codex), unknown keys inside a profile entry, and a listed vendor missing any of fast/standard/deep. 5 new tests in `runtime/config.test.mts`; planted mutants for each of the three guards fail the matching test, then reverted.
- `config-migrate.mts`: real v2→v3 in-place conversion (`convertV2`): `--apply` converts a schemaVersion 2 file without `--force`, keeps every value and comment, appends the default `models` block, backs up the original, and still validates through the `loadConfig` round trip (unknown keys are refused). The legacy-build path (`emitToon`) also emits the default `models` block. 4 new tests.
- README "Model configuration" section added; `schemaVersion: 2` references bumped in README, SETUP and `orca-vendors.md`.
- `workflow-doctor.test.mts`: the missing-profile test now accepts the reader's earlier, clearer "models.codex.deep is required" failure (doctor detail: "ai-workflow.toon has problems: ...").
- Evidence: config + migrator suites 134/134; doctor suite 56/56; `setup-validator` READY; graph CLEAN.
- Full suite 1461/1464: the 3 failures are all in `runtime/upgrade.test.mts` and fail identically at HEAD without these changes (old-install fixture has no `ai-workflow.toon`, so the doctor's mandatory check fails). Not caused by this pitch; logged as a followup.

## Deviation — sequencing
Pitch said ship after `workflow-v3-rollout`; it landed first (orca-role-pools and agent-model-sweep depend on it). `workflow-v3-rollout` must handle a v3 config.

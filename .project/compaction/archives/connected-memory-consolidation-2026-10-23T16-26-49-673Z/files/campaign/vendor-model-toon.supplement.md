# Source-review supplement: vendor-model-toon

Prepared 2026-10-22 from verified recovery sources. This is the durable record of the vendor-model-toon pitch (bet 2026-10-16, shipped 2026-10-17, release 2.29.0, small batch, one scope) now that its done-work narrative is retired; no compact pitch-compression record exists. Results are historical evidence, not a new certification. Decision: [TOON subset grammar](../../decisions/toon-subset-grammar.md). Issue: [schema bump left stale tests and migrator](../../knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md). Patterns: [in-memory mutant](../../knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md), [pass own tests, break on real file](../../knowledge/patterns/a-pitch-can-pass-its-own-tests-and-break-on-the-real-file.md), [migrator edits the token](../../knowledge/patterns/a-version-migrator-edits-the-token-not-the-model.md). Code: [config](../../../ai-framework/scripts/runtime/config.mts), [config-migrate](../../../ai-framework/scripts/config-migrate.mts), [example toon](../../../ai-framework/templates/ai-workflow.example.toon). Related: [model routing rule](../../../ai-framework/rules/model-routing.md), [harnesses](../../../ai-framework/integrations/harnesses.md), [agent-model-sweep supplement](agent-model-sweep.md). Conflicting figures are kept as recorded under Historical contradictions.

## Delivered behavior

`ai-workflow.toon` gained a `models` block at schemaVersion 3. Validation is strict: a vendor allowlist (claude, opencode, codex), unknown keys inside a profile entry refused, all of fast, standard and deep required for every listed vendor, and an optional `effort` accepted for any vendor. `config-migrate --apply` converts a schemaVersion 2 file in place without `--force` (`convertV2`): only the version digit changes, every value, comment and line ending (CRLF, trailing blank lines, an inline comment on the version line) is kept, the default `models` block is appended, the original is backed up, and the result still validates through the `loadConfig` round trip (unknown keys refused). The legacy-build path (`emitToon`) emits the default models block, or the custom `model.models` when present (model ids may contain `/`). The example toon shows `effort` for claude.deep, opencode.deep and codex.deep. README gained a "Model configuration" section, and `schemaVersion: 2` references in README, SETUP and orca-vendors.md were bumped. Part landed 2026-10-16 (commit df9683d) and the rest was completed 2026-10-17.

The baseline had shipped with validator gaps (unknown vendor or key, missing profile) and no migrator. The completion pass closed them with 5 validator tests in `runtime/config.test.mts` and 4 migrator tests, each guard proven by a planted mutant that failed the matching test and was then reverted. The doctor test for a missing profile was changed to accept the reader's earlier, clearer "models.codex.deep is required" failure.

## Scope and limits

Pitch problem: model identifiers were scattered over four vendor adapter trees and `.opencode/opencode.json`, with no single declared place and no copyable example. Scope: models block grammar, validation, migration, example and README only. No-gos held: no agent prompt bodies or frontmatter, no workflow-doctor model-routing change, no dependency or network call, no secret or `.env` handling, no aliases, fallback chains or per-role overrides. Stripping `model:` from the agent trees, the opencode.json models and doctor mirror validation were pushed to agent-model-sweep.

Sequencing deviation: the pitch said to ship after workflow-v3-rollout (whose 3.0.0 base assumed schemaVersion 2). It landed first, orca-role-pools and agent-model-sweep built on it, and workflow-v3-rollout must expect a v3 config.

## Design decisions

A new root key is a grammar change, so the schema bumps to 3 with a real v2 to v3 converter, not a replacement. Profiles are objects with `model:` and optional `effort:`, so future per-profile options need no grammar change. The agent files were untouched; the block was inert until agent-model-sweep. The v2 read path is textual conversion plus a strict round trip, so `loadConfig` stays strict at v3. Pushed to plan with the implementer as owner: the `ConfigModel` type shape and README placement without duplicating setup.md or harnesses.md.

Plan: a single sequential scope over seven files (config.mts, config-migrate.mts, runtime/test-helpers.mts, both test files, the example toon, README), about 500 lines. Exit criteria: config and migrator suites, `node --check` on the touched scripts, a `models:` key in the example, a "Model configuration" heading, a v2 fixture round trip preserving `runtime.runner`, `integrations.orca.*`, `doctor.modelRouting` and `skills.modes.caveman`, mutant guards, and a full suite run. Plan risks, all handled in lockstep: a v2 read path without weakening `loadConfig`; helper fixtures (`toonFixtureText`, `orcaPolicyToonText`) hardcoding version 2; the "only 2 is supported" literals; and the implementer's gitignored local toon failing doctor until converted.

Review decision A1: a v3 file with `models` omitted or empty loads without problems by design; the mandatory check belongs to workflow-doctor (agent-model-sweep).

## Build incidents

- Effort scope (2026-10-16): the user asked that `effort` be validated for claude and opencode, not only codex. The shared `ModelEntry` type and `validateModels` already allowed it, so only the example toon changed, and `loadConfig` returned 0 problems with `effort` carried for all three vendors.
- Version-bump ripple (2026-10-16, resolved 2026-10-17): a full run showed 1288 pass and 93 fail in a clean checkout with the gitignored v2 toon moved aside. Bumping 2 to 3 changed the refusal text ("only 2 is supported" to "only 3") and the `unsupportedVersion` regex at `config-migrate.mts:291`, so tests asserting the old literals failed. Fixed by updating the literals, regex and assertions in lockstep (config and migrator suites 134/134). The lesson is in the linked issue.
- Development-environment fragility (2026-10-16, resolved 2026-10-17): two `skill-defaults.test.mts` tests ("workflow-doctor exits 0 on a real bundle copy" and "doctor and setup-validator report the live caveman state") `cpSync` the bundle root, including a developer's gitignored v2 `ai-workflow.toon`, which the strict v3 parser refused. In a clean checkout all 28 tests pass. Resolved because the local toon is now v3; the alternative was a `cpSync` skip filter.

## Audit and review chronology

One Orca cycle (2026-10-17, Run run_cd8ca4ec5029, coordinator claude) on a scratch copy of 26 files with read-only guards: code (codex gpt-6.1-sol, high), security (opencode; launch-time model selection is unsupported by this OpenCode TUI, so its configured default ran) and test (codex gpt-6-luna, high), all independent. UX, i18n, eval and cross-pitch were not applicable. The planted canary widened the `convertV2` version regex from `2` to `[0-9]`; all three reviewers caught it, and their P1 and medium findings that `convertV2` accepted versions 0, 1, 3, 7 and 9 were the canary, not a defect (the shipped regex is `2` only and a test rejects those versions).

Should-fix, fixed with tests: S1 CRLF, trailing blanks and the version-line comment were not preserved; S2 `emitToon` dropped a custom models block. Acknowledged: A1 (above); A2 coverage gaps (empty or non-string `model`, non-object vendor or profile, quoted or duplicate `schemaVersion` in `convertV2`), deferred to cooldown; A3 no security findings beyond the canary after walking the checklist. The pitch directory and integrations docs were not in the scratch copy, so pitch and default-table parity was author-checked. Cycle 2 was author-run, not an independent review, with no re-dispatch because the patched surfaces are small and each has a direct behavior test. Orca bookkeeping: the three workers sent `worker_done`, two releases returned `retained` with terminals still open, and deliveries were acknowledged.

## Verification history

`pre-ship-verify` found no package.json or document verifier, so checks ran by hand. After the completion pass: config and migrator suites 134/134, doctor suite 56/56, full suite 1461/1464. After the audit patches: 137/137, doctor 56/56, full Node suite 1464/1470, setup-validator READY, graph clean. The 3 failures are in `runtime/upgrade.test.mts` and fail identically at HEAD (the old-install fixture has no toon, so the doctor mandatory check fails). No build, typecheck, lint or i18n command exists; Bun was not run.

## Historical limits

Open at ship: the `upgrade.test.mts` old-install fixture versus the mandatory toon (logged as a followup), coverage gaps A2, and OpenCode workers cannot be given an explicit model at launch. Review prompt hashes are recorded from this pitch on. Compare with later work (agent-model-sweep) before calling any item a current defect.

## Historical contradictions

- Stale tests after the bump: the log says 93 failed of 1288 passing; the linked issue title says 98.
- Counts evolve as recorded: 134/134 then 137/137 (config and migrator); full suite 1461/1464 then 1464/1470.
- The pitch described `effort` as an option for Codex profiles; the delivered validator accepts it for any vendor.
- The pitch said ship after workflow-v3-rollout; it shipped first.
- The ship record says `review-bench record-check` ok, while audit.md says record-check was not run and the prompt hash was not recorded, yet its reviewer record lists a prompt sha256 starting e99e27296b37. Not reconciled.
- The pitch's sketch lists model ids (such as claude-haiku-5-5 and gpt-6-astra) as defaults of that date; they are not current routing.
- Environment-fragility entries are marked "planned" fix in the log but "resolved" in their status lines.

Whole files left out of the ledger as process noise: the hill chart (single scope, done; it says the same as the shipped record). The pitch's bet-decision boxes were left unticked and its critique section says not applicable.

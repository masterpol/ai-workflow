# Source-review supplement: orca-engines-range

Prepared 2026-10-22 from verified recovery sources. No compact record exists for this pitch, so this file is the durable record of the 2026-10-16 small-batch release 2.26.0 (workflow-v3, pitch 3 of 5; depends on unified-toon-config). Results are historical evidence, not a new certification. Current behavior is owned by [orca-vendors](../../../ai-framework/integrations/orca-vendors.md); code lives in [semver-range](../../../ai-framework/scripts/runtime/semver-range.mts), [orca-preflight](../../../ai-framework/scripts/orca-preflight.mts), [config](../../../ai-framework/scripts/runtime/config.mts) and [config-migrate](../../../ai-framework/scripts/config-migrate.mts). Differences between the sources are listed under Historical contradictions and kept as recorded.

## Problem and design

Each Orca release forced a code edit to the supported-version constant in every project (two projects pinned 1.4.224, two 1.4.223). The owner wanted the accepted versions stated in config like `package.json` engines. `integrations.orca.engine` (written `engines.orca` in the original pitch) became an npm-style range. Accepted subset: exact, `^`, `~`, `>=`/`>`/`<=`/`<`, space as AND, `||`, `1.4.x`/`1.x`, and hyphen ranges. `parseRange` returns a model or an error with a character position; `satisfies(version, range)` returns a boolean. Default when the key is absent or empty: `>=1.4.224`, also shipped in the example TOON. An invalid range fails closed and is never silently replaced by the default. Knowledge applied: [parse untrusted values](../../knowledge/patterns/parse-untrusted-values-and-re-emit-them.md), [backtracking regex](../../knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md), [in-memory mutant](../../knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md) and [real-file check](../../knowledge/patterns/a-pitch-can-pass-its-own-tests-and-break-on-the-real-file.md).

## Scopes and behavior

- S1: pure `runtime/semver-range.mts` with zero imports and a hand-written linear scanner (input cap 256 characters, bounded parts, no leading zeros, no prerelease or build metadata); 2480 npm-semver fixture rows ([fixtures](../../../ai-framework/scripts/runtime/semver-range.fixtures.json)), 57 tests, 3 in-memory mutants caught.
- S2: preflight, launch gate and start hook read the range through one helper `engineRange(root, deps)` exported from `orca-preflight.mts`; a refusal names the range and the found version. `SUPPORTED_VERSION` stays exported as the default floor (the eval grader uses it).
- S3: config validation with a position, a doctor "Config validators" failure on a bad range, and the migrator and example default `>=1.4.224`.
- S4: `orca-vendors.md` and changelog 2.26.0.

## Upgrade note

A bare `engine: "1.4.224"` is now an exact pin and would block 1.4.225. Use `>=1.4.224` for the old "this or later" meaning. The doctor does not warn about a bare pin (deviation d3); the behavior is documented instead.

## Limits and no-gos

No network check for the latest Orca. No prerelease or build-metadata support (Orca ships plain x.y.z; tags like `1.5.0-beta.1` are rejected as versions and in ranges). The `engines.node` and `engines.bun` keys are reserved but not checked.

## Decisions and deviations

Hand-written parser, not a library (no npm dependencies in the bundle). Fixtures were generated once with npm `semver` outside the bundle and committed as JSON rows, so expected results never come from our own code. Deviations: d1 `config.mts` calls `parseRange` directly so the built-in check always runs (the optional registered-validator hook is unchanged); d2 an invalid range shows as `policy-malformed` at the gate and start because config validation runs first, with `engine-range-invalid` kept as defence in depth in `engineRange`, preflight, gate and start (the exact range error is in the doctor's Config validators detail); d3 no doctor warning for a bare pin; d4 the test helper engine text is now `">=1.4.224"` so TOON and legacy-file start decisions stay identical; d5 the migrator gained `SAFE_RANGE` because `scalar()` rejected `>` and `=` (a bare-version migrator default would otherwise silently block newer Orca). Planned risk mitigations: a ReDoS guard (a 100k-character hostile range and version each return in under 50 ms), one config load per decision with no network, and one shared helper so the three call sites cannot disagree. The plan chose to build in-session with no worker dispatch.

## Review chronology

One audit cycle (of two allowed): code-reviewer and security-reviewer (sonnet), test-coverage-checker (haiku), `independent: yes`, fresh agents in a scratch copy. A planted canary (preflight echoing the raw `appVersion`) was caught by all three and refuted against the repo (the real code echoes only a strict x.y.z); hostile-version tests were added. Fixed: diagnostics are printable ASCII only with a strict x.y.z found version (unreachable today, defence in depth); 320 more fixture rows and 4 unit tests (`compareVersions`, wildcard hyphen ends, the 6-digit boundary, error positions). The code reviewer's npm-parity differential run: 340 extra ranges by 21 versions, 0 mismatches. Acknowledged and logged: empty engine handling versus the `engineRange` default (policy-malformed blocks first); migrator `DEFAULT_ENGINE` duplicates `DEFAULT_ENGINE_RANGE` (for cooldown); `engine-range-invalid` branches are unreachable through config; `engineRange` uses the default floor if config is refused (TOCTOU only). The ux, i18n and eval reviewers did not apply and there was no cross-pitch conflict. The read-only guard could not separate a reviewer write from the author's own later fixes, so reviewers worked in the scratch copy.

## Historical verification

Node suite 1560 tests, 1558 pass, 0 fail, 2 skipped; setup-validator READY; graphify CLEAN; doctor READY WITH WARNINGS (1, an existing Runtime boundary test warning). The Bun suite was not run. The repo has no build, typecheck, lint or i18n command. Orca was requested and the start hook reported ready.

## Followups

The four acknowledged audit items (numbers 4 to 7) were appended to [followups](../../pitches/_followups.md); compare with later work before calling them current defects. A separate pre-existing blocker found in planning: the Orca `worker-list` output (about 265 KB) exceeds `MAX_OUTPUT_BYTES` (256 KiB) and blocks the start hook (`worker-identity-unavailable`); the suggested fix is paging with a smaller `--limit`, and that followup already existed.

## Historical contradictions

- Fixture rows and tests: the hill chart says 2160 rows and 53 tests (109 orca tests); the shipped record says 2480 and 57. The audit added 320 rows and 4 tests, so the figures are consistent in sequence, but the earlier ones are superseded.
- The plan said an invalid range gives a distinct `engine-range-invalid` reason; the shipped behavior shows `policy-malformed` (d2). The plan also expected `registerEngineValidator` and a doctor warning for a bare pin; neither happened (d1, d3).
- The pitch says `engines.orca`; the schema renamed it to `integrations.orca.engine` (banner d42).
- The shipped record says "0 must-fix against the repo" while the audit table lists a must-fix flagged by all three reviewers; that item was the refuted planted canary.
- The plan placed S4 doc edits near orca-vendors.md lines 35, 87 to 93 and 280; those line numbers are not current.

Whole files left out of the ledger: the hill chart (all scopes done; its counts are superseded) as process noise.

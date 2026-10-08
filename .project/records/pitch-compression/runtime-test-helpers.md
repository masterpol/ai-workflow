# Compaction record: runtime-test-helpers

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[keep-the-fakes-guarantee-the-thing-they-replace]], [[a-temp-helper-that-realpaths-silently-voids-an-alias-guard]], [[word-boundary-replacement-does-not-see-a-prefixed-property]].

## Section 1: SHIPPED.md#final-verification

Pilot, helper and invariants files: Node 70/70, Bun 65/65. Whole-repo Node run 986 total, 984 pass, 3 fail, all in files this pitch never touched and reproduced at HEAD with its adapter changes stashed: `browser-runtime.test.mts:137` needs the agent-browser CLI, `token-consumption.test.mts:860` misses a 5 s barrier under load, and `runtime.test.mts:337` asserted a stale `selectRuntime` contract. workflow-doctor READY (729 checks), setup-validator READY (22), graphify CLEAN, docs-links 0 broken. No secrets in the diff.

## Section 2: SHIPPED.md#reconciliation

S1 helper module `runtime/test-helpers.mts` (`createTestDeps`, `tempFixture`, `runScript`, `memoryFs`, `captureIo`) with its self-tests (13/13 on both runtimes). S2 in-memory pilot `docs-links.test.mts` (17/17). S3 real-fs pilot `graphify.test.mts` (15/15). S4 refactor of `orca-apply.test.mts` (20/20). Counts unchanged by the migration. `FsDeps.symlinkSync` added to the types and adapters. Release 2.16.1.

## Section 3: SHIPPED.md#audit

One cycle with four independent reviewers (code, security, test-coverage, cross-pitch): 3 must-fix, 5 should-fix, 5 acknowledged. Each must-fix was reproduced with a mutant before being closed. C1: `tmp(t, real=false)` returned an already-realpathed root, so the macOS /var alias guard was vacuous; fixed with `tempFixture(deps, files, { resolve })` and re-proved by mutating the production realpath. C2: `memoryFs.statSync` threw ENOENT for every symlink, contradicting its JSDoc; `links` became a link-to-target map and `statSync` follows a link whose target exists while `lstatSync` reports the link. C3/security M1: `tempFixture` accepted keys escaping the temp root via `../`; fixed with a `path.resolve` containment check.

## Section 4: SHIPPED.md#no-gos-honored

No test-framework swap (node:test and node:assert/strict retained; Bun supports them). No production script behavior change, no migration of tests that do not benefit, no runtime beyond Node and Bun, no new npm dependency. Helper self-tests grew 8 to 13.

## Section 5: SHIPPED.md#knowledge-extracted

Issue `a-temp-helper-that-realpaths-silently-voids-an-alias-guard`; patterns `keep-the-fakes-guarantee-the-thing-they-replace` and `word-boundary-replacement-does-not-see-a-prefixed-property`. Graph rebuilt, 41 entries.

## Section 6: SHIPPED.md#followups

`runScript`'s NODE_FLAGS branch is unexercised on Node 22.18+ and Bun (needs a CI entry on 22.14); untested `memoryFs` surface (`readdirEntriesSync`, `readBytesSync`, `Uint8Array`, empty fixtures); `CapturedDeps` widens the deps object with out/err.

## Section 7: SHIPPED.md#cross-pitch-note

Commit order blocker: `orca-apply.test.mts` already contained the S4 refactor (landed in fb38efd) while `runtime/test-helpers.mts` and its test were untracked, and workflow-usage-metrics imports the helpers and calls `deps.fs.symlinkSync`; the four runtime files must be committed as one unit and fb38efd must not be rewritten. `runScript` was taken over mid-ship by fix-workflow-runner-env, which centralized selection in `runtime/entry.mts::workflowInvocation`; the helper's self-test was rewritten to assert the selected executable. `runtime.test.mts:337` is a stale assertion from that pitch. Portability gap: `workflowInvocation` picks the bare name `node`/`bun` when the requested runner differs, so the child PATH must contain it.

## Section 8: pitch.md#no-gos

Migrating every existing test in one batch; abstracting node:test or node:assert themselves; adding a third test runner.

## Section 9: pitch.md#rabbit-holes

Resolved: test and assert imports stay node:* (Bun supports them); tests needing real OS features keep a real-filesystem path via `tempFixture`; runner selection for spawned scripts follows AI_WORKFLOW_RUNNER; the in-memory fs needs only the surface the function under test touches. Pushed to /plan as risk: pilots must prove the helper for both in-memory unit tests and real-dir integration tests.

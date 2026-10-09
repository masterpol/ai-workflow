# G7 baseline and verification

Measured 2026-10-07 with Node 24.21.0 and Bun 1.4.2. Fixtures and raw output are under `.project/analysis/ts-runtime-injection-g7/`. Commands execute the retained `.js` CLI names.

## Ownership

An external session replaced `bundle-sync.mts` during this group's work. The user assigned bundle-sync source and tests to that session. Its replacement was retained and subsequently validated read-only. This group owns workflow-doctor source/tests and this evidence. The original bundle-sync suite's fixture dependency-copy repair had already landed before that ownership change and was retained.

## Test counts

| Suite | Before Node | Before Bun | After Node | After Bun |
|---|---:|---:|---:|---:|
| bundle-sync | 15 pass / 2 fail (17 tests) | 15 pass / 2 fail (17 tests) | 17 pass / 0 fail | 17 pass / 0 fail |
| workflow-doctor injection/repair | No dedicated suite | No dedicated suite | 4 pass / 0 fail | 4 pass / 0 fail |
| Combined group | 17 tests | 17 tests | 21 pass / 0 fail | 21 pass / 0 fail |
| Existing old-install upgrade | Not rerun before editing | Not rerun before editing | 3 pass / 0 fail | 3 pass / 0 fail |

The two pre-existing bundle-sync failures expected `coverage-unresolved` and `incompatible` skill-sync reports, but got `error`: seedCommon copied migrated skill-sync.js without its typed implementation and runtime. The migrated fixture now copies the sibling implementations, runtime, and required catalog/package metadata, preserving its behavioral assertions.

Commands:

- `node --experimental-strip-types --test ai-framework/scripts/bundle-sync.test.mts ai-framework/scripts/workflow-doctor.test.mts`
- `bun test ai-framework/scripts/bundle-sync.test.mts ai-framework/scripts/workflow-doctor.test.mts`
- `node --experimental-strip-types --test ai-framework/scripts/runtime/upgrade.test.mts`
- `bun test ai-framework/scripts/runtime/upgrade.test.mts`

## Deterministic CLI parity

The bundle fixture contains a local source rule v2, target rule v1, no known base, and a source overview. It uses `bundle-sync.js --source <fixed-source> --json`. The doctor fixture has an empty templates/project directory and runs `workflow-doctor.js --json`; missing workflow artifacts intentionally yield exit 1. Doctor results are sorted by serialized record before hashing, since the documented implementation reports concurrent checks in completion order. No records or details are removed.

| Invocation | Exit before/after | stdout SHA-256 before/after |
|---|---:|---|
| Node bundle-sync | 0 / 0 | `8444affe7f3375772afb220ec674e442636801cc8a1aa124404ad91fb5c75575` |
| Bun bundle-sync | 0 / 0 | `8444affe7f3375772afb220ec674e442636801cc8a1aa124404ad91fb5c75575` |
| Node workflow-doctor, sorted JSON | 1 / 1 | `6156b07e43e47ae9679013424ee82a283c7c833a5ab1cc95085b16f2c3b53ee2` |
| Bun workflow-doctor, sorted JSON | 1 / 1 | `fd5930268c3bbd4f729f6c157a90be0fd9f825045d0cb6caeb9e29f6344bc371` |

All stderr is empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Node launching the same `.js` commands with `AI_WORKFLOW_RUNNER=bun` yields the Bun baseline exit codes and hashes. Node/Bun doctor hashes differ because the existing doctor explicitly reports Node parser and live OpenCode checks as skipped under Bun; that behavior is preserved.

## Mutation and static evidence

Temporarily replaced the doctor's `const present = await exists(absolute(typed))` guard with `const present = true`. The targeted `doctor rejects a dangling JS shim and checks a present typed source with the internal flag` test failed (0 pass / 1 fail), proving the missing-source safety check is asserted. Restored the guard; final suites pass on both runtimes.

Both retained CLI shims contain exactly `module.exports = require("./runtime/entry.js").load(__filename, module);`. No source runtime imports from `node:*`, ambient process use, `: any`, or `as any` occur in workflow-doctor.mts. The old bundle-sync.test.js is absent.

Doctor now discovers migrated test `.mts` siblings and validates typed shim sources with the internal Node type-stripping flag. Its real-checkout JSON report has zero blocking failures and empty stderr. Injected tests cover invocation isolation, dangling-shim refusal, parser flags, instance-file preservation during repair, and refusal to repair through a symlink ancestor.

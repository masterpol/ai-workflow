# S1 completion evidence — 2026-10-21

S1 delivers the read-only JSON preview CLI and typed pure joiner. Only four new implementation/test files changed. Run `run_3de93fe9dd4a`, worker `ctx_74ffcf24e87a`, authoritative completion `msg_a6a32bf81433` accepted through collectReport. Terminal released with captured archive. Coordinator independently inspected source and tests, fixed review findings, then reran exits.

## Current-session checks

Required command: `node ai-framework/scripts/run-tests.mts --runtime node ai-framework/scripts/flow-join.test.mts ai-framework/scripts/flow-report.test.mts` — exit 0 after coordinator fixes.

```text
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 282.088083
run-tests: partial (not full verification) files=2 runtime=node workers=default cache=off duration=0.314s exit=0
```

Coverage command: `node ai-framework/scripts/run-tests.mts --runtime node --coverage ai-framework/scripts/flow-join.test.mts ai-framework/scripts/flow-report.test.mts` — exit 0. Changed joiner: line 99.38%, branch 95.16%, functions 100%; CLI: line 100%, branch 89.47%, functions 100%. Dependency-wide coverage is not attributed to this scope. Full output: local `S1-node-coverage.log`.

Alternate command: `node ai-framework/scripts/run-tests.mts --runtime bun ai-framework/scripts/flow-join.test.mts ai-framework/scripts/flow-report.test.mts` — exit 0.

```text
 26 pass
 0 fail
Ran 26 tests across 2 files. [131.00ms]
run-tests: partial (not full verification) files=2 runtime=bun workers=default cache=off duration=0.140s exit=0
```

`node ai-framework/scripts/setup-validator.mts --no-color` — exit 0, 23 checks; 158 TypeScript files parse. `git diff --check` — exit 0. Baseline shared state/report tests passed 78/78 before implementation. Full suite is reserved for later build/audit verification; none of these partial runs claims full-suite completion.

## Independent checks beyond worker tests

A real CLI call over a stored-state oracle passes: two overlapping 80 ms scopes retain 100 ms pitch activity, unreported vendor tokens are null, differing capture windows remain explicit, input bytes are unchanged, and no generated file is created by preview. Another real CLI call confirms history credentials are scrubbed, unavailable audit counters are null and observed revisions are retained without modifying the history source.

In-memory mutations removing the history credential scrub or unavailable-audit mask are each detected by the corresponding check; original behavior passes. Local evidence: `S1-review-mutants.json`.

Live CLI preview exits 0 with tokens and usage observed, 8 pitch rows, 18 displayed leaf rows, none omitted, and provisional timing. Optional history is unsupported because this checkout's saved schema-1 state snapshot has no history section. No /state regeneration, inferred history or backfill was performed.

## Review fixes and boundaries

The worker's 24 tests passed before independent review. Coordinator regression checks reproduced a leaked credential-shaped history phase and unavailable audit counters, and caught dropped revisions/health metadata. Fixed within the same four files; added two behavior cases. Also reject duplicate history slugs and malformed status objects without unsafe coercion. Added explicit unjoinable/one-sided leaf counts and fixed lifecycle health counters.

S1 is 869 lines across four files, versus its 700-line estimate. Projection with S2's 500 and S3's 96 is 1,465, leaving 35 lines under the 1,500 cap. This is a risk estimate, not permission to exceed the appetite. Recheck before S2 expansion; split or revise if needed.

S1 intentionally rejects --apply and Markdown/HTML formats with usage exit 2. Those are S2. State linking and final full-suite verification remain S3.

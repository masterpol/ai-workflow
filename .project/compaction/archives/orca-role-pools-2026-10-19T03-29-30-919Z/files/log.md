# Log: orca-role-pools

## Incident — 2026-10-16 — full suite not green at HEAD before any role-pools edit
**Symptom**: `node --test` over `ai-framework/*.test.mts` = 99 fail at `df9683d`. **Root cause**: vendor-model-toon S1 (v3) left migrator + test fixtures on v2. **Fix**: see D1. After: 1574 pass / 3 fail / 1 flake.
**Remaining, not caused here**: `runtime/upgrade.test.mts` (3 tests) fails because the doctor in an upgraded temp project reports `Codex startup wiring`, README docs links and the mandatory `ai-workflow.toon` check — agent-model-sweep's doctor change; one `mutant-7-regexpBacktracking-quotedCommas` timing test fails only under full-suite load and passes alone.

## Incident — 2026-10-16 — concurrent session in the same checkout
Another session committed `0c2bb35` (agent-model-sweep S1) while this build ran and swept an uncommitted example-TOON edit into it. Mitigation: stage by explicit path, re-check `git status` right before each commit.

## S1 evidence — policy carries pools
`node --test orca-policy.test.mts` → 66 pass / 0 fail (7 new `pools:` tests). `grep -n "workers.length > 2" orca-policy.mts` → no output.
Consumers of `report().roles` (grep): `orca-start.mts:162` only (migrator hits are unrelated); fixed in S2.

## S2 evidence — start reads pools
`node --test orca-start.test.mts orca-run.test.mts` pass (3 new `pools:` tests: all members probed in pool order, missing 2nd member blocks, probe count = distinct members).

## S5–S7 evidence
- `orca-assign.test.mts` 9 pass (determinism x1000, 16-member spread, resume stability, review independence, rotation, in-memory mutants).
- `orca-dispatch.test.mts` + `orca-ledger.test.mts` + `orca-run.test.mts` 133 pass; mutants: overlap guard removed -> 2 fail, resume owner check removed -> 1 fail, rotation disabled -> 3 fail (all restored).
- Ledger schema unchanged: `RECORD_KEYS` and `SCHEMA_VERSION` asserted by a test.
- `orca-eval-grader.test.mts` 15 pass (new test: cap 16, 6 scopes pass; default cap 3 refuses the 4th).
- Full suite: 1608 pass / 4 fail / 3 skipped. Failures: 3 x `runtime/upgrade.test.mts` (agent-model-sweep doctor; pre-existing) + 1 load-flaky (`token-consumption` skill-use CLI test passes alone, 63/63).
- `setup-validator` READY, `graphify --check` clean, `workflow-doctor` READY WITH WARNINGS (1): pre-existing "Runtime boundary: tests" (207 node:* imports in test files); Bun not run.
- 2026-10-16 audit: local ai-workflow.toon vanished mid-audit (cause unknown, restored from the example template).

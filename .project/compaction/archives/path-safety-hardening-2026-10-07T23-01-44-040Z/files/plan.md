# Plan: Path safety hardening

**Pitch**: pitch.md  •  **Appetite**: small-batch  •  **Hill**: hill.md

**Approval**: User approved this plan with “Approve all” on 2026-09-26.

## Scope

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|---|---|---|---:|---|---|---|---|
| S1 | Guard managed and ledger writes | `skill-registry.js`, `add-skill.test.js`, `pitch-compress.js`, `pitch-compress.test.js` | ≤400 | — | — | no — shared write semantics need one coordinated change | — |

### S1 — Guard managed and ledger writes

- Re-check path ancestry at write time; reject swapped or symlinked managed destinations.
- Make `commitLedger` refuse symlinked `compaction`/`ledgers` paths and write atomically.
- Add deterministic tests for both refusals and verify targets remain untouched.
- `node --test ai-framework/scripts/add-skill.test.js ai-framework/scripts/pitch-compress.test.js` exits 0.
- `node --test ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-sync.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/pitch-archive.test.js ai-framework/scripts/state-snapshot.test.js` exits 0.
- Mutation check: weaken each new guard once; its focused test fails.

## Impact analysis

Direct: 2 implementation files, 2 tests. `skill-registry.js` also serves add-skill, skill-sync,
skill-vendors, browser-runtime, skill-defaults, pitch-archive, and state-snapshot; their regression
suites must pass. `pitch-compress.js` is consumed by pitch-archive and state-snapshot. Risk: medium.

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|---|---|---|---|
| Race test depends on timing | S1 | no | Add an injectable re-check boundary or deterministic ancestor swap fixture. |

## Parallel dispatch plan

Run S1 sequentially. Its four files share one write-safety contract.

# Plan: Bundle sync marker fix

**Pitch**: pitch.md  •  **Appetite**: small-batch  •  **Hill**: hill.md

**Approval**: User approved this plan with “Approve all” on 2026-09-26.

## Scope

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|---|---|---|---:|---|---|---|---|
| S1 | Record effective per-file base | `bundle-sync.js`, `bundle-sync.test.js` | ≤250 | — | — | no — comparison and marker semantics are one contract | — |

### S1 — Record effective per-file base

- Derive marker `files` from each comparison outcome, not a blanket current-source manifest.
- Preserve previous base for unverified, local, and conflict entries; use upstream digest only when applied.
- Cover an unverified file across two sync runs and assert it remains pending, plus local/conflict/prune cases.
- `node --test ai-framework/scripts/bundle-sync.test.js` exits 0.
- `node ai-framework/scripts/bundle-sync.js --help` exits 0.

## Impact analysis

Direct: 1 implementation file, 1 test. Downstream marker readers are `state-snapshot.js` and
state-snapshot tests; the public CLI contract in README remains unchanged. No new files. Risk: medium.

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|---|---|---|---|
| Pruned and removed files have no target digest | S1 | no | Specify per-status marker behavior in tests before implementation. |

## Parallel dispatch plan

Run S1 sequentially. Source comparison and next-marker writing must agree for every status.

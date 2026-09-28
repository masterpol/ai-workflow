# Plan: State quoted fonts

**Pitch**: pitch.md  •  **Appetite**: small-batch  •  **Hill**: hill.md

**Approval**: User approved this plan with “Approve all” on 2026-09-26.

## Scope

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|---|---|---|---:|---|---|---|---|
| S1 | Parse safe quoted and local-variable fonts | `state-theme.js`, `state-html.test.js`, `state-report.md` | ≤300 | — | — | no — discovery and renderer validation share grammar | — |

### S1 — Parse safe quoted and local-variable fonts

- Parse only bounded quoted family tokens and re-emit canonical safe font-family output.
- Resolve at most one same-file font custom property, with source-order/mode tests; reject cycles, cross-file references, nested variables, and hostile values.
- Keep `safeTheme` as the final grammar gate and update state-report documentation.
- `node --test ai-framework/scripts/state-html.test.js ai-framework/scripts/state-snapshot.test.js` exits 0.
- `node ai-framework/scripts/state-theme.js --help` exits 0 or the module loads with `node -e "require('./ai-framework/scripts/state-theme')"`.
- Mutation check: bypass font parser or permit an unsafe token; hostile-input test fails.

## Impact analysis

Direct: 1 implementation file, 1 test, 1 contract document. `state-render.js` consumes the
theme parser; `state-snapshot.test.js` validates report generation. No UI build exists. Risk: medium.

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|---|---|---|---|
| CSS declaration order and mode scope alter variable meaning | S1 | no | Define same-file, one-hop lookup with fixtures for precedence and rejection. |

## Parallel dispatch plan

Run S1 sequentially. Parsed output must match renderer-side validation exactly.

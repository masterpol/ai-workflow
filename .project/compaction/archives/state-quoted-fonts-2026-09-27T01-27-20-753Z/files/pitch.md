# Pitch: State quoted fonts

**Date**: 2026-09-26  •  **Appetite**: small-batch (≤3 files, ≤300 LOC)
**Stack**: Node.js state-report theming

## Problem

Projects using normal quoted font families or a local CSS font variable see state report fall back to its default typeface.

## Knowledge consulted

- `decisions/project-state-report-design` — quoted fonts and `var()` were deliberately rejected, with this followup recorded.
- `patterns/parse-untrusted-values-and-re-emit-them` — scanned CSS must be strictly parsed and re-emitted.
- `patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code` — project stylesheets are untrusted data.
- `ai-framework/rules/security.md` §9 — report CSS accepts only bounded, verified values.

## Solution sketch (breadboard, NOT wireframe)

**Places**: `state-theme.js` parser and renderer-side gate; `state-html.test.js`; state-report contract.

**Affordances**: accept a bounded quoted family token, normalize it into validated output, and resolve one same-file custom-property reference before font parsing.

**Connections**: stylesheet discovery collects declarations; a font value may resolve exactly one local custom property; parser emits only safe family names; `safeTheme` validates emitted result again. Tests cover quoted families, local variables, cycles, and hostile input.

## Rabbit holes

**Resolved here**:
- One-level, same-file resolution covers common design-token aliases and keeps traversal bounded.
- Quotes are parsed as syntax, never copied from a free-form CSS fragment.

**Pushed to /plan as risk**:
- Preserve source-order and light/dark mode precedence during variable lookup — owner: planner.

**Pushed to no-go**:
- General CSS evaluation, cross-file variables, color `var()`, or new color-space support.

## No-gos (this pitch)

- ✗ No weakening renderer-side validation or contrast checks.
- ✗ No external stylesheet loading.
- ✗ No changes to report facts or lifecycle records.

## Critique findings

Skipped: small-batch.

## Bet decision

☒ **Bet** (→ /plan)
☐ Re-shape — named gap: variable precedence contract
☐ Pass — moved to `.project/pitches/_parked/state-quoted-fonts/`; reason: {…}

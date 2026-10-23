# Pitch: package-less-ship-verification

**Date**: 2026-10-22  •  **Appetite**: small-batch
**Stack**: workflow tooling (TypeScript `.mts` hook script, `/ship` phase doc, tests)
**Origin**: cooldown candidate C6 (`runs/cooldown-2026-10-21-forced.md`), approved to become a pitch 2026-10-22. Draft: not yet shaped or bet.

## Problem

`/ship` runs `ai-framework/hooks/scripts/pre-ship-verify.mts`, which chooses its checks from a root `package.json`
(`verify:base` or recognised build/test scripts). This bundle has no `package.json`, so the mandatory wrapper exits 1 with no
project checks and `/ship` has been blocked on 4+ ships. Each time the owner approved a hand-run "direct-check gauntlet", and one
ship used a temporary `package.json` (not a fix). The same failure will hit every installed project that has no `package.json`.

## Knowledge consulted

- issues/`package-less-bundle-ship-wrapper-cannot-select-checks` — the recorded failure and constraint (no temporary package file).
- issues/`installed-skill-wrappers-ship-as-orphans` — fixes inside a new script do not help a project still running its old one.
- `_followups.md` entries "pre-ship-verify.mts route for a package-less bundle" (x2) and the 2026-10-21 candidate note.

## Solution sketch (breadboard)

**Places**: `pre-ship-verify.mts`; `.project/context/stack.md` (already lists the real commands); `4-ship.md` step 1.

**Affordances**: one documented check contract for projects without `package.json`, chosen between (a) a bundle-local check
manifest the verifier reads (TOON via `runtime/data-file.mts`, per `machine-data-format`) or (b) reading the "Commands" section of
`stack.md`. Verifier runs only direct executables from that contract (existing no-shell rule), keeps the diff-sanity step, and
reports "no checks configured" as a distinct non-pass state instead of an empty exit 1.

**Connections**: `/ship` → verifier → contract source → real commands → per-check results the ship record can cite.

## Rabbit holes

**Pushed to /shape**: manifest vs parsing `stack.md` prose (parsing prose is a trust problem); how an installed project with a
real `package.json` keeps its current behavior; how the owner-approved gauntlet fallback is recorded.

## No-gos (this pitch)

- ✗ No temporary or generated `package.json`.
- ✗ No weakening of existing required-check semantics for projects that have a `package.json`.
- ✗ No shell execution; no application-specific commands in this repo.

## Critique findings

(Empty until /critique runs.)

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — reason: {…}

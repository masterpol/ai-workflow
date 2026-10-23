# Pitch: orca-engines-range

**Date**: 2026-10-16  •  **Appetite**: small-batch
**Stack**: workflow-tooling (orca-preflight, doctor)
**Epic**: `workflow-v3` — pitch 3 of 5. Depends on `unified-toon-config` (reads `engines.orca`).

## Problem

Each Orca release forces a code edit to `SUPPORTED_VERSION` in every project (LAH and RN pinned 1.4.224,
climbing and base 1.4.223). The owner wants to state the accepted Orca versions in config, the same way
`package.json` states `engines`.

## Knowledge consulted

- [patterns/parse-untrusted-values-and-re-emit-them] — applies: parse the range against a strict grammar;
  reject unknown operators.
- [issues/backtracking-regex-over-untrusted-text-is-quadratic] — applies: no backtracking regex
  over the Orca-reported version or the range.
- climbing `e2c28a2` — applies: reject oversized or non-canonical runtime versions (bounded parts, no leading
  zeros).
- [patterns/prove-a-guard-test-with-an-in-memory-mutant] — applies to the comparator.

## Solution sketch (breadboard)

**Places**: `ai-framework/scripts/runtime/semver-range.mts` (new, pure); `orca-preflight.mts`; doctor;
`orca-vendors.md` docs.

**Affordances**:
- `engines.orca` accepts npm range syntax subset: exact `1.4.224`, `^1.4.223`, `~1.4.223`, `>=1.4.223`,
  `>1.4.223 <1.6.0` (space = AND), `a || b`, `1.4.x` / `1.x`, hyphen `1.4.223 - 1.5.0`.
- `satisfies(version, range)` → boolean; `parseRange` → model or error with position.
- Preflight: `runtime-version-unsupported` names the range and the found version.
- Default when key absent: `>=1.4.224` (current floor), shipped in the example TOON.
- Doctor: invalid range is a config error, not a silent fallback.

**Connections**: `ai-workflow.toon` → `loadConfig().engines.orca` → `parseRange` → preflight `satisfies` →
launch gate.

## Rabbit holes

**Resolved here**:
- Prerelease tags (`1.5.0-beta.1`) → rejected as Orca versions and in ranges this version; Orca ships plain
  x.y.z today.
- Library vs hand-written → hand-written (no npm deps in bundle). Small, table-tested against npm `semver`
  results captured as fixtures.

**Pushed to /plan as risk**:
- Fixture source: generate expected results once with npm `semver` outside the bundle and commit them.

**Pushed to no-go**:
- `engines.node` / `engines.bun` enforcement — key reserved, not checked.

## No-gos (this pitch)

- ✗ No network check for latest Orca.
- ✗ No prerelease/build-metadata support.

## Critique findings

Not required (small-batch, no AI-prompt scope).

## Bet decision

☐ **Bet** (→ /plan)
☐ Re-shape — named gap: {…}
☐ Pass — reason: {…}

> **Note (2026-10-16, unified-toon-config d42):** the TOON schema is now `schemaVersion: 2` with Orca nested under `integrations.orca` (`engine`, `enabled`, `multiAgent`, bounds, `coordinators.<vendor>.{workers,roles}`). References to `engines.orca` or top-level `orchestration` below mean `integrations.orca.engine` / `integrations.orca.*`.

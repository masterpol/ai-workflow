# Impact analysis — bounded phase wrappers

**Date:** 2026-10-18. **Risk:** HIGH (instruction behavior and validation ownership). **State:** analysis acknowledged by the user on 2026-10-18 with plan approval. Build start was subsequently approved; the approved S1 evidence amendment is recorded in baseline-review.md.

## Direct file boundary

The approved bet names 14 implementation paths: six canonical/Cursor wrappers, three phase owners, one existing contract test, one new owner-loading test, the existing golden dataset, and two version-history files. `ai-framework/integrations/orca-vendors.md` is the only optional fifteenth path. No schema, package, runtime, native adapter, hook or installed third-party skill changes are planned.

Measured planning inventory is saved in ignored `.project/metrics/instruction-compression/plan/inventory.json`, against HEAD `7b3bbad86b399c454004ec9b4f8bd93e5cf21b5d` plus the current dirty-file hashes. This is not a behavioral baseline.

| Modified surface | Downstream consumers | Checks affected | Scope / risk |
|------------------|----------------------|-----------------|--------------|
| `.claude/skills/build/SKILL.md` + Cursor copy | Codex `.agents/skills/build/SKILL.md`, OpenCode `.opencode/commands/build.md`, Claude native discovery, Cursor byte copy | `workflow-contracts.test.mts` A/E/M; `skill-defaults.test.mts`; workflow doctor | S1 / HIGH: direct entry, lite-card handling, evidence, gates and Orca dispatch |
| `.claude/skills/audit/SKILL.md` + Cursor copy | Equivalent audit adapters in all four vendors | Contracts A/I/L; unchanged mode/mirror checks | S2 / HIGH: required fan-out, read-only review, incomplete reports, cycle cap |
| `.claude/skills/ship/SKILL.md` + Cursor copy | Equivalent ship adapters in all four vendors | Contracts A/N; unchanged mode/mirror checks; pre-ship hook tests | S3 / HIGH: verification failures, reconciliation and closing gate |
| `workflow/phases/2-build.md`, `3-audit.md`, `4-ship.md` | Phase wrappers, native pointer adapters, reviewers and setup/synced projects | Contracts A/E/I/K/L/M/N, docs-link and installed-owner tests | Owning phase scope / HIGH: preserve the union of obligations before deleting copies |
| `scripts/workflow-contracts.test.mts` | Normal Node/Bun test suites and installed bundle checks | Literal sections and minimum Orca-block count currently bind tests to duplicate wording | S1–S3 / HIGH: replace location assumptions with non-vacuous owner/pointer assertions; keep all 14 contracts |
| New `scripts/instruction-loading.test.mts` | Node/Bun suites; copied by existing `bundle-sync` scripts allowlist | Owner/section/applicability, negative fixtures, explicit live-evidence mode | S1–S3 / HIGH: no production loader or new dependency; default tests must work without local eval records |
| Existing golden dataset under `.project/evals/datasets/` | Pitch-specific native-vendor runs and independent scoring | 31 cases, baseline/candidate evidence | S1–S3 / HIGH: not shipped by bundle-sync; never make installed checks depend on it |
| Optional `integrations/orca-vendors.md` | Enabled coordinator steps and their owner pointers | Orca contracts, docs links, byte/hash inventory | S1 only if clause inventory proves a real owner gap; otherwise leave unchanged |
| `VERSION`, `CHANGELOG.md` | Changelog checker and bundle consumers | `changelog.mts --check` | Each independently landed scope / LOW; use existing script |

This table lists consumer categories and concrete representative adapters; it does not claim an exhaustive numeric import count for prose instructions. There are no TypeScript production imports or re-exports to migrate.

## Existing assertions that cannot simply disappear

- Contract A extracts `orca-multi-agent` blocks and requires at least four blocks. Removing all three skill copies invalidates that location/count premise. The replacement must enumerate all six consumers and validate either the retained legacy obligation or the converted, explicit owner path/section/applicability. Missing files or empty extraction fail. A missing consumer cannot reduce the checked set.
- E/M assert build gate/lite-card wording inside both wrapper and phase owner; I/L require audit completion/loop sections locally; N expects ship cycle-cap wording in both files. Retire only each copied-location assertion, after proving its replacement fails for missing pointers, missing owners/sections and forbidden behavior. Preserve owner semantics and old conflict mutants.
- `skill-defaults.test.mts:256–285` and workflow doctor inspect literal caveman instructions/resolver commands. Keep the three banners byte-for-byte; no change to these validators is needed.
- The existing mirror test in `skill-defaults.test.mts` skips absent Cursor files. Retain the stricter presence assertions in `workflow-contracts.test.mts` and add missing-copy negative fixtures; equality alone is insufficient.

## Clause ownership inventory

| Wrapper requirements | Owner / load point | Planning disposition |
|----------------------|--------------------|----------------------|
| Invocation profile, raw arguments, optional caveman package/mode | Wrapper before phase work; `integrations/skill-defaults.md` for the resolution contract | Retain invocation mechanics and the current caveman banner unchanged |
| Context, standalone lite card, exit evidence, hill updates, three strikes, logs | `2-build.md`: “Per-scope inner loop”, “Verification-before-completion”, “Three-strike rule”, “Stuck-uphill detector”, “log.md and deviations.md discipline”, variant/output sections | Before first scope load the applicable sections; move any unique obligation before removal |
| Role-pool assignment, overlap, worker ownership, OpenCode preparation, collect/reconcile, switch outcomes | Existing `orca-vendors.md`: “Codex startup and coordinator preparation”, “Dispatch core”, “Reconcile core”, “CLI, grader and live-smoke status” | Short startup decision remains discoverable from the wrapper; load detailed owner sections only at enabled coordination steps; no blanket load when off |
| Gate applicability | Overview “Adaptive confirmation gate” | Load the phase's row(s) before the first gate decision; no wrapper-private matrix |
| Fan-out, finding evidence, verification, reviewer contract, incomplete reviews, synthesis, tiers, loops, AI evals, cross-pitch check | `3-audit.md`: corresponding named sections | Load applicable sections before dispatch/triage/advancement; no reviewer or incomplete-review obligation disappears |
| Final checks and failure routing, reconciliation, linked knowledge and rebuild, compacted status, followups, closure | `4-ship.md`: numbered Activities, output/confirmation/transition sections | Inventory `id`/tags/related-link and rebuild obligations explicitly; transfer any wrapper-only detail before deletion |

Do not use a transitive whole-file read as proof that a named requirement was loaded at the right point. Trace actual file/section reads during native-vendor runs.

## Boundaries and knowledge alerts

The generic app-layer map in `boundaries.md` does not describe this bundle; apply its dependency-direction principle to canonical owners → native adapters/mirrors. The sole new code file is a test beside the other `.mts` tests. Reuse runtime test helpers and typed records; no production import from a test, new package, `any`, shell interpolation or reading of secrets.

If the explicit evidence checker reads paths supplied by a report, bound input sizes and reject symlinks, nonregular files and paths outside the designated run directory. Use trusted test code and fixture roots, not commands embedded in reports (`rules/security.md`, “Scripts That Read or Write a Project Tree”).

Applicable recorded lessons: one owner per instruction topic; prove guards with intended-assertion mutants and a passing fixture baseline; never remove a validator without replacement; refresh Cursor copies in the same change; keep live-only evidence separate from structural checks. `.project/rules/` contains only its README, so no additional stack companion applies.

## Cross-pitch and distribution impact

`workflow-v3-rollout` consumes this bundle in other repositories, not the same canonical source files here. Pin its input revision; regenerate its dry-run if that input changes. Do not apply syncs or edit application repositories as part of this pitch. The new test is already inside the shipped scripts allowlist; existing integration/phase paths are also shipped. No allowlist edit is needed. Run installed-fixture loading without `.project/evals` or external packages to catch checkout-only dependencies.

## Size and recommendation

The three canonical wrappers currently contain 210 lines / 2,890 words total; their Cursor copies add 210 lines. The three phase owners contain 466 lines. Repository duplication is not a measured runtime saving.

The existing untracked golden dataset is 478 added lines and must count in cumulative implementation churn. A preliminary code-only estimate of 1,160 lines would exceed the 1,500 cap once that fixture is included. The draft therefore targets S1/S2/S3 churn of 480/240/180 lines (900), for a cumulative estimate of **1,378** including the fixture, leaving **122** lines of headroom. These are estimates, including additions and deletions and Cursor copies; measure actuals after every scope. The optional owner edit must fit that headroom. If preserving behavior cannot fit, split/defer a phase instead of weakening verification.

Implement in order: build plus shared proof infrastructure, audit, ship. Each scope can stand with the remaining wrappers in their old valid form. Shared contract-test ownership forbids concurrent writers. There are no UI, database, i18n or application-build surfaces. Their checks are not applicable; Node/Bun tests, content/link/integrity checks, live behavior and current-session evidence are applicable.

**User gate:** acknowledge this impact with the draft plan before finalizing it, as required by the impact skill. Approval does not execute the build or waive its start/per-scope/end gates.


Acknowledgment record — 2026-10-18: user reply “Appove” resolved the combined impact/plan gate. Analysis and mitigations are unchanged.

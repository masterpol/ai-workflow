---
slug: unified-toon-config
date: 2026-10-16
phase: plan
origin: pitch.md
appetite: big-batch (epic inside big-batch toolset — 13-scope decomposition owned here)
status: ready-for-build
---

# Plan: unified-toon-config

> **Caveman mode**: `full`. Apply throughout: drop articles/filler, fragments OK, short synonyms, no tool-call narration. Standard acronyms OK; do not invent abbreviations. Keep file paths, command names, error strings verbatim.

> **Pitch → plan bridge.** Pitch's "Pushed to /plan as risk" section is reproduced verbatim as the risks table below; pitch's Bet decision carries the 13-scope decomposition. Every scope inherits the X2 seam freeze + X12 diff criterion + branch-gate from the pitch. No re-justification; this plan operationalises what the pitch decided.

> **Build order is mandated, not derived.** a → c → b → d, eight steps a1 → a2 → a3 → c1.1 → c1.2 → c2.1 → c2.2 → c2.3 → c2.4 → b1 → b2 → b3 → d. /plan enforces this; /build may not reorder. Departures require Re-shape.

## Scopes (13)

| ID | Title | Files | LOC est | Deps | Parallel | Subagent? | Dispatch |
|-----|-------|-------|---------|------|----------|-----------|----------|
| **a1** | `config.mts` primitives: `wxRename`, `inspectPath`+`readBoundedFile` (port), `oexLock`, `errorCodes`, named-slot registrar | 7 | 1,171 | — | — | yes (deep) | `deep` — primitive correctness is load-bearing for every later scope |
| **a2** | `config.test.mts` parser-guard mutants (7) | 1 | 1,170 | a1 | — | yes (deep) | `deep` — mutant harness with fixed-text error code contracts |
| **a3** | Writer/path mutants (5) + alias-guard + subprocess revalidation + lock contention; extend `test-helpers.mts` | 3 | 780 | a1, a2 | — | yes (deep) | `deep` — fresh primitives + K2/K3-3 surface area |
| **c1.1** | runtime/orca reader glue (additive `loadConfig`+legacy) + rewire `orca-eval-grader.mts:108+:347` to `wxRename` | 10 | 375 | a3 | — | yes (standard) | `standard` — mechanical glue over typed reader |
| **c1.2** | Reader tests + grader no-race tests (both branches exercised) | 11 | 850 | c1.1 | — | yes (standard) | `standard` — test authoring on stable seam |
| **c2.1** | Doctor `Runtime boundary` validators + `setup-validator.mts` `Workflow config` check + 2 new doctor scripts | 4 | 500 | a1 | — | yes (standard) | `standard` — doctor integration is well-specified |
| **c2.2** | Root docs rewrite: `AGENTS.md`+`CLAUDE.md` byte-equal, `README.md` lines 65–68+94–95, `CHANGELOG.md`+`VERSION` | 6 | 120 | a1 | — | yes (fast) | `fast` — content + parity |
| **c2.3** | Framework docs + build SKILL mirrors; `.cursor` mirror refresh | 13 | 190 | a1 | c2.2 | yes (fast) | `fast` — pure content + mirror refresh |
| **c2.4** | Hooks cutover (`orca-start-hook.mts`+`orca-start-codex-hook.mts`); `token-consumption` legacy-window 1 minor | 2 | 240 | c1.1 | c2.1, c2.2, c2.3 | yes (standard) | `standard` — hook integration with bundle-sync host |
| **b1** | Migrator CLI prod (writer + dual-hash + 3-branch force, NO delete pass) | 1 | 625 | c1.1 | — | yes (standard) | `standard` — reuses `runtime/migrate.mts` primitives, well-specified |
| **b2** | Migrator functional tests | 2 | 560 | b1 | — | yes (standard) | `standard` — tests around defined behaviours |
| **b3** | Migrator guard proofs (5 writer/path mutants + dual-hash + lock contention + stale recovery + bundle-sync mutation-checked + Bun-adapter regression gate) | 3 | 825 | b1 | b2 | yes (deep) | `deep` — mutant contracts + cross-runner semantics |
| **d** | Legacy retirement: `env.mts` reader retire + 4 legacy paths unlinked under O_EXCL lock + `ai_workflow_env.example.json` relocated | 4 | 210 | all | — | yes (standard) | `standard` — deletion is bounded |

**Total**: 67 files / 7,616 LOC across 13 scopes; max scope 13 files / 1,171 LOC. /plan adopts `big-batch` template because every scope ≤ big-batch caps even though the work is recognisably an epic.

## Scope hard rules (carry from pitch)

1. **Order**: a1 → a2 → a3 → c1.1 → c1.2 → c2.1 → c2.2 → c2.3 → c2.4 → b1 → b2 → b3 → d.
   Hard rule: **no scope deletes a legacy file** until `d` lands. `(b)`'s delete pass is the
   only code that can cause pass-2's live-drop; extracting it to `d` lets `(a)` go first safely.
2. **Branch-gate** (X1 + X16): branch from 2.23.0 release tag (verified by `git tag`); branch
   only after `git status --porcelain` is empty against the 4 dirty code files S9 must commit
   (`orca-preflight.test.mts`, `runtime/node.mts`, `runtime/runtime.test.mts`,
   `skill-defaults.test.mts`). Branch never from `feat/upstream-project-drift`.
3. **Reader seam freeze** (X2 pass 3): both `roles` shapes are frozen by name. `readPolicy()`
   signature frozen; `readPolicy().report().roles` frozen at `Record<string,string>`;
   `PolicyResult.policy.coordinators.<v>.roles` is pitch-4-widenable.
4. **Diff criterion restated** (X12 pass 3): `git diff --name-only` after the (a)+(c1) scope
   suite lands lists no `orca-*.mts` EXCEPT (`orca-policy.mts` + 7 fixture tests +
   `orca-preflight.test.mts:338-341` filter + `orca-launch-gate.mts:13` doc line).
5. **No scope pins raw `node:fs`** (X-B pass 3) — `memoryFs(files, links)` mutant proofs
   depend on `deps.fs` injection. Do pin a ~15 LOC regression gate asserting the Bun adapter
   never overrides `writeFileSync`.
6. **No scope adds a `--validate-absent` flag** (X8 pass 3 + K2-2) — a missing artifact is
   evidence, not a contract. Pitch-5's gating on `--json` `results[]` by `name`+`status` is
   the contract.
7. **Doctor's kept-complete script list** (X11 pass 3 + K6-2) gains 2 new scripts in c2.1:
   config validity + config-migrate. The list edit happens in c2.1 only; other scopes don't
   edit the list.

## Scope exit criteria (machine-checkable, strict rule)

Every scope below MUST satisfy its check commands before it is marked `done` on the hill. UI
scopes use the real test command for the changed surface; backend scopes use the relevant test
suite. AI-prompt scopes are not present (this pitch is not AI-prompt — `eval-regression-projector`
was correctly skipped during critiques).

### a1 — Primitives

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/runtime/config.test.mts` exit 0 (placeholder — populated in a2)
- `grep -nE "registerIntegrationValidator|registerEngineValidator|registerCoordinatorValidator|errorCodes|oexLock|wxRename|inspectPath|readBoundedFile" ai-framework/scripts/runtime/config.mts` returns ≥8 distinct exports
- Diff check: `git diff --name-only` lists no edits outside `config.mts` + `oex-lock.mts` +
  example TOON + decision record + `runtime/migrate.mts` (reused primitives)
- Forbidden: `wxRename` not calling `wx` against an in-memory filesystem with `memoryFs` not
  configured; `oexLock` not using `flock`; `inspectPath` not using `lstatSync` (must use
  `realpathSync` + dev/ino capture per `orca-policy.mts:62-99`)

### a2 — Parser mutants

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/runtime/config.test.mts` exit 0
- `grep -c "^mutant" ai-framework/scripts/runtime/config.test.mts` ≥ 7
- Each mutant file in `runtime/test-helpers.mts` `memoryFs(files, links)` has a matching
  passing baseline in the same fixture layout (test harness assertion — not exit code)

### a3 — Writer/path mutants + alias + subprocess

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/runtime/config.test.mts` exit 0
- 5 writer/path mutants present + 9 `tempFixture` audit call sites with `{ resolve: false }`
  in alias tests + K2-3 subprocess revalidation test + lock contention + stale recovery
- `tempFixture` users grep: `grep -rln "tempFixture" ai-framework/scripts/**/*.{mts,test.mts}`
  lists all 9 file locations with at least one `tempFixture({ resolve: false })` call OR a
  same-form comparison helper

### c1.1 — Reader glue + grader rewire

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/runtime/runtime.test.mts` exit 0
- `grep -L "loadConfig" ai-framework/scripts/{runtime/env,runtime/select,runtime/entry,
  orca-policy,orca-launch-gate}.mts` returns empty (all five use `loadConfig` somewhere)
- `grep -rln "wxRename\|wx.*rename" ai-framework/scripts/orca-eval-grader.mts` returns the file
  (grader rewired)

### c1.2 — Reader tests + grader no-race

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/orca-eval-grader.test.mts` exit 0
- `grep -rln "loadConfig\|legacyFallback" ai-framework/scripts/**/runtime.test.mts
  ai-framework/scripts/**/orca-*.test.mts` returns ≥11 files
- `orca-eval-grader.test.mts` "no-race" test present (one test name containing "no-race" or
  "concurrent")

### c2.1 — Doctor validators + setup-validator

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/workflow-doctor.test.mts` exit 0
- `grep -c "Runtime boundary\|registered\|registerIntegration\|registerEngine\|registerCoordinator"
  ai-framework/scripts/workflow-doctor.mts` ≥ 10
- `grep -A1 'name: "Workflow config"' ai-framework/scripts/setup-validator.mts` returns the
  new check block; status values include `info` and `fail`
- Doctor script list grep: `grep -E "config-validate|config-migrate" ai-framework/scripts/workflow-doctor.mts`
  lists both new scripts

### c2.2 — Root docs

- `git diff --name-only` for this scope lists only `AGENTS.md`, `CLAUDE.md`, `README.md`,
  `CHANGELOG.md`, `VERSION`, plus the c2.2 ledger row file (none — this is a docs scope, no new ledger file)
- `diff AGENTS.md CLAUDE.md` exit 0 (byte-equal content for the 2 config-source lines)
- `node ai-framework/scripts/docs-links.mts ai-framework/workflow ai-framework/docs
  ai-framework/integrations ai-framework/templates` exit 0 (X6 pass-3 exit)

### c2.3 — Framework docs + build SKILL mirrors

- `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply` exit 0 before commit
  (mirror refresh per K5 pass 2)
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/skill-defaults.test.mts` exit 0
- `grep -L ".claude/skills/build/SKILL.md\|.cursor/skills/build/SKILL.md"
  /dev/null` returns empty (the build SKILL mirror set is edited; `.agents/skills/build/SKILL.md`
  is the acknowledged-stub — NOT edited per A10)

### c2.4 — Hooks cutover

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/hooks/scripts/orca-start-hook.test.mts
  ai-framework/hooks/scripts/orca-start-codex-hook.test.mts` exit 0
- `grep -nE "config-migrate|loadConfig" ai-framework/hooks/scripts/orca-start-hook.mts
  ai-framework/hooks/scripts/orca-start-codex-hook.mts` returns at least one hit per file
- `grep -nE "modes\.json.*legacy-window\|legacy.*warning"
  ai-framework/hooks/scripts/token-consumption.mts` returns the X8 legacy-window note

### b1 — Migrator CLI

- `node ./ai-framework/scripts/config-migrate.mts --dry-run --root /path/to/test/project` exit 0
  (prints would-write TOON, no edits)
- `node ./ai-framework/scripts/config-migrate.mts --apply --root /path/to/test/project`
  exit 0 (writes TOON, backs up, refuses legacy delete because no `d` shipped yet)
- `grep -c "dual-hash\|canonical-bytes\|parsed-model"
  ai-framework/scripts/config-migrate.mts` ≥ 3
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/config-migrate.test.mts` exit 0

### b2 — Migrator functional tests

- 6 functional tests present (dry-run, apply, idempotent, 3-branch-force, dual-hash,
  `.rejected` move): `grep -c "^describe\b\|^test\b" ai-framework/scripts/config-migrate.test.mts`
  ≥ 6

### b3 — Migrator guard proofs + Bun-adapter gate

- 5 writer/path mutants + dual-hash test + lock contention test + stale-recovery test +
  bundle-sync mutation-checked test + old-version-sync test + ~15 LOC Bun-adapter regression
  gate present
- `grep -c "Bun adapter.*writeFileSync\|bun.*writeFileSync\|writeFileSync.*Bun"
  ai-framework/scripts/config-migrate.test.mts` ≥ 1

### d — Legacy retirement

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  ai-framework/scripts/runtime/upgrade.test.mts` exit 0
- `git ls-files | grep -E "^ai_workflow_env\.json$"` returns empty (root copy deleted)
- `git ls-files ai-framework/templates/` shows `ai_workflow_env.example.json` +
  `ai-workflow.example.toon` (relocated + new sibling)
- `grep -A1 "X11_no_remove" ai-framework/scripts/runtime/env.mts` returns the legacy-window
  removal note (env reader retired)

## Risks inherited from pitch (Pushed to /plan as risk)

| ID | Risk | Affected scope | Spike? | Mitigation |
|----|------|----------------|--------|------------|
| r-merge | `AI_WORKFLOW_ORCATION_MULTI_AGENT` + `use-orca-orchestration` AND → merge one switch this version, or keep both? Today both must be true. | c2.2 | no | Keep both keys; document the AND in `runtime/README.md`; defer merge to next minor. |
| r-tempfix | `runtime/test-helpers.mts` audit covers all 9 `tempFixture` callers in this pitch's reader-test set. | a3 | yes (small — 1h) | `tempFixture` audit + same-form-path helper + `{ resolve: false }` in 9 sites. |
| r-eng-bun | pitch 3's range parser registers via `registerEngineValidator("engines.orca", rangeFn)`. Pitch 3's Places names this call. | c2.1 (registration site) | no | C2.1's edit commits the slot table; pitch 3's `workflow-doctor.mts` line registers. |
| r-conc | `maxConcurrentWorkers` 1..16 default 3; `maxRetriesPerTask` ≥0 default 1; `workers` reserved. | a1 | no | a1 declares bounds; pitch 4 registers per-coordinator bounds under `coordinators.<vendor>` slot. |
| r-skill | `.claude/skills/build/SKILL.md` + `.cursor` mirrors are 3-pitch hotspot. | c2.3 | no | C2.3 edits config-source paragraph + mirrors only; pitch 4 appends; mirror set in c2.3 ledger row. |
| r-toon-spec | TOON spec drift; subset follows. | a1 + decision record | no | Pin spec version in `.project/decisions/toon-subset-grammar.md` (created in a1). |
| r-rename | Rename hygiene across 15+ files; bundle has no `tsc`. | c1.1, c2.x | no | Prefer language-level rename via tooling; placeholder-restore; run file tests immediately after. |
| r-fixture | `orca-preflight.test.mts:341` copy of `ai_workflow_env.example.json` from bundle root. | a1 | yes (small — 30 min) | Patch fixture to read from `templates/` post-relocation; coordinate with X16 dirty-file commit. |
| r-orch-bench | `orc-eval-grader.test.mts` fixture `maxConcurrentWorkers: 3` byte-stability with pitch 4. | c1.1 + b1 | no | C1.1 rewires grader to `wxRename`; leaves fixture values byte-identical; pitch 4 owns shape. Pitch ledger row: S5 exit `maxConcurrentWorkers: 3` stays true. |
| r-docs3 | docs 3-way merge with pitch 1 S8. | c2.3 | no | C2.3 edits config-source lines only; pitch 1's merged prose intact. Exit: `docs-links.mts` clean. |
| r-flag | `SETUP.md` + `README.md` added to `FLAGGED_FILES`. | c2.2 | no | Mechanical flag-only edit in c2.2; pitch 5 doesn't need per-project reconcile. |
| r-cfg-severity | `setup-validator.mts` severity contract. | c2.1 | no | Name check `Workflow config`; absent = `info`, invalid = `fail`; pitch 5 asserts on `--json` `results[]` by `name`+`status`. Do NOT add `--validate-absent`. |
| r-build-mirror | `build/SKILL.md` 3-pitch hotspot. | c2.3 | no | C2.3 edits config-source paragraph + mirrors; pitch 4 appends. |
| r-branch | Branch-gate = `git status --porcelain` empty against 4 dirty files. | pre-a1 (gate) | yes (verify gate before a1 starts) | Verifier runs `git status --porcelain` check; blocks a1 if any of the 4 dirty names appears. |
| r-temp-fix-twosided | `tempFixture` alias tests must pass `{ resolve: false }` AND build expected paths from same form code returns. | a3 | yes (K3-3 — covered in a3 spike) | Same audit + same-form helper extension. |
| r-memsfs | `memoryFs(files, links)` link map required for the TOON fixture writer. | a3 | no | K1 pass 3 mutant harness requires this; a3 implements. |
| r-14guards | Mutant harness covers 14 discrete guards, not 6. Per-guard: passing baseline + assertion-message inspection + `errorCodes.foo` contract. | a2 + a3 + b3 | no (scope-defined) | Each mutant in a2 (7) + a3 (5) + b3 (5 writer/path) for unique guards; combined coverage. |
| r-subproc | Subprocess revalidation required for migrator `--apply`. | b3 | no | K2-3 — fresh Node/Bun subprocess re-parses; not running `require` cache. |
| r-lock-port | Lock primitive = O_EXCL lockfile (the one `orca-apply.mts:264` uses). NOT flock. | a1 | no | a1 ships `oexLock`; `flock` rejected for zero precedent in portable bundle. |
| r-wx-port | `wxRename` primitive ports from `orca-apply.mts:264` (`deps.fs.writeFileSync` + `renameSync`). | a1 | no | a1 ships the primitive; no re-derivation. |
| r-orca-policy-pin | Real guard lives at `orca-policy.mts:62-99` (`inspectPath` lstat-walk + `O_NOFOLLOW` + dev/ino pin). Port verbatim. | a1 | yes (read the source, port verbatim — 30 min) | a1 imports or ports the 30-line helper. No re-derivation. |
| r-rtmigratereuse | `runtime/migrate.mts:15 regular()` + `:7 EntryMigration` reuse. Do not invent second vocabulary. | b1 | no | b1 reuses both; doctor script list edit in c2.1. |
| r-flagrestoration | `(d)` legacy retirement scope reinstated — pass-1 override that dropped it created the ordering deadlock. | d | no | `d` absorbs the two orphans the override dropped (legacy reader retirement + orca-vendors.example.json content edit goes to pitch 4). |
| r-find-orca-launchgate | `orca-launch-gate.mts:13` doc line + `orca-preflight.test.mts:338-341` filter survive into c1+c2 (X12). | c1.1 + c1.2 | no | c1.1 rewrites `orca-preflight.test.mts` filename filter to look for `ai-workflow.toon` after c1.1 lands. `orca-launch-gate.mts:13` doc line rewritten to mention TOON. |

## Parallel dispatch plan

Sequential (root-first):
1. **a1** (deep) — primitives land first; no other scope reads `config.mts` exports before this
2. **a2** (deep) — parser mutants assert on a1's `errorCodes` contract
3. **a3** (deep) — writer mutants + alias + subprocess + `test-helpers` extension depends on a1+a2

Sequential dependencies within c-scope:
4. **c1.1** (standard) — readers consume a3's `wxRename`; grader rewire needs `wxRename`
5. **c1.2** (standard) — tests prove both branches return identical values
6. **c2.1** (standard) — doctor + setup-validator consume a1's `errorCodes` enum and the
   named-slot table; parallel with c2.2 / c2.3 / c2.4 once c1.1 has cut over
7. **c2.2** (fast) — root docs; parallel with c2.3 (independent file set)
8. **c2.3** (fast) — framework docs + build SKILL mirrors + cursor mirror refresh; parallel with
   c2.2
9. **c2.4** (standard) — hooks cutover; depends on c1.1; parallel with c2.1/c2.2/c2.3 if doc
   edits don't touch hook files (verified disjoint)

Sequential (b-scope depends on c-scope):
10. **b1** (standard) — migrator writer; needs the `loadConfig` path to exist (c1.1 confirms)
11. **b2** (standard) — functional tests around b1
12. **b3** (deep) — mutant proofs for migrator; depends on b1's export shape

Sequential (d-scope last):
13. **d** (standard) — legacy retirement; absorbs the delete pass + legacy reader retirement

**Parallel dispatch notes**:
- c2.2 ∥ c2.3 — disjoint file sets. c2.3's mirror refresh runs after both c2.2 and c2.3 commit.
- c2.4 reads from c1.1; safe to fan-out when c1.1's PR merges.
- b3 reads from b1's exports; serial within b-scope. b1 + b2 also serial.
- d blocks on every prior scope; only after full epic ships.

## Scope-by-scope subagent dispatch summary

13 of 13 scopes are subagent-dispatchable. Per "Sub-agent Dispatch" in
`ai-framework/integrations/harnesses.md`, picked each scope's own complexity:

- `deep` (5): a1, a2, a3, b3 — primitive correctness, mutant harness contracts, cross-runner
  semantics; load-bearing for later scopes.
- `standard` (6): c1.1, c1.2, c2.1, c2.4, b1, b2, d — mechanical glue, well-specified
  integrations.
- `fast` (2): c2.2, c2.3 — pure content + mirror refresh; trivial parity check.

`/build` running at this pitch's recommended `deep` does NOT propagate `deep` to scopes — each
scope's own complexity is the dispatch signal.

## Verification at /plan exit

- [x] 13 scopes defined; each with files / LOC / deps / parallel / subagent / dispatch model.
- [x] Every scope has ≥1 machine-checkable exit criterion.
- [x] No UI scope (no UI work in this pitch).
- [x] No AI-prompt scope (golden case absent — `eval-regression-projector` correctly skipped).
- [x] 25 risks inherited from pitch's "Pushed to /plan as risk" + per-scope additions.
- [x] Subagent dispatch decisions made per scope; 13 dispatchable (deep 5, standard 6, fast 2).
- [x] Parallel dispatch plan documented.
- [x] Hill chart (separate file) initialized at `uphill 0%` for all 13 scopes.

## Out of scope for /plan (deferred)

- The "TOON spec version pin" goes to a `.project/decisions/toon-subset-grammar.md` decision
  record created in a1. /plan names the file; a1 owns the content.
- The "open-code runtime" or "minimax-m3 / gpt-6.1-sol / gpt-6-astra" model selection for the
  `deep` subagent dispatch in scopes a1, a2, a3, b3 is left to the active harness per
  `ai-framework/integrations/harnesses.md`. /plan picks the capability profile; /build picks
  the concrete model.

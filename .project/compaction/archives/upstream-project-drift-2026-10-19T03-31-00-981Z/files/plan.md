# Plan: upstream-project-drift

**Pitch**: pitch.md  •  **Appetite**: big-batch (bet with critique A1 acknowledged: ~70 files, split into
independently shippable scopes)  •  **Hill**: hill.md  •  **Target**: 2.23.0

## Measured drift (2026-10-16, base HEAD `300fa80` + dirty `graphify.mts`)

Three-way classification of every base `ai-framework/` file against each project, using the per-file
sync-base digests in each project's `.project/.bundle-sync.json`:

| Project | project-edit (base unchanged) | both changed (3-way) | base newer (not drift) | project-only files |
|---|---|---|---|---|
| climbing-lab-monorepo | 63 | 11 | 0 | `README.md`, `SETUP.md` |
| RN | 62 | 18 | 1 | `rules/{README,react-native,mobile-performance-review,styling}.md`, `scripts/next-pitch{,.test}.mts` |
| LAH | 11 | 1 | 2 | `integrations/orca-vendors.json` |

Findings that change the pitch's inventory:
- **Climbing `8bd0c97` (OpenCode V2) is already in base** as `300fa80`. LAH/RN `opencode-plugin.test.mts` and LAH
  `graphify.test.mts` are older than base. Zero work.
- **RN drift is mostly a runner rewrite**: `node --experimental-strip-types …` → `bun`, `#!/usr/bin/env bun`,
  `select.mts` default runner `bun`. Project-local. The portable fix (runner-aware usage text and hook commands)
  belongs to `unified-toon-config`. Real RN improvements: Orca start hooks size caps, `stuck-uphill-detector`
  hardening, `hooks.json` missing `$CLAUDE_PROJECT_DIR` on the stuck-uphill command, `pre-ship-verify`
  package-manager allowlist and no-shell args, `next-pitch.mts` numbering feature.
- **LAH drift is only the Orca floor** (1.4.224 + loose `isSupportedVersion`), one `rules/testing.md` edit and the
  invalid `orca-vendors.json`.
- **Climbing carries the substantive fixes**: runtime child ownership (Bun spawning delegated to Node
  `child_process`, POSIX process-group exit proof, Linux `/proc` handling), Orca task ownership in
  ledger/reconcile/dispatch/evidence/apply/diff-admit/eval-grader, `pre-ship-verify` rewrite, setup-validator
  and doctor fixture isolation, graphify dangling edges, rules, templates and phase docs.
- No symlinks in any of the three `ai-framework/` trees. The ledger reads only `ai-framework/` and
  `.project/.bundle-sync.json`; no `.env`, `settings.local.json` or other secret-shaped file is opened (U2).

## Scopes

Shorthand: `NT` = `node --experimental-strip-types --disable-warning=ExperimentalWarning --test`;
`BT` = `bun test`; `GAUNTLET(r)` = move `ai_workflow_env.json` aside, then
`AI_WORKFLOW_RUNNER=r` run `NT` (r=node) or `BT` (r=bun) over
`ai-framework/scripts/*.test.mts ai-framework/scripts/runtime/*.test.mts ai-framework/hooks/scripts/*.test.mts`.

| ID | Name | Files (base) | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|--------------|---------|------------|---------------|-----------|----------------|
| S0 | Drift ledger | `.project/pitches/upstream-project-drift/drift-ledger.md` | ~250 (doc) | — | — | no — cross-repo judgment, coordinator reads three trees | — |
| S1 | Rules + graphify finish | `rules/coding-standards.md`, `rules/testing.md`, `rules/{context-management,model-routing,security}.md` (triage), `scripts/graphify.mts`, `scripts/graphify.test.mts` | ~200 | S0 | S6, S7, S8 | yes — disjoint files, clear tests; Orca worker | fast |
| S2 | Runtime child ownership | `scripts/runtime/{node,bun,types}.mts`, `runtime/{runtime,invariants,upgrade,validate,test-helpers}.test.mts` | ~550 | S0 | S1, S6, S8 | no — deep, platform-specific, every other test runs on it | — |
| S3 | Orca minimum version | `scripts/orca-preflight.mts`, `orca-launch-gate.mts`, `orca-start.mts` + 3 tests, `orca-run.test.mts`, `orca-dispatch.test.mts`, `orca-eval-grader.test.mts`, `hooks/scripts/orca-start{,-codex}-hook.test.mts`, `integrations/orca-vendors.md` (floor lines only) | ~250 | S2 | S6, S7, S8 | yes — bounded port + table tests | standard |
| S4 | Orca task ownership | `scripts/orca-{ledger,reconcile,run,dispatch,evidence}.mts` + 5 tests | ~750 | S3 | S6, S7, S8 | yes — self-contained, strong existing tests | deep |
| S5 | Orca apply / admit / grader | `scripts/orca-{apply,diff-admit,eval-grader}.mts` + 3 tests | ~220 | S4 | S6, S7, S8 | yes | standard |
| S6 | Hooks hardening | `hooks/scripts/{orca-start-hook,orca-start-codex-hook,stuck-uphill-detector,pre-ship-verify}.mts` + 4 tests, `hooks/hooks.json`, `hooks/scripts/{metrics-lock,token-consumption}.test.mts` | ~700 | S0 (S3 for the two orca-start tests) | S1, S2, S7, S8 | yes — hooks are leaf scripts | standard |
| S7 | Doctor / validator / skill tests | `scripts/setup-validator.mts` + test, `workflow-doctor.test.mts`, `skill-{defaults,sync,vendors}.test.mts`, `pitch-{archive,compress}.test.mts` | ~200 | S0, S2 | S1, S6, S8 | yes — test-heavy, small source change | standard |
| S8 | Templates + phase docs | `templates/project/{runs/README.md,pitches/_templates/plan.md,design/**,requirements/features/template.md}`, `workflow/{overview.md,phases/0-4}.md`, `integrations/harnesses.md`, `docs/{vendors,extending,setup,design-notes,workflow-doctor}.md` | ~400 (doc) | S0 | S1, S2, S6, S7 | yes — docs; each 3-way file merged by hand | fast |
| S10 | OpenCode port before first worker | `scripts/opencode-service.mts` + test (new), `scripts/orca-run.mts` (dispatch call), `scripts/orca-run.test.mts`, `integrations/orca-vendors.md`, `.claude/skills/build/SKILL.md` Orca block (+ vendor mirrors) | ~250 | S5 | — | no — process-killing code; coordinator | — |
| S9 | Release + sync proof | `CHANGELOG.md`, `VERSION`, `.project/pitches/_followups.md`, `drift-ledger.md` (results), regenerated `graphify-out/`, `.project/knowledge/index.md` | ~80 | S1-S8 | — | no — release gate | — |

Counts: ~33 source/test files in S1-S7, ~18 doc files in S8, 4 release files. Every scope is one commit and
leaves base green, so the epic can pause after any scope.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S0 — Drift ledger
- `test -f .project/pitches/upstream-project-drift/drift-ledger.md`
- Every differing or project-only file from the three-way classification has exactly one row. Row count ≥ 178 (climbing 76, RN 87, LAH 15):
  `grep -cE '^\| (climbing|RN|LAH) \|' drift-ledger.md` ≥ 178.
- Columns: project, file, 3-way status, origin commit (if known), classification
  (`upstream` / `project-local` / `drop` / `superseded-by-<pitch>` / `followup`), target scope (S1-S8 or —),
  expected post-sync status (`identical` / `local` / `conflict`), reason (S1, U7).
- `grep -c 'superseded-by-orca-role-pools' drift-ledger.md` ≥ 1 (LAH `orca-vendors.json`, X12).
- RN rules: one relocation recipe per file (restore base copy → move delta to `.project/rules/` → fix
  `AGENTS.md`/rules index), pointing to `workflow-v3-rollout` (S4).
- Notes which `bundle-sync` version wrote each project marker (all 2.22.5, written 2026-10-09) (U3).

### S1 — Rules + graphify finish
- `grep -q 'exhaustive' ai-framework/rules/coding-standards.md` (climbing `406ecc5`)
- `NT ai-framework/scripts/graphify.test.mts` exit 0 and `BT ai-framework/scripts/graphify.test.mts` exit 0
- `node ai-framework/scripts/graphify.mts check` exit 0 (dangling-edge overlay, `c376bda`)
- `git diff --stat` touches no file outside the S1 list.

### S2 — Runtime child ownership
- `AI_WORKFLOW_RUNNER=node NT ai-framework/scripts/runtime/*.test.mts` exit 0
- `AI_WORKFLOW_RUNNER=bun BT ai-framework/scripts/runtime/*.test.mts` exit 0
- `node ai-framework/scripts/workflow-doctor.mts` reports `Runtime boundary` with no failures.
- `grep -n 'process.env\|ai_workflow_env' ai-framework/scripts/runtime/{node,bun}.mts` shows no new
  config reads (X3: config read path belongs to `unified-toon-config`).
- `GAUNTLET(node)` and `GAUNTLET(bun)` pass counts ≥ the pre-scope baseline recorded in hill notes.

### S3 — Orca minimum version
- `isSupportedVersion` exported from `orca-preflight.mts`, using climbing's strict grammar (bounded parts, no
  leading zeros, exactly 3 parts) with floor `SUPPORTED_VERSION = "1.4.224"`.
- `grep -nE 'appVersion !== SUPPORTED_VERSION|=== SUPPORTED_VERSION' ai-framework/scripts/*.mts` returns nothing.
  Every exact-equality site (`orca-preflight:130`, `orca-launch-gate:130`, `orca-start:176`,
  `orca-eval-grader:121`) calls `isSupportedVersion`.
- `NT` and `BT` pass for `orca-preflight`, `orca-launch-gate`, `orca-start`, `orca-run`, `orca-dispatch`,
  `orca-eval-grader` tests and both `orca-start*-hook` tests.
- Table test covers: `1.4.223` rejected, `1.4.224`/`1.4.225`/`1.5.0`/`2.0.0` accepted, `01.4.224`, `1.4`,
  `1.4.224.1`, `1.4.224-beta`, a 400-digit part, non-string → rejected. Mutant proof: flipping the comparison
  fails ≥1 case.

### S4 — Orca task ownership
- `NT` and `BT` pass for `orca-{ledger,reconcile,run,dispatch,evidence}.test.mts`.
- Ledger/evidence on-disk schema: if climbing changed a field, `schemaVersion` handling is explicit and an
  old-schema fixture still reads (no silent drop).
- `orca-policy.mts` unchanged: `git diff --quiet HEAD -- ai-framework/scripts/orca-policy.mts` (X2).

### S5 — Orca apply / admit / grader
- `NT` and `BT` pass for `orca-{apply,diff-admit,eval-grader}.test.mts`.
- `orca-eval-grader` fixtures keep `maxConcurrentWorkers: 3` and single-role coordinators (pitch 4 owns change).

### S6 — Hooks hardening
- `NT` and `BT` pass for `orca-start-hook`, `orca-start-codex-hook`, `stuck-uphill-detector`,
  `pre-ship-verify`, `metrics-lock`, `token-consumption` tests.
- `grep -c 'CLAUDE_PROJECT_DIR/ai-framework/hooks/scripts/stuck-uphill-detector.mts' ai-framework/hooks/hooks.json` = 1.
- `grep -c '"bun ' ai-framework/hooks/hooks.json` = 0 (RN runner rewrite stays project-local).
- Tests prove: a 1 MiB ordinary prompt is accepted; phase args over 64 KiB are blocked; a symlinked
  `hill.md` or audit log is never followed; `packageManager: "evil; rm"` is refused and nothing runs through a
  shell.
- `pre-ship-verify.mts` merge: climbing rewrite is the base; RN's manager allowlist and argv-only execution
  are applied on top. Deviation note if they conflict.
- `node ai-framework/scripts/workflow-doctor.mts` hook-wiring checks pass.

### S7 — Doctor / validator / skill tests
- `NT` and `BT` pass for `setup-validator`, `workflow-doctor`, `skill-defaults`, `skill-sync`,
  `skill-vendors`, `pitch-archive`, `pitch-compress` tests.
- `grep -rnE 'climbing|/Users/|guaca|lasalle' <the 7 test files>` returns nothing (S2: no project paths).
- `node ai-framework/scripts/setup-validator.mts` exit 0 on base.

### S8 — Templates + phase docs
- `node ai-framework/scripts/docs-links.mts ai-framework/workflow ai-framework/docs ai-framework/integrations ai-framework/templates` exit 0 (no broken links).
- `grep -rn 'next-pitch' ai-framework/` returns nothing (RN numbering = followup, not ported).
- `grep -rnE '\bbun (ai-framework|test)' ai-framework/workflow ai-framework/docs` returns nothing new
  (runner-neutral text).
- Each 3-way doc (`harnesses.md`, `overview.md`, `phases/0,3,4`) has a ledger note: what came from where.
- `NT ai-framework/scripts/skill-defaults.test.mts` exit 0 (mirror and doc-structure checks).

### S10 — OpenCode port before the first OpenCode worker (added 2026-10-16, D8)
- `NT` and `BT` pass for `opencode-service.test.mts` and `orca-run.test.mts`.
- Tests prove: no listener means no stop and no kill; a listener goes through `opencode service stop` first; a
  listener that is still present is killed only when its command is `opencode`; another program on the port is
  reported, never killed; the result reports the port as free only after a re-check; a missing `service.json` is a
  no-op.
- `orca-run.mts dispatch` with `vendor: "opencode"` calls it only when no other OpenCode attempt in the ledger is
  `claimed`, `launched` or `unknown-liveness`; tests cover both branches. Other vendors never call it.
- `grep -c 'opencode-service' ai-framework/integrations/orca-vendors.md .claude/skills/build/SKILL.md` ≥ 1 each;
  `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` reports no stale mirror.

### S9 — Release + sync proof
- `cat VERSION` = `2.23.0`; `grep -q '## 2.23.0' CHANGELOG.md`.
- `GAUNTLET(node)` exit 0 and `GAUNTLET(bun)` exit 0, `ai_workflow_env.json` moved aside both times.
- `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` reports no stale mirror.
- `node ai-framework/scripts/workflow-doctor.mts`, `setup-validator.mts`, `graphify.mts check` exit 0.
- Sync proof (S1, U1): copy each project to the scratchpad (`cp -R`, outside the repo), run the **new** base
  `bundle-sync.mts --json` dry run against each copy, and save the result next to the ledger. Every
  row matches its ledger "expected post-sync status". Also run the project's **own 2.22.5** `bundle-sync.mts` on
  the copy; record differences. No file under `../LAH`, `../RN`, `../climbing-lab-monorepo` changes:
  `git -C ../<p> status --porcelain` identical before and after.
- `_followups.md` gains: RN `next-pitch` numbering; runner-aware usage strings and hook commands (→
  `unified-toon-config`); OpenCode plugin hardening (U4) if not done; climbing Orca upgrade to 1.4.224 before
  rollout.

## Risks (inherited from pitch rabbit holes + critique)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Climbing runtime changes are Linux-specific (`/proc`, zombie leaders, hidepid); macOS cannot exercise them | S2 | yes | Run `runtime.test.mts` in a Linux container (`docker run --rm -v "$PWD":/w -w /w node:22`) once; if no container is available, record the gap in deviations and ship behind existing tests. |
| Bun spawning delegated to `node:child_process` changes Bun behavior for every script | S2 | no | Full `GAUNTLET(bun)` before and after; compare pass counts. |
| `pre-ship-verify` three-way merge (base 168 / climbing 231 / RN 186 lines) | S6 | no | Take climbing as base; apply RN's two guards; tests from both. |
| Ported tests pin floors (`1.4.223`) or project paths | S3, S7 | no | grep checks in exit criteria; update literals to 1.4.224. |
| Climbing ledger/evidence schema change breaks in-flight runs | S4 | no | Old-schema fixture test; note in CHANGELOG. |
| Changes in S3/S4 rewritten later by `orca-engines-range` / `orca-role-pools` | S3, S4 | no | Keep `isSupportedVersion` as the single seam (pitch 3 swaps its body); no policy-shape change (X2). Deviation from critique X1 recorded below. |
| Doc 3-way merges lose base text added after the projects synced | S8 | no | Ledger note per file; `docs-links` + skill-defaults doc-structure tests. |
| Climbing's ~115 recorded conflicts mean its markers carry old bases | S0, S9 | no | Expected-status column; dry-run proof from scratch copies. |
| Local `ai_workflow_env.json` changes which runner tests spawn | all | no | `GAUNTLET` moves it aside (known issue). |

## Parallel dispatch plan

- Orca is ready (coordinator `claude`; implementation `opencode`, review `codex`). Cap 3 concurrent workers.
- Wave 1: S0 by the coordinator (blocks everything).
- Wave 2: S2 by the coordinator; in parallel S1, S6 (minus the two orca-start tests), S8 via workers.
  Disjoint files.
- Wave 3: S3 (after S2), S7 (after S2) via workers; finish S6's two orca-start hook tests after S3.
- Wave 4: S4 then S5, sequential (shared ledger/evidence types), via workers.
- Wave 5: S9 by the coordinator.
- Each worker scope is reviewed by `codex` before the coordinator applies it. `CHANGELOG.md`/`VERSION` are
  touched only in S9 (X6).

## Wireframes

None (no UI).

## Living-spec deviations log

- **D1 (plan time, critique X1)**: S3 ports climbing's strict `isSupportedVersion` and rewires the four call
  sites now, instead of deferring to `orca-engines-range`. Reason: otherwise every Orca release keeps forcing
  hand edits until pitch 3 ships, which is the pain this epic exists to remove. Pitch 3 changes only the function
  body (floor constant → configured range); call sites stay.
- **D2 (plan time, critique X2)**: climbing's ledger/dispatch ownership fixes stay in this pitch (S4); only
  `orca-policy.mts` shape and grader fixtures are left to `orca-role-pools`.

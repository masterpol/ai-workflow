# Pitch: upstream-project-drift

**Date**: 2026-10-16  •  **Appetite**: big-batch
**Stack**: workflow-tooling (TypeScript runtime scripts, hooks, docs)
**Epic**: `workflow-v3` — pitch 1 of 5. Order: `upstream-project-drift` → `unified-toon-config` →
`orca-engines-range` → `orca-role-pools` → `workflow-v3-rollout`.

## Problem

The owner fixes the same workflow bugs by hand in LAH, RN and climbing-lab-monorepo, because each project
carries local edits to `ai-framework/` that never reached the base bundle. Every `bundle-sync` from 2.22.5
now reports conflicts instead of a clean update, so the projects drift further each week.

## Knowledge consulted

- [decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers] — constrains: instance data
  stays local, no silent override of instance customization; applies to every pitch in this epic.
- [decisions/effective-sync-bases-and-bounded-font-discovery] — constrains: sync bases record only verified or
  applied content; a back-port must not fake a base for files it did not apply.
- [issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check] — applies: back-ported skill or
  agent edits need the Cursor byte mirrors refreshed in the same change.
- [issues/a-local-workflow-env-file-changes-which-runner-path-tests-spawn] — applies: run the gauntlet with
  `AI_WORKFLOW_RUNNER=node` and `bun`; LAH and RN use `bun`, climbing uses `node`.
- [patterns/prove-a-guard-test-with-an-in-memory-mutant] — applies: back-ported guards (version parsing,
  oversized-version rejection) keep their mutant proof.

## Drift inventory (observed 2026-10-16, all projects synced from 2.22.5 on 2026-10-09)

| Project | Drift | Classification (proposed) |
|---|---|---|
| climbing | `ddf1b77` accept Orca ≥1.4.223, `e2c28a2` reject oversized/non-canonical versions | Upstream (superseded in shape by `orca-engines-range`; keep its strict version grammar) |
| climbing | `8bd0c97` OpenCode V2 token-consumption plugin compat | Upstream |
| climbing | `c376bda` graphify keeps graph consistent on dangling edges | Upstream (base already has an uncommitted 12-line partial port in `graphify.mts`) |
| climbing | `406ecc5` rules: unrepresentable invalid states, exhaustive switches | Upstream to `ai-framework/rules/coding-standards.md` |
| climbing | `60063cc` Linux runtime + full-suite regressions, `d6f624c` task ownership + migrated runtime, `088d6d1`/`3b88542` doctor fixtures | Upstream after review: diffs touch `orca-apply/diff-admit/dispatch/evidence/ledger/eval-grader` |
| climbing | `ai-framework/README.md`, `SETUP.md`, `.project/workflow-doctor.json` (`modelRouting: project`) | Project-local; config moves to TOON in pitch 2 |
| LAH | `bd40d5d` Orca 1.4.224 floor + `isSupportedVersion` (loose grammar) | Upstream as behavior; climbing's stricter grammar wins |
| LAH | `ai-framework/integrations/orca-vendors.json` (3 workers, `worker` role, cap 4) | Drop: current policy rejects it (`workers.length > 2`, exact role keys). Its intent is pitch 4 |
| RN | Orca 1.4.224, `orca-start-hook`, `orca-start-codex-hook`, `pre-ship-verify`, `stuck-uphill-detector`, `hooks.json` | Needs per-file triage in /plan: improvement vs RN-specific |
| RN | `ai-framework/rules/*.md` rewrites, `react-native.md`, `mobile-performance-review.md`, `rules/README.md` | Project-local (RN rewrote rule files). Must move to `.project/rules/` so sync stops conflicting |
| RN | `ai-framework/docs/*.md`, `integrations/*.md` differences | Triage: likely older/newer doc text, not features |

## Solution sketch (breadboard)

**Places**: the three project trees (read-only sources); base `ai-framework/`; base `CHANGELOG.md` + `VERSION`;
a drift ledger `.project/pitches/upstream-project-drift/drift-ledger.md`.

**Affordances**:
- Drift ledger row per differing file: origin project + commit, classification (upstream / project-local /
  drop / superseded-by-pitch-N), decision reason.
- Back-port: apply upstream rows to base with their tests; refresh Cursor mirrors; bump to 2.23.0.
- Project-local rows: document the right home (`.project/rules/`, TOON config) so the next sync is clean.
- Verify: `bundle-sync` dry-run from the new base against each project reports only project-local rows.

**Connections**: project diff → ledger row → base commit (upstream) or relocation note (project-local) →
dry-run proof per project.

## Rabbit holes

**Resolved here**:
- Two different `isSupportedVersion` grammars (LAH loose `\d+(\.\d+)*`, climbing strict 3-part bounded) →
  take climbing's strict grammar now; pitch 3 replaces the floor with a package.json range.
- LAH `orca-vendors.json` → drop; not read by any script and invalid under current policy.
- Base uncommitted graphify edit → treat as the start of the `c376bda` port; finish it here, not separately.
- Orca floor for 2.23.0 → **1.4.224** (owner, 2026-10-16). Climbing must upgrade Orca before it syncs.
  Base still checks one exact version; pitch 3 makes it a configurable range.

**Pushed to /plan as risk** (owner: planner):
- RN hook/script diffs: improvement or RN-only? Needs a per-file read before classifying.
- climbing `orca-*` diffs are large; plan must split them into reviewable scopes and confirm each has a test.
- Appetite: source + tests may exceed 15 files. If so, split by origin (orca vs non-orca) before /build.

**Pushed to no-go**:
- Re-syncing the three projects → `workflow-v3-rollout`.

## No-gos (this pitch)

- ✗ No config-format change (pitch 2), no version-range parser (pitch 3), no role pools (pitch 4).
- ✗ No edits inside LAH/RN/climbing; they are read-only sources here.
- ✗ No wholesale copy of a project's file over base without a ledger row and reason.
- ✗ Standing workflow-tooling no-gos apply.

## Critique findings

Run 2026-10-16: knowledge-historian (U), skeptic (S), appetite-auditor (A), cross-pitch-projector (X).
Duplicates merged; full reports summarized.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| A1 | appetite-auditor | high | scope-overrun | Projected ~69 files (21 src / 28 test / 20 doc), ~1.8k net / ~2.5k gross LOC. Climbing runtime/orca commits alone = 30 files. Origin split insufficient (non-orca still ~29). Split into P1a orca version+ledger/reconcile (14), P1b orca exec (10), P1c runtime+doctor (10), P1d hooks (9), P1e rules+graphify+bump (5). |
| A2 | appetite-auditor | medium | inventory-gap | Unlisted drift: climbing `pre-ship-verify` (+63/+181 test), `orca-reconcile` (+79), `setup-validator` (+21), climbing rules rewrites (`context-management` −86 etc.), climbing docs, LAH `rules/testing.md`, RN-only `scripts/next-pitch.mts`. `8bd0c97` (OpenCode V2) may already be in base: verify. |
| X1 | cross-pitch-projector | high | cross-pitch-conflict | Base has no `isSupportedVersion` (exact equality at `orca-preflight:130`, `orca-launch-gate:130`, `orca-start:176`, `orca-eval-grader:121`). Back-porting it writes code pitch 3 replaces. Keep only climbing `e2c28a2` strict-version parser as a pure helper; call-site change goes to `orca-engines-range`. |
| S3 | skeptic | high | rabbit-hole | Floor conflict (LAH/RN 1.4.224 vs climbing/base 1.4.223) unresolved; ripples into ~8 test literals. Pick one floor for 2.23.0. |
| X2 | cross-pitch-projector | high | cross-pitch-conflict | Climbing dispatch/ledger/evidence/eval-grader changes overlap `orca-role-pools`. Policy-shape or ledger-schema changes in pitch 1 = rework. Fixtures pinning 3-worker/single-role shapes move to pitch 4. |
| X3 | cross-pitch-projector | high | cross-pitch-conflict | Pitch 1 must not touch config read paths (`runtime/env.mts`, `select.mts` env precedence, token-consumption config read) that `unified-toon-config` rewires. Platform/process logic only. |
| S1 | skeptic | high | rabbit-hole | Back-port does not make next sync clean: projects' `.bundle-sync.json` base digests are still 2.22.5, so local==upstream≠base still reads local/conflict until `--apply`. Ledger needs per-row expected sync status; dry-run from scratch copies (no-go forbids project edits). |
| U1 | knowledge-historian | high | missed-knowledge | `issues/installed-skill-wrappers-ship-as-orphans`: projects run their old 2.22.5 `bundle-sync`. The verify step must name which script runs. |
| S2 | skeptic | high | rabbit-hole | Ported tests carry project paths/fixtures and floor literals. Grep each test before porting; run ported tests in temp dirs. |
| U2 | knowledge-historian | high | missed-knowledge | Reading three external trees: skip secret-shaped files (`.env`, `settings.local.json`) before open/hash (`issues/review-guard-hashes-ignored-secret-files`, `patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code`). |
| U5 | knowledge-historian | medium | missed-knowledge | `_followups.md` commit-order blocker: `runtime/test-helpers.mts` untracked in base while HEAD imports it. Climbing runtime commits import it. Clear before /build. |
| U4 | knowledge-historian | medium | missed-knowledge | OpenCode plugin hardening followup (null args, unbounded session maps, `undefined` sessionID) touches same file as `8bd0c97`. Include or sequence. |
| S4 | skeptic | medium | rabbit-hole | RN rule relocation: `ai-framework/rules` is a synced dir; deleting local copies makes sync recreate them. Ledger needs a relocation recipe per file (restore base copy, move delta to `.project/rules/`, fix indexes). |
| U3 | knowledge-historian | medium | missed-knowledge | Pre-marker-fix `.bundle-sync.json` files misclassify unapplied upstream as `local`; confirm which bundle-sync wrote each marker. |
| U6/U7 | knowledge-historian | medium | missed-knowledge | Symlink refusal both sides (`patterns/sync-tools-refuse-symlinks-in-source-and-destination`); drop/relocate rows need recorded decision (`issues/a-missing-tracked-file-is-not-an-undeleted-deletion`); climbing doctor fixtures need own proof (no `workflow-doctor` test file). |
| S5/X6 | skeptic, cross-pitch | medium | rabbit-hole | Release obligations: hooks.json + per-vendor hook configs, CHANGELOG Unreleased section, bump only at ship in epic order, gauntlet under node and bun with env file removed. |
| X7/X8/X9 | cross-pitch-projector | medium | cross-pitch-conflict | Defer RN `orca-start-*` hooks to pitch 3; exclude `orca-vendors.md` from doc back-port; keep out of skill files. |
| X10/X11/X12 | cross-pitch-projector | ack | sequencing | Commit or discard base dirty graphify tree first; land `406ecc5` rules first; mark LAH `orca-vendors.json` `superseded-by-pitch-4`, not plain drop. |

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-16, owner.
☐ Re-shape
☐ Pass

**Critique acknowledged, not addressed in shape:**
- A1 scope-overrun (~69 files vs 15): owner bet as one pitch. /plan must split it into ordered scopes along
  the auditor's P1a-P1e lines (or tighter) and treat each as an independently shippable unit.
- All other high findings (X1, X2, X3, S1, S2, S3, U1, U2) pass to /plan as mandatory plan inputs. S3 is
  resolved above (floor 1.4.224). X2: the cross-pitch reviewer proposed deferring climbing's dispatch/ledger
  fixes to pitch 4. Shaper disagrees: pitch 1 lands first, so those correctness fixes stay here. Only the
  version check (X1) and policy-shape/fixture changes go to pitches 3 and 4.

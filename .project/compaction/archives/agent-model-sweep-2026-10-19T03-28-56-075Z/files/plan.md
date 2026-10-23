# Plan: agent-model-sweep (Bet 2 — Canonical sweep)

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md
**Precondition**: Bet 1 shipped (`f5b3eb0`). Doctor reads the toon `models` block. Mandatory toon check fires.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Canonical agent frontmatter sweep | 16 × `.claude/agents/*.md` | ~32 | — | — | no — mechanical frontmatter edits; handoff cost exceeds value and the byte-identity commit must be atomic | standard |
| S2 | Cursor mirror regen | 16 × `.cursor/agents/*.md` | 0 (generated) | S1 (same commit) | S1 (immediately after edits) | no — scripted + manual copy | fast |
| S3 | OpenCode top-level model config | `.opencode/opencode.json` | ~3 | S1 | S4, S5, S6 | no — single config file | fast |
| S4 | Doctor legacy-prefix cleanup | `ai-framework/scripts/workflow-doctor.mts` | ~15 | S1 | S3, S6 | no — single-file logic change with clear test surface | standard |
| S5 | Tests and pre-flight invariant | `ai-framework/scripts/workflow-doctor.test.mts`, new invariant test | ~80 | S1, S4 | S3, S6 | no — test design must stay coupled to the exact code contract | standard |
| S6 | Doc sweep | `ai-framework/docs/extending.md`, `ai-framework/docs/vendors.md`, `ai-framework/integrations/harnesses.md`, `ai-framework/rules/model-routing.md` (± `SETUP.md`/`README.md`) | ~30 | S1 | S3, S4, S5 | no — small independent writing scope | standard |
| S7 | Release record | `CHANGELOG.md`, `VERSION`, `.project/pitches/agent-model-sweep/SHIPPED.md` | ~10 | S1–S6 | — | no — bookkeeping | fast |

### S1 profile mapping (from `ai-framework/integrations/harnesses.md` Role Profiles)

- `fast`: appetite-auditor, code-reviewer, cross-pitch-conflict-checker, cross-pitch-projector, eval-runner, i18n-checker, knowledge-historian, refactor-cleaner, test-coverage-checker
- `standard`: build-error-resolver, eval-regression-projector, security-reviewer, skeptic, ux-reviewer
- `deep`: architect, planner

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S1 — Canonical agent frontmatter sweep
- Every canonical agent has `profile:` and no `model:`:
  ```sh
  for f in .claude/agents/*.md; do grep -qE '^profile: (fast|standard|deep)$' "$f" || exit 1; done
  ! grep -l '^model:' .claude/agents/*.md
  ```
- `node ai-framework/scripts/workflow-doctor.mts --json` → `fail: 0` (doctor still derives profile from the new `profile:` key; Cursor byte-identity is not a doctor gate).

### S2 — Cursor mirror regen
- `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --root .` → `differs` empty and `current == 16`.
- `node --test ai-framework/scripts/skill-defaults.test.mts` passes (byte-identity test).
- Pairwise byte check: `for f in .claude/agents/*.md; do cmp -s "$f" "${f/.claude/.cursor}" || exit 1; done`.

### S3 — OpenCode top-level model config
- `.opencode/opencode.json` is valid JSON and has top-level `model` set to `models.opencode.deep.model`:
  ```sh
  python3 -m json.tool .opencode/opencode.json >/dev/null
  node --experimental-strip-types --disable-warning=ExperimentalWarning \
    -e 'import("./ai-framework/scripts/runtime/config.mts").then(m=>m.loadConfig(".").then(c=>{ if(c.models.opencode.deep.model!=="opencode-go/kimi-k2.7-code") throw new Error("deep model mismatch"); console.log("ok"); }))'
  ```
- No `agent.build.model` override remains: `! grep -q '"build"' .opencode/opencode.json`.

### S4 — Doctor legacy-prefix cleanup
- `node --check ai-framework/scripts/workflow-doctor.mts` exit 0.
- Legacy fallback removed: `! grep -q 'agentProfileByModelPrefix' ai-framework/scripts/workflow-doctor.mts`.
- Doctor still reports 0 fails after the code change (gated by S5 tests).

### S5 — Tests and pre-flight invariant
- `node --test ai-framework/scripts/workflow-doctor.test.mts` passes with the updated mutant coverage.
- New invariant test passes:
  - every `.claude/agents/*.md` has `profile:` frontmatter and no `model:` line
  - frontmatter parses as YAML
  - `profile:` value is in `fast | standard | deep`
- Full relevant suite green: `node --test ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/skill-defaults.test.mts`.

### S6 — Doc sweep
- Stale `model:`-as-single-declaration language removed from:
  - `ai-framework/docs/extending.md`
  - `ai-framework/docs/vendors.md`
  - `ai-framework/integrations/harnesses.md` line 33
- `ai-framework/rules/model-routing.md` continues to point at the `ai-workflow.toon` `models` block as the source of truth.
- `node ai-framework/scripts/workflow-doctor.mts --json` still `fail: 0`.

### S7 — Release record
- `node ai-framework/scripts/changelog.mts --check` exit 0.
- `CHANGELOG.md` has a new entry (target `2.27.0`, coordinate with `orca-role-pools` Wave 2 if it ships first).
- `VERSION` bumped.
- `.project/pitches/agent-model-sweep/SHIPPED.md` updated with Bet 2 scope statuses and verification.
- Final gauntlet: `node ai-framework/scripts/workflow-doctor.mts --json` → `fail: 0` and the S5 test suite passes.

## Risks (inherited from pitch rabbit holes + critique findings)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Cursor mirrors silently drift because `--apply` only creates missing files (C1/C13) | S2 | no | Run `cursor-mirrors` without `--apply` first, manually copy every `report.differs` entry, then gate on empty `differs` + byte-identity test |
| A bad edit drops the `---` closer, leaves trailing whitespace, strips `model:` before `profile:` exists, or hits a non-canonical file (C5/C7) | S1 | no | Anchor edits to `^model:` inside the frontmatter block; verify with grep + YAML-parse invariant + doctor run |
| OpenCode routing collapses if `agent.build.model` is removed without a top-level `model:` (C2/C3/C6) | S3 | no | Add top-level `model:` set to `models.opencode.deep.model` **before** removing the override; validate JSON and the deep model string |
| Removing the legacy prefix fallback breaks existing tests that relied on it (C2/C8) | S4/S5 | no | Rewrite the legacy-fallback test to assert `warn` on missing `profile:`; add mutants for match / out-of-allowlist / neither |
| Doc sweep misses stale `model:`-as-single-source claims (C3) | S6 | no | Reuse the Bet 1 `follow-orca-dispatch-resume-gate` pattern; grep for `claude-haiku-*`, `claude-sonnet-*`, `claude-opus-*`, and "single declaration" in the four files |
| Claude Code does not read `ai-workflow.toon`; omitted `model:` resolves to the parent session model (C1/C5) | S1/S6 | no | Document clearly in `harnesses.md` that `profile:` is consumed by the doctor/dispatchers, not by Claude Code runtime |
| Cross-pitch ordering with `orca-role-pools` Wave 2 (C14) | S7 | no | Hold S7 until Wave 2 lands or re-run the S7 gate after Wave 2 ships; pick the next free minor version |
| Appetite cap bookkeeping (~33–38 files) | plan | no | Count files in the scope table; acknowledge the cap breach is pure bookkeeping for a scripted sweep |

## Parallel dispatch plan

- **S1 first.** The canonical edits are the bottleneck; everything else depends on the new `profile:`-only frontmatter.
- **S2 immediately follows S1 in the same commit.** The Cursor byte-identity test fails if S1 is committed alone, so stage S1, run `cursor-mirrors`, manually copy `differs`, stage S2, then commit.
- **After the S1+S2 commit, fan out S3, S4+S5, and S6.**
  - S3 is independent (config file).
  - S4 and S5 are coupled: S5 must update tests for the fallback S4 removes. Run S4, then S5.
  - S6 is independent (docs).
- **S7 last**, after all scopes and the final full-suite gate pass.

## Wireframes (UI scopes only)

n/a — no UI.

## Living-spec deviations log

(Empty at /plan time. /build appends as the plan diverges from reality.)

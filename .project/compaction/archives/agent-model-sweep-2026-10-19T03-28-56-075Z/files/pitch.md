# Pitch: agent-model-sweep

**Date**: 2026-10-16  •  **Appetite**: big-batch (decomposed into 3 sequential bets; Bet 1 is small-batch)
**Stack**: workflow-config
**Dependency**: Requires `vendor-model-toon` actually shipped (grammar + writer + tests green, not just hill-done) and `ai-workflow.toon` `schemaVersion: 3` with a `models` block accepted by `loadConfig`.

## Problem

Even after `vendor-model-toon` adds a `models` block to `ai-workflow.toon`, agent and command files in every vendor adapter tree still hardcode model identifiers. The doctor still derives agent profiles from Claude model-name prefixes. Until the hardcoded models are removed and the doctor reads the toon block, the new `models` block is not the real source of truth.

## Knowledge consulted

- [`.project/decisions/toon-subset-grammar.md`](.project/decisions/toon-subset-grammar.md) — `models` is now a valid root key; this pitch consumes it, it does not extend grammar.
- [`.project/pitches/vendor-model-toon/pitch.md`](.project/pitches/vendor-model-toon/pitch.md) — defines the `models` block shape this pitch relies on.
- [`ai-framework/integrations/harnesses.md`](ai-framework/integrations/harnesses.md) — capability profiles and dispatch rules. Agents already declare their profile; this pitch makes that declaration the single source of truth.
- [`ai-framework/rules/model-routing.md`](ai-framework/rules/model-routing.md) — profile-to-role mapping stays unchanged.
- [`ai-framework/scripts/workflow-doctor.mts`](ai-framework/scripts/workflow-doctor.mts) — currently derives profiles from `claude-haiku-/sonnet-/opus-` prefixes and enforces exact model strings in mirrors. This pitch rewrites `checkAgent` and `checkSkill` to read the toon block and validate profile banners instead.
- [`.project/context/opencode-handoff.md`](.project/context/opencode-handoff.md) — Cursor mirrors are byte copies; they must be regenerated after canonical agents change.
- `issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check` — Cursor `cursor-mirrors --apply` only creates missing files; differing mirrors are reported, not overwritten. Manual copy required for differs.
- `patterns/a-gate-must-not-trust-its-own-author` / `a-gate-must-not-audit-its-own-instrument` — the doctor must be the independent witness of the toon block, not the agent files.
- `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — standing no-go "no silent override of instance customization"; any relaxation must be explicit.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| C1 | knowledge-historian | high | missed-knowledge | Cursor `cursor-mirrors --apply` only creates missing mirrors; existing-but-differing mirrors go to `report.differs` with no write branch. Manual copy required. |
| C2 | knowledge-historian | high | assumption | The "capability-profile banner" the doctor is supposed to read does **not exist** in any of the 16 `.claude/agents/*.md` files (only `.claude/skills/*/SKILL.md` has it). The pitch's original "Resolved here" rabbit hole was factually wrong. Bet 1 stores the profile in frontmatter under a non-`model:` key. |
| C3 | knowledge-historian | high | conflict | `.project/workflow-doctor.json` `modelRouting: "project"` is a per-project ownership escape hatch; the rewrite must preserve it. |
| C4 | skeptic | high | rabbit-hole | Same as C2 — the banner does not exist. Without it, `extractAgentProfile` returns null for every agent and the new check becomes a 100% warning storm. |
| C5 | skeptic | high | assumption | Claude Code's `model:` frontmatter IS the runtime model selector. Removing it falls back to the parent session model — the headline affordance ("harness resolves via `ai-workflow.toon`") is false for the primary vendor. Resolve as a shaping-level decision before Bet 2. |
| C6 | skeptic | high | scope-overrun | Inherits must-fix from the prior audit (config-migrate writer literal, README, no unknown-vendor/entry-key guards). Make Bet 1 refuse to start until those close. |
| C7 | appetite-auditor | high | scope-overrun | 97 files vs big-batch cap of 15 (~6.5× over). Decompose into 3 sequential bets. |
| C8 | appetite-auditor | high | appetite-mismatch | Decomposition: **(1) Core logic** ≤10 files (doctor + tests + docs); **(2) Canonical sweep** 17 files (16 agents + opencode.json); **(3) Mirror regen** 76 files (`.opencode/agents`, `.cursor/agents`, `.codex/agents`, `.opencode/commands`, scripted, doctor-validated). |
| C9 | cross-pitch-projector | high | dependency | Pitch's stated dependency (`vendor-model-toon` shipped) is unmet — uncommitted on `feat/unified-toon-config`, `config-migrate.test.mts` 65/71 failing. Land `vendor-model-toon` S1 fully first. |
| C10 | cross-pitch-projector | high | conflict | Three records claim three orders between `vendor-model-toon`, `orca-role-pools`, `agent-model-sweep`. Pick one. |
| C11 | cross-pitch-projector | high | dependency | 76 mirror files are in `bundle-sync` `SYNCED_DIRS`, but `.opencode/opencode.json` is in `FLAGGED_FILES` (never copied). The sweep forces a second drift round for projects already synced. |

## Critique findings — Bet 2 cycle (2026-10-16)

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| C1 | knowledge-historian | high | missed-knowledge | `issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check` applies to **Bet 2**. `skill-defaults.test.mts:287` asserts byte-identity vs 16 `.cursor/agents/*.md`. `--apply` only writes missing; existing mirrors with new content go to `report.differs` requiring manual copy. Bet 2's 17-file set is wrong; floor is 33 (canonical + Cursor) unless a validator catches the drift. |
| C2 | knowledge-historian | high | missed-knowledge | The pinned decision's "When to Revisit" clause is a Bet 2 obligation: delete the legacy prefix fallback at `workflow-doctor.mts:65-69` + `:379`. |
| C3 | knowledge-historian | high | missed-knowledge | Doc drift: `ai-framework/docs/extending.md:28,33,39` and `ai-framework/docs/vendors.md:20,24` state `model:` is "the single declaration". Bet 2 falsifies all six lines. Reuse the `follow-orca-dispatch-resume-gate` doc-sweep pattern. |
| C4 | knowledge-historian | medium | assumption | `.opencode/opencode.json` is in `bundle-sync` `FLAGGED_FILES` (never copied). The edit is repo-local only. State as a deliberate local-only edit with a changelog note. |
| C5 | knowledge-historian | medium | conflict | `docs/vendors.md:20-24` claims no second copy of profile. But all 16 `.opencode/agents/*.md` hardcode it in prose ("Use the `fast` capability profile."). After Bet 2 there are three profile sources. |
| C6 | knowledge-historian | medium | assumption | C5 (skeptic) cannot be closed from the knowledge graph. No entry records Claude Code's runtime resolution when `model:` is absent. Resolve empirically before Bet 2. |
| C7 | knowledge-historian | low | missed-knowledge | `patterns/word-boundary-replacement-does-not-see-a-prefixed-property` — anchor the edit to `^model: ` inside the frontmatter block only. |
| C1 | skeptic | high | rabbit-hole | Claude Code does NOT read `ai-workflow.toon`. Removing `model:` makes Claude Code resolve to the parent session model. The `profile:` frontmatter is consumed only by the workflow doctor and future dispatchers. Document clearly. |
| C2 | skeptic | high | risk | OpenCode has no profile inheritance. Removing every per-file `model:` (Bet 3) without a top-level `model:` in `opencode.json` collapses routing. **Mitigation in Bet 2:** add top-level `model:` set to `models.opencode.deep.model`. |
| C3 | skeptic | high | risk | Removing `agent.build.model` alone is a behavior change (today `/build` = `kimi-k2.7-code` = deep; `model-routing.md:89` says `/build` = standard; the override resolves the disagreement). After removal with no top-level `model:`, `/build` runs on whatever the OpenCode default is. The pitch's "rely on profile inheritance" claim is false. |
| C4 | skeptic | medium | assumption | Cursor mirrors stay byte-copies until Bet 3. The doctor will flag 16 `.cursor/agents/*.md` as `differs` between Bet 2 and Bet 3 ship, with no allowlist. Fold the 16 Cursor copies into Bet 2. |
| C5 | skeptic | medium | risk | A single bad sed could (a) drop the `---` closer, (b) leave trailing whitespace, (c) strip `model:` from agents that don't yet have `profile:`, (d) place `profile:` on a non-canonical file. Add a pre-Bet-2 invariant test. |
| C6 | skeptic | low | scope-overrun | Bet 2's opencode.json edit, paired with Bet 3's per-file `model:` removal, collapses OpenCode routing without a top-level `model:`. |
| C7 | skeptic | low | rabbit-hole | `.codex/agents/*.toml` does not have a `profile:` equivalent. Bet 3 needs per-file TOML edit, not sed. |
| C8 | skeptic | medium | assumption | After Bet 2 removes `model:`, the prefix fallback in `extractAgentProfile` stops working. Add a mutant test for "no-`profile:`-no-prefix → warn". |
| B1 | appetite-auditor | medium | appetite-mismatch | 17 base files / ~35 LOC vs 15 cap. Cap breach is bookkeeping, not risk. |
| B2 | appetite-auditor | medium | scope-overrun | Realistic Bet 2 = 20-24 files (CHANGELOG/VERSION, doctor cleanup, setup-validator guard). Name in exit criteria. |
| B3 | appetite-auditor | high | appetite-mismatch | Bet 1 is shipped; merging is moot. The underlying concern (Bet 1 ships a `profile:` reader whose producer does not exist) is exactly what Bet 2 creates. |
| B4 | appetite-auditor | high | appetite-overrun | If Cursor mirrors must ship in the same commit, Bet 2 = 33-38 files. The re-shaped Bet 2 folds the 16 Cursor copies. |
| B5 | appetite-auditor | medium | appetite-mismatch | Bet 2's scope is undefined until C5/C6 (Claude Code runtime) resolves. Settle: Claude Code resolves omitted-`model:` to parent session model (per C1 skeptic). Document and proceed. |
| C12 | cross-pitch-projector | high | dependency | **Bet 3 breaks the doctor Bet 1 shipped.** `workflow-doctor.mts:860-871` under bundle routing requires `^model: <toon model>$` in mirrors. Bet 3 must split into 3a (doctor: presence→absence under bundle routing) + 3b (scripted sweep). |
| C13 | cross-pitch-projector | high | dependency | Cursor parity blind window. Resolved by the re-shaped Bet 2 (16 Cursor copies in the same commit). |
| C14 | cross-pitch-projector | medium | dependency | orca-role-pools Wave 2 ↔ Bet 3. Sequence Wave 2 first or re-run S7's gates after Bet 3. |
| C15 | cross-pitch-projector | low | dependency | vendor-model-toon = file-disjoint (∩ Bet 2 = ∅). Full-suite gate still applies. |
| C16 | cross-pitch-projector | low | dependency | workflow-v3-rollout: gate the sync on Bet 3. Refresh `upstream-project-drift/drift-ledger.md:270`. |
| C17 | cross-pitch-projector | low | dependency | Bet 2/3 unlisted as active. Add to the backlog. |

## Solution sketch (breadboard, NOT wireframe)

Decomposed into 3 sequential bets (per C8). This pitch file covers **Bet 1 (core logic)**; Bets 2 and 3 are follow-up pitches queued behind it.

### Bet 1 — Core logic (small-batch, ≤10 files)

**Places**
- `ai-framework/scripts/workflow-doctor.mts` — rewrite `checkAgent` and `checkSkill` to:
  - Read `models` from `loadConfig`.
  - Derive agent profile from frontmatter `profile:` key on the canonical agent file (add the key, not a body banner — see C2).
  - Validate that the toon block has every required vendor (`claude`, `opencode`, `codex`) and every required profile (`fast`, `standard`, `deep`) for each.
  - Validate that no mirror file hardcodes a `model:` or `model =` line that conflicts with the toon block.
  - Preserve `skillProfileOverrides`, `skillModelOverrides`, `skillReferencePatternOverrides`, and `.project/workflow-doctor.json` `modelRouting: "project"` (see C3).
- `ai-framework/scripts/workflow-doctor.test.mts` — rewrite the affected fixtures and assertions for the new contract (the doctor is the independent witness, per `a-gate-must-not-audit-its-own-instrument`).
- `ai-framework/scripts/setup-validator.mts` and `.test.mts` — keep the Cursor mirror parity check; add a guard for the new frontmatter `profile:` key.
- `ai-framework/integrations/harnesses.md` and `ai-framework/rules/model-routing.md` — update model table language to point at `ai-workflow.toon`. **Also** sweep `SETUP.md`, `README.md`, `ai-framework/docs/`, `AGENTS.md`/`CLAUDE.md` for hardcoded model tables (per the `follow-orca-dispatch-resume-gate` precedent).
- `CHANGELOG.md` and `VERSION` — release record; pick the number after `orca-role-pools` Wave-1 ships.

**Affordances per place**
- The doctor reports missing vendor/profile entries (fail), any hardcoded model in a mirror (fail), and any drift between `.claude/agents/<x>.md` and its `.cursor/agents/<x>.md` byte copy (fail).
- Project-owned routing via `.project/workflow-doctor.json` is preserved unchanged.

**Connections**
1. `vendor-model-toon` S1 ships green (C9 gate).
2. Bet 1 lands; doctor now reads the toon block.
3. Bet 2 (canonical sweep) and Bet 3 (mirror regen) are follow-up pitches; the doctor from Bet 1 validates them.

### Bet 2 — Canonical sweep (big-batch, ~35-40 files, follow-up)

**Precondition**: Bet 1 shipped (`f5b3eb0`). Doctor reads the toon `models` block. Mandatory toon check fires.

**Canonical (16 files)**
- Add `profile: <fast|standard|deep>` frontmatter to all 16 `.claude/agents/*.md` (NOT a body change — frontmatter is metadata).
- Remove `model:` from all 16 canonical agents.

**OpenCode config (1 file)**
- Add top-level `model:` key to `.opencode/opencode.json` set to `models.opencode.deep.model` from the toon. This preserves the deep primary-agent routing that `agent.build.model` enforced; removing the latter without a top-level `model:` collapses all OpenCode subagent routing (per C2/C3 skeptic: OpenCode has no profile inheritance).
- Remove `agent.build.model` override (no longer needed once top-level `model:` carries the deep binding).

**Cursor mirrors (16 files, in the same commit per `issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check` / C1 knowledge-historian / C13 cross-pitch)**
- Run `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` and manually copy every entry under `report.differs` (the `--apply` flag only creates missing files). This keeps `.cursor/agents/*.md` byte-identical to the updated canonicals.
- Without this, the 16 Cursor mirrors silently drift and no validator catches it (setup-validator ignores `differs`; the doctor has no Cursor byte-identity check).

**Doctor cleanup (1 file)**
- Delete the legacy `claude-haiku-` / `sonnet-` / `opus-` model-prefix fallback in `workflow-doctor.mts` (`agentProfileByModelPrefix` + the fallback branch in `extractAgentProfile`). Per the pinned decision `profile-detection-lives-in-frontmatter-not-in-the-model-id` "When to Revisit" clause: removal happens at the end of Bet 2, not Bet 1.
- Update or remove the 2 existing mutant tests that exercise the legacy fallback.

**Tests (~3-5 files)**
- New invariant test: every `.claude/agents/*.md` has `profile:` frontmatter AND no `model:` line AND parses as YAML. Run as a pre-flight.
- New mutant tests for `extractAgentProfile`:
  - `profile: deep` + no `model:` → returns `deep`
  - `profile: turbo` (out of allowlist) + `model: claude-sonnet-5-5` → returns `standard` (legacy fallback) OR `null` (if fallback removed) — the test depends on which path is taken
  - Neither `profile:` nor a legacy `model:` prefix → `warn`
- Update `workflow-doctor.test.mts` "project-owned routing" test if it referenced the legacy fallback.

**Docs (4-5 files, per the `follow-orca-dispatch-resume-gate` doc-sweep pattern / C3 knowledge-historian)**
- `ai-framework/docs/extending.md` — remove the "model: is the single declaration" claim; add "profile: frontmatter is the single declaration; the toon `models` block is the source of truth."
- `ai-framework/docs/vendors.md` — same.
- `ai-framework/integrations/harnesses.md` — line 33 ("`model:` values in those role files are Claude-specific suggestions") goes stale; update.
- `ai-framework/rules/model-routing.md` — confirm the toon-first language.
- `SETUP.md` and `README.md` if they carry the same claim.

**CHANGELOG / VERSION** — release record; coordinate with `orca-role-pools` Wave 2 if it ships first (C14 cross-pitch).

**Claude Code does not read the toon** (per C1 skeptic, high). The toon is read by the workflow doctor and by future dispatchers. Claude Code resolves omitted-`model:` to the parent conversation's model (or the per-invocation `CLAUDE_CODE_SUBAGENT_MODEL` override). Document this in `harnesses.md` so Bet 2 is not framed as "Claude Code now respects `ai-workflow.toon`."

### Bet 3 — Mirror regen (big-batch, ~76 files, scripted, follow-up)
- Remove `model:` from `.opencode/agents/*.md` (16), `.cursor/agents/*.md` (16), `.codex/agents/*.toml` (16).
- Remove `model:` from `.opencode/commands/*.md` (28).
- Remove `model = "..."` and `model_reasoning_effort = "..."` from `.codex/agents/*.toml` (16).
- Regenerate `.cursor/agents/*.md` by running `node ai-framework/scripts/skill-vendors.mts cursor-mirrors` and manually copying every entry under `differs` (per C1, the `--apply` flag does not overwrite).
- Doctor from Bet 1 validates; no per-file review surface in this bet (scripted).

## Rabbit holes

**Resolved here (Bet 1)**
- How does the doctor derive the agent profile? → **Frontmatter `profile:` key** on the canonical agent file (NOT a body banner — the banner does not exist on agents, and the standing no-go forbids body changes).
- What validates mirror consistency? → `workflow-doctor.mts` checks no mirror file contains `model:` / `model =` that conflicts with the toon block. The check anchors on the line, not a substring (per `substring-hook-wiring-check-accepts-echoed-commands`).
- What about the existing exception tables (`skillProfileOverrides`, `skillModelOverrides`, `skillReferencePatternOverrides`)? → Preserved as deliberate exceptions; the rewrite does not drop them.
- What about project-owned routing (`.project/workflow-doctor.json`)? → Preserved unchanged; the `modelRouting: "project"` mode is documented and tested.
- What about `.opencode/opencode.json` `agent.build.model`? → Handled in Bet 2 (remove, rely on profile inheritance).

**Pushed to Bet 1 plan as risk** (with named owner)
- Claude Code runtime behavior without `model:` frontmatter — Bet 2 is where the `model:` line is removed from canonical agents. C5 must be resolved before Bet 2 ships. If Claude Code cannot inherit a profile, Bet 2 must keep a placeholder `model:` line in canonical agents (a documented, explicit relaxation of the no-hardcoded-model rule).
- Where to place the `profile:` frontmatter key — within the existing YAML frontmatter block; coordinate with Bet 2.

**Pushed to no-go** (deferred)
- Per-role model overrides beyond `fast`/`standard`/`deep`.
- Auto-generation of `.opencode/opencode.json` or other vendor config files from `ai-workflow.toon`.
- Runtime model switching based on task complexity.
- The 28 `.opencode/commands/*.md` "command-intended-model" preservation — if OpenCode commands without a `model:` line inherit the user session model, that is a documented behavior change, not a bug.

## No-gos (this pitch — Bet 1 only)

- ✗ No changes to agent prompt bodies or instructions.
- ✗ No new external dependencies or network calls.
- ✗ No secret or `.env` handling.
- ✗ No changes to the TOON grammar or `runtime/config.mts`.
- ✗ No removal of `model:` from any agent or command file (deferred to Bets 2 and 3).
- ✗ No support for model aliases or fallback chains.

## Bet decision (Bet 1 — core logic)

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/agent-model-sweep/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.

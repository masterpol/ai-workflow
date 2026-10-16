# Pitch: agent-model-sweep

**Date**: 2026-10-16  •  **Appetite**: big-batch (mirror files are mechanical; core logic change is bounded)
**Stack**: workflow-config
**Dependency**: Requires `vendor-model-toon` shipped and `ai-workflow.toon` `schemaVersion: 3` with a `models` block accepted by `loadConfig`.

## Problem

Even after `vendor-model-toon` adds a `models` block to `ai-workflow.toon`, agent and command files in every vendor adapter tree still hardcode model identifiers. The doctor still derives agent profiles from Claude model-name prefixes. Until the hardcoded models are removed and the doctor reads the toon block, the new `models` block is not the real source of truth.

## Knowledge consulted

- [`.project/decisions/toon-subset-grammar.md`](.project/decisions/toon-subset-grammar.md) — `models` is now a valid root key; this pitch consumes it, it does not extend grammar.
- [`.project/pitches/vendor-model-toon/pitch.md`](.project/pitches/vendor-model-toon/pitch.md) — defines the `models` block shape this pitch relies on.
- [`ai-framework/integrations/harnesses.md`](ai-framework/integrations/harnesses.md) — capability profiles and dispatch rules. Agents already declare their profile; this pitch makes that declaration the single source of truth.
- [`ai-framework/rules/model-routing.md`](ai-framework/rules/model-routing.md) — profile-to-role mapping stays unchanged.
- [`ai-framework/scripts/workflow-doctor.mts`](ai-framework/scripts/workflow-doctor.mts) — currently derives profiles from `claude-haiku-/sonnet-/opus-` prefixes and enforces exact model strings in mirrors. This pitch rewrites `checkAgent` and `checkSkill` to read the toon block and validate profile banners instead.
- [`.project/context/opencode-handoff.md`](.project/context/opencode-handoff.md) — Cursor mirrors are byte copies; they must be regenerated after canonical agents change.

## Solution sketch (breadboard, NOT wireframe)

**Places**

- `.claude/agents/*.md` (16 files) — remove `model:` frontmatter; keep capability profile banner and a note that model selection is governed by `ai-workflow.toon`.
- `.opencode/agents/*.md` (16 files) — remove `model:` frontmatter; keep pointer to canonical agent.
- `.cursor/agents/*.md` (16 files) — remove `model:` frontmatter; regenerate as byte copies of canonical agents.
- `.codex/agents/*.toml` (16 files) — remove `model = "..."` and `model_reasoning_effort = "..."`; keep pointer to canonical agent.
- `.opencode/commands/*.md` (28 files) — remove `model:` frontmatter; keep pointer to canonical skill.
- `.opencode/opencode.json` — remove or realign the `agent.build.model` override with `models.opencode.deep`.
- `ai-framework/scripts/workflow-doctor.mts` — rewrite `checkAgent` and `checkSkill` to:
  - Read `models` from `loadConfig`.
  - Derive agent profile from the capability-profile banner in the canonical file.
  - Validate that each vendor has `fast`, `standard`, and `deep` entries.
  - Validate that no mirror file hardcodes a model that conflicts with the toon block.
- `ai-framework/scripts/setup-validator.mts` — add or keep the Cursor mirror parity check.
- `ai-framework/integrations/harnesses.md` and `ai-framework/rules/model-routing.md` — update model table language to point at `ai-workflow.toon`.

**Affordances per place**

- Canonical agents declare only their capability profile; the harness resolves the model via `ai-workflow.toon`.
- `workflow-doctor.mts` reports missing vendor/profile entries and any mirror that still hardcodes a model.
- Cursor mirrors stay byte-identical to canonical agents after regeneration.
- Codex agents no longer declare effort; effort lives under `models.codex.<profile>.effort`.

**Connections**

1. `vendor-model-toon` ships `schemaVersion: 3` and the `models` block.
2. This pitch removes hardcoded models from all canonical and mirror agent/command files.
3. `workflow-doctor.mts` validates consistency against the toon block.
4. Future model updates only require changing `ai-workflow.toon` and the example/migrator defaults.

## Rabbit holes

**Resolved here**
- How does the doctor derive the profile without the Claude model prefix? → Read the `> **Recommended capability profile:** \`X\`` banner in the canonical agent/skill file.
- What validates mirror consistency? → `workflow-doctor.mts` checks that no mirror file contains a `model:` or `model =` line that conflicts with the toon block.
- How are Cursor mirrors updated? → Run `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply` after editing canonical agents.
- What about `.opencode/opencode.json` `agent.build.model`? → Removed if it duplicates `models.opencode.deep`; otherwise documented as a manual override.

**Pushed to /plan as risk** (with named owner)
- Claude Code runtime behavior without `model:` frontmatter — plan owner: implementer. Claude Code subagent files use frontmatter to pick the model. Removing it falls back to the parent session model unless the user selects manually. Document this explicitly or decide on a placeholder.
- Exact doctor check shape for skills vs agents — plan owner: implementer. Skills already declare profiles via banner; the check must distinguish skill command files (`.opencode/commands/*.md`) from agent files.

**Pushed to no-go** (deferred)
- Per-role model overrides beyond `fast`/`standard`/`deep`.
- Auto-generation of `.opencode/opencode.json` or other vendor config files from `ai-workflow.toon`.
- Runtime model switching based on task complexity.

## No-gos (this pitch)

- ✗ No changes to agent prompt bodies or instructions.
- ✗ No new external dependencies or network calls.
- ✗ No secret or `.env` handling.
- ✗ No changes to the TOON grammar or `runtime/config.mts`.
- ✗ No support for model aliases or fallback chains.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

(Empty until /critique runs. Each finding has severity / type / suggested addition.)

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/agent-model-sweep/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.

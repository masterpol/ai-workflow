# Pitch: vendor-model-toon

**Date**: 2026-10-16  •  **Appetite**: small-batch
**Stack**: workflow-config
**Sequencing**: Ships after `workflow-v3-rollout` (base ≥3.0.0). Does **not** change any agent file; it only adds the grammar and defaults that a later pitch will consume.

## Problem

Model identifiers are scattered across four vendor adapter trees and `.opencode/opencode.json`. There is no single place for a project to declare which model each capability profile uses, and no example a new install can copy. Before the agents can be migrated, the `ai-workflow.toon` grammar must support a `models` block and the tooling must read, validate, and migrate it.

## Knowledge consulted

- [`.project/decisions/toon-subset-grammar.md`](.project/decisions/toon-subset-grammar.md) — adding a new root key is a grammar change; the decision requires a `schemaVersion` bump and a migration function. This pitch bumps to `schemaVersion: 3` and adds a real v2→v3 converter (not a replacement).
- [`.project/context/opencode-handoff.md`](.project/context/opencode-handoff.md) — current adapter state is present and passing doctor; the `models` block becomes a new source of truth that later pitches will use for validation.
- [`ai-framework/rules/model-routing.md`](ai-framework/rules/model-routing.md) — agents already map to `fast`/`standard`/`deep` profiles. The `models` block is profile-keyed so the existing abstraction stays intact.
- [`ai-framework/integrations/harnesses.md`](ai-framework/integrations/harnesses.md) — documents the current per-vendor model table. The example `ai-workflow.toon` encodes exactly these current models.
- [`ai-framework/scripts/runtime/config.mts`](ai-framework/scripts/runtime/config.mts) — `ROOT_KEYS` and `validateConfig` must be updated to accept `models`.
- [`.project/pitches/workflow-v3-rollout/pitch.md`](.project/pitches/workflow-v3-rollout/pitch.md) — active rollout assumes `schemaVersion: 2` for its 3.0.0 base. This pitch lands after rollout to avoid a schemaVersion collision.

## Solution sketch (breadboard, NOT wireframe)

**Places**

- `ai-framework/scripts/runtime/config.mts` — add `models` to `ROOT_KEYS`, type it, validate vendor/profile/model shape.
- `ai-framework/scripts/config-migrate.mts` — implement v2→v3 conversion that preserves all existing v2 values and injects a default `models` block.
- `ai-framework/templates/ai-workflow.example.toon` — documented, copyable model block using current models.
- `README.md` — new "Model configuration" section linking to the example and explaining profile→model overrides.
- Tests: `ai-framework/scripts/config-migrate.test.mts`, and any new test file for `runtime/config.mts` validation.

**Affordances per place**

- `ai-workflow.toon` (v3) lets a project override any vendor's `fast`, `standard`, or `deep` model.
- Codex profiles may also declare `effort` (`high`, `xhigh`) because Codex needs explicit reasoning effort.
- `config-migrate.mts --dry-run` shows the converted v3 file including the injected default `models` block.
- `config-migrate.mts --apply` converts a v2 file in place, preserving `runtime.runner`, `integrations.orca.*`, `doctor.modelRouting`, and `skills.modes.caveman`.

**Connections**

1. Human edits `ai-workflow.toon` `models.<vendor>.<profile>`.
2. Scripts read the block via `loadConfig`.
3. Future bundle releases update `ai-framework/templates/ai-workflow.example.toon` and the migrator defaults; project files are untouched.
4. A later pitch (`agent-model-sweep`) strips hardcoded models from agents and teaches `workflow-doctor.mts` to validate against this block.

Proposed `models` shape (TOON subset):

```yaml
models:
  claude:
    fast:
      model: claude-haiku-5-5
    standard:
      model: claude-sonnet-5-5
    deep:
      model: claude-opus-5-5
  opencode:
    fast:
      model: opencode-go/space-bunny
    standard:
      model: opencode-go/minimax-m3
    deep:
      model: opencode-go/kimi-k2.7-code
  codex:
    fast:
      model: gpt-6-luna
      effort: high
    standard:
      model: gpt-6.1-sol
      effort: high
    deep:
      model: gpt-6-astra
      effort: xhigh
```

## Rabbit holes

**Resolved here**
- Schema version bump? → Yes. Per the TOON grammar decision, a new root key requires a `schemaVersion` bump. This pitch moves to `schemaVersion: 3`.
- Profiles as scalars or objects? → Objects with `model:` (and optional `effort:` for Codex). Object form leaves room for future per-profile options without another grammar change.
- Does this pitch touch agent files? → No. Agents remain unchanged; the model block is inert until `agent-model-sweep`.
- How does v2→v3 conversion preserve values? → By reading the parsed v2 model and re-emitting every known key plus the default `models` block. Unknown v2 keys are refused as before.
- Why sequence after `workflow-v3-rollout`? → Rollout's 3.0.0 base assumes `schemaVersion: 2`. Bumping now would force rollout to handle a v3 config it does not expect.

**Pushed to /plan as risk** (with named owner)
- Exact `ConfigModel` TypeScript shape for nested vendor/profile objects — plan owner: implementer. Must support optional `effort` only for Codex while keeping the type strict.
- README wording and placement of the "Model configuration" section — plan owner: implementer. Should not duplicate `ai-framework/docs/setup.md` or `ai-framework/integrations/harnesses.md`.

**Pushed to no-go** (deferred to `agent-model-sweep`)
- Stripping `model:` from `.claude/agents/*.md`, `.opencode/agents/*.md`, `.cursor/agents/*.md`, `.codex/agents/*.toml`, `.opencode/commands/*.md`, and `.opencode/opencode.json`.
- Updating `workflow-doctor.mts` to derive profiles from capability banners and validate mirrors against the toon block.
- Per-role model overrides beyond the three profiles.

## No-gos (this pitch)

- ✗ No changes to agent prompt bodies, frontmatter, or instructions.
- ✗ No changes to `workflow-doctor.mts` model-routing validation.
- ✗ No new external dependencies or network calls.
- ✗ No secret or `.env` handling.
- ✗ No support for model aliases, fallback chains, or per-role overrides.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Not applicable — appetite is small-batch and the scope does not touch `lib/ai/prompts/`.

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/vendor-model-toon/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.

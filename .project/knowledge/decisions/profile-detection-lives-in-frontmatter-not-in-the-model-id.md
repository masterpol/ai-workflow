---
id: profile-detection-lives-in-frontmatter-not-in-the-model-id
type: decision
created: 2026-10-16
updated: 2026-10-16
tags: [frontmatter, capability-profile, model-routing, agents]
related: [a-gate-must-not-audit-its-own-instrument, bare-prefix-match-crosses-entities]
source: agent-model-sweep
---

# Decision: Agent profile detection lives in frontmatter, not in the model id

## Status

Pinned.

## Context

The workflow's capability profiles (`fast` / `standard` / `deep`) historically derived from the
Claude model id prefix (`claude-haiku-` → fast, `claude-sonnet-` → standard, `claude-opus-` → deep).
This coupled profile detection to the hardcoded model string in `.claude/agents/*.md`. When
model configuration moved to a project-root `ai-workflow.toon` `models` block (see
`vendor-model-toon`), the prefix-derivation approach broke:

1. The model id is no longer authoritative — the toon is.
2. Profile detection must not depend on a string that the user can change per-project.
3. Skills already declared their profile via a `> **Recommended capability profile:** \`X\`` banner,
   but agents never had that banner. The first draft of `agent-model-sweep` assumed agents
   could adopt the same pattern, but the standing no-go forbids body changes; agents already
   had YAML frontmatter for `name` / `description` / `tools` / `model`.

## Decision

Agents declare their capability profile via a new YAML frontmatter key `profile:` with one of
`fast | standard | deep`. Detection reads the key directly. The legacy `claude-haiku-` /
`sonnet-` / `opus-` model-prefix fallback is preserved as a documented transition aid for the
gap between this decision and the eventual Bet 2 sweep that adds `profile:` to all 16
canonical agents.

## Consequences

### Positive

- Profile detection is decoupled from the model id. The toon can change without breaking the
  doctor's profile derivation.
- The detection rule is explicit and allowlisted (`AGENT_PROFILE_KEYS = new Set([...])`); an
  unknown profile id is a hard warn, not a silent fallback to the wrong tier.
- Bet 2's sweep (add `profile:` to all 16 canonical agents) is a single-line frontmatter edit
  per file — no body change required.

### Negative

- A duplicate source of profile truth exists during the transition: the `profile:` key on
  new / updated agents, and the `claude-haiku-` prefix on the rest. Both paths feed the same
  three-tier `fast | standard | deep` output, so the doctor behaves identically; the
  duplication is a maintenance liability until Bet 2 ships.
- A future model id like `claude-haiku-6` would re-match the legacy prefix even if the project
  intended a different tier. The fix is to remove the prefix fallback after Bet 2.

## Alternatives Considered

- **Body banner matching the skill pattern.** Rejected: forbids body changes; the banner does
  not exist on any current agent; adding it would be a body change.
- **Frontmatter `model:` carries the profile implicitly via the toon lookup.** Rejected: the
  `model:` field is being removed in Bet 2; coupling profile detection to it would re-introduce
  the dependency.
- **A new dedicated file per agent (`agents/<x>.profile`).** Rejected: extra file surface for
  one bit of metadata; the frontmatter is the right home.

## When to Revisit

When Bet 2 ships and all 16 canonical agents have `profile:` frontmatter, remove the legacy
`claude-haiku-` prefix fallback. Update the test that exercises the fallback path to assert
the new behavior (warn on missing `profile:` and no matching legacy prefix).

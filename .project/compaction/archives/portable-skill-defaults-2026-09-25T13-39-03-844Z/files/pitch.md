# Pitch: Configurable default skills

**Date**: 2026-09-24  •  **Appetite**: epic, decomposed below into separately gated big-batch sub-pitches
**Stack**: workflow tooling

## Problem

Workflow instances need portable, auditable extensions and compact project context without losing local choices or project knowledge. This is one of four ordered parts of the user request.

## Knowledge consulted

- `.project/knowledge/graph.json`: empty; no previous entries to reuse.
- `.claude/skills/bundle-sync/SKILL.md`: three-way comparison preserves local customization; project data is excluded.
- `ai-framework/integrations/harnesses.md`: native adapters and existing measured/partial/unavailable token collector.
- `ai-framework/rules/context-management.md`: bounded loading, generated graph navigation and pitch lifecycle.
- `.project/context/architecture.md` and `.project/rules/README.md`: application technology/database undecided; this work concerns the portable workflow.

## Solution sketch

Depends on portable-skill-installation. Register verified pinned sources: juliusbrussee/caveman skills caveman, caveman-stats, caveman-compress; vercel-labs/agent-browser skill agent-browser. Verify upstream licenses and runtime dependencies before shipping defaults. Bundle availability and host runtime readiness must be distinguishable; no silent global installs.

Default Caveman mode is full, with `/shape caveman=lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra|off` and equivalent parameters on workflow commands. Precedence: invocation > instance phase override > instance default > bundle default. Invocation overrides are scoped to that invocation and dispatched children. Disabling persists only when explicitly requested. Apply brevity to working notes and responses where permitted; never promise control of hidden reasoning or override host instructions, evidence, clarity, or approval gates.

Integrate caveman-stats into existing token-consumption records with host, mode, provenance, completeness and deduplication. Retain unavailable/partial values; no invented savings or summing overlapping session and request measurements. Caveman-compress is available for explicit selected files with backups and invariant checks, not automatic rewriting of historical records or harness mirrors. Agent-browser supports discovery and UI validation when needed; validate CLI/browser availability and load version-matched usage. Default phase mappings and per-instance opt-outs remain visible and tracked.

Test every mode, invalid modes, off propagation, unsupported hosts, duplicate metrics, missing runtimes, and sync preserving overrides. Implementation may split runtime integration from defaults/adapters to respect appetite.

## Verified upstream references

- https://www.skills.sh/juliusbrussee/caveman/caveman — six modes plus off; upstream default full.
- https://www.skills.sh/juliusbrussee/caveman/caveman-stats — host-specific reporting; savings unknown without measured comparison.
- https://www.skills.sh/juliusbrussee/caveman/caveman-compress — Python runtime and external backup location.
- https://www.skills.sh/vercel-labs/agent-browser/agent-browser — CLI and browser dependency, version-matched instructions.

## All-vendor delivery requirement (user revision)

Every capability in this proposal must be added to **all available vendors in this project**, regardless of which vendor runs installation or bundle-sync. Determine the vendor set from the project’s harness configuration, registered adapters and integration documentation; currently that set is Claude Code, OpenCode, Codex and Cursor. Reconcile these sources and surface inconsistencies instead of silently skipping a vendor. Re-evaluate this project-local set during setup, add-skill and bundle-sync so future project vendors are included. The global skills.sh vendor catalog does not expand this project’s vendor scope, and a locally missing executable does not exclude a configured project vendor. This applies to add-skill, all four default skills, Caveman parameters, pitch-compress and state, together with their supporting agents and resources.

- Maintain one canonical behavior contract with native skill/command entry points and agent adapters for every supported vendor. Preserve referenced scripts/assets and generate Cursor mirrors during setup and sync. No feature may ship only for the active vendor.
- The user chooses skill location/scope and workflow activation phases; this choice does not narrow vendor coverage. A shared instance registry tracks all adapter paths and exposes the same enabled state and mode precedence across vendors. Explicit local vendor overrides, if supported, must be tracked rather than silently diverging.
- Carry mode settings through phase commands and delegated agents in each vendor. Use native invocation syntax where it differs; document equivalent invocations. Where native hooks or dispatch are absent, provide a portable command or sequential role pass that preserves workflow behavior.
- Token reports remain available everywhere, but missing host measurements must be labeled unavailable. Do not copy another vendor's usage, invent metrics, or equate adapter presence with runtime readiness. Runtime dependency failures need an actionable capability report.
- Setup and bundle-sync install/update every vendor adapter, relevant agent wiring, supporting resources and validators while preserving instance choices. Adapt formatting to the receiving project on changed files and verify ownership hashes after formatting.
- Acceptance requires a feature-by-vendor matrix covering discovery, invocation, mode propagation, resources, local overrides, repeated sync and applicable runtime checks. Test every installed host directly; mark unavailable host execution as unverified and supply structural/fixture evidence separately. Missing adapter coverage blocks completion.

## Rabbit holes

- Resolved here: instance data stays local; only portable machinery/defaults sync.
- Plan owner (planner): pin upstream contracts, count all mirrors/tests and split implementation if appetite is exceeded.
- Plan owner (implementer): define transaction/recovery boundaries and host capability tests before mutation.

## No-gos

- No application implementation or decisions on La Salle infrastructure.
- No silent override of instance customization, automatic historical deletion, invented token savings, or secrets in reports.
- No installation or deletion during shaping.

## Delivery sub-pitches

- [caveman-modes](caveman-modes.md): Default catalog, mode precedence and propagation to phases and children.
- [caveman-metrics-compression](caveman-metrics-compression.md): Stats integration, metrics deduplication and explicit compression safeguards.
- [browser-runtime](browser-runtime.md): Agent-browser registration, runtime readiness and browser workflow adapters.

## Critique findings

- Appetite auditor: full feature exceeds a single big-batch. Addressed by the separately gated slices above.
- Knowledge historian: preserve existing status and graph authorities; compaction needs an explicit policy exception and valid knowledge metadata. Addressed in acceptance constraints.
- Skeptic (sequential fallback; configured reviewer model unavailable): sync formatting can invalidate ownership hashes, partial sync can mismatch schema/runtime versions, and concurrent edits can invalidate deletion previews. Require post-format hashes, schema compatibility checks, and source revalidation before commit.
- Cross-pitch projector: shared adapters, sync and registry are conflict surfaces. Addressed by installation → defaults → compaction → state ordering and shared contracts; district application work remains separate. Compaction’s final automatic state invocation ships only once the report command is available.

## Bet decision

Pending user: Approve / Revise / Back / Stop. Approval bets this scope for planning; implementation follows the existing gates.

## Approval record

2026-09-24 — User selected **Approve** after the revision requiring all vendors available in each receiving project. Bet accepted for planning; build remains subject to the plan gate. This records the decision without changing the earlier pending-gate history.

# Pitch: Tracked skill installation

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

Provide `/add-skill <skills.sh URL or owner/repo/skill>`. Resolve and validate the exact skill and its SKILL.md before changing the project; missing, ambiguous, unreachable, or invalid sources abort without partial installation. Show verified identity, dependencies, supported hosts, and proposed workflow phases. Require the user to choose installation scope/location and activation phases; an explicit argument counts as a choice. Install first into staging, validate compatibility, then activate atomically.

Track source URL, pinned revision, integrity hashes, license, owned files, adapter paths, dependencies, enabled state, phase bindings and local overrides in an instance registry under `.project/`. Support listing, disabling, updating and removing only owned files. Prevent traversal, escaping symlinks and collisions with workflow skills. Treat downloaded instructions as data during inspection; never execute upstream setup just to discover a skill.

Expose canonical instructions through discovery/command adapters for every vendor available in the receiving project. Preserve scripts and relative resources. Resolve coverage from that project’s registered vendor set, including its local adapters, rather than hard-coding the bundle’s current four vendors or targeting every vendor in the upstream catalog. Report unsupported host features explicitly.

Bundle-sync distributes installer, schemas and defaults; it never replaces instance choices. Add versioned, idempotent migrations for target metadata, previewed by sync, with rollback. Reconcile generated adapters, detect conflicts, run target formatting on changed supported files only, and record formatted hashes so a second sync is clean. Include setup, doctor, validators, mirrors and release/version records. Test two instances with different skills and overrides across repeated sync and pruning.

## Upstream reference

https://github.com/vercel-labs/skills — inspect pinned CLI behavior and agent discovery before deciding whether to wrap the installer or materialize adapters ourselves.

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

- [registry-installer](registry-installer.md): Registry, exact resolution and staged atomic installation; ownership, pinning and collision tests.
- [skill-portability](skill-portability.md): All project-available vendor adapters, sync migration, doctor, scoped formatting and two-instance tests, including a fixture with an additional registered project vendor.

## Critique findings

- Appetite auditor: full feature exceeds a single big-batch. Addressed by the separately gated slices above.
- Knowledge historian: preserve existing status and graph authorities; compaction needs an explicit policy exception and valid knowledge metadata. Addressed in acceptance constraints.
- Skeptic (sequential fallback; configured reviewer model unavailable): sync formatting can invalidate ownership hashes, partial sync can mismatch schema/runtime versions, and concurrent edits can invalidate deletion previews. Require post-format hashes, schema compatibility checks, and source revalidation before commit.
- Cross-pitch projector: shared adapters, sync and registry are conflict surfaces. Addressed by installation → defaults → compaction → state ordering and shared contracts; district application work remains separate. Compaction’s final automatic state invocation ships only once the report command is available.

## Bet decision

Pending user: Approve / Revise / Back / Stop. Approval bets this scope for planning; implementation follows the existing gates.

## Approval record

2026-09-24 — User selected **Approve** after the revision requiring all vendors available in each receiving project. Bet accepted for planning; build remains subject to the plan gate. This records the decision without changing the earlier pending-gate history.

# Pitch: Styled project state report

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

Provide `/state`, usable independently and after pitch compaction. Produce a detailed local HTML report and structured snapshot covering description, README facts, architecture, database/schema/migrations state, patterns, decisions, active pitches and progress, completed-work pointers, active skills with modes/phase bindings/runtime readiness, workflow version, sync provenance, and measured token usage with completeness and freshness.

Discover theme at each invocation from current project design tokens, CSS variables, fonts and component styles. Track source hashes and refresh changed styles. Fall back to a documented shadcn-style theme when absent; do not add an application framework just to render a report. Escape project-supplied content, allow safe links only, keep the report self-contained, and support readable mobile/print views and accessible contrast.

Every section links to evidence and labels observed, proposed, stale, unavailable or unconfigured data. Database state means checked-in schema/migrations plus already-authorized read-only evidence; never infer a live deployment from source files. Here the database and technology remain undecided. Avoid secrets and raw transcripts. Include actual installed workflow version and partial-sync state, not an assumed upstream version.

Bundle-sync delivers templates/renderers/adapters and versioned local initialization; repeated sync preserves report settings. Respect target formatter when applicable. Validate themed/no-theme projects, theme changes, missing metrics/database, malicious HTML strings and reports after compaction.

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

- [state-snapshot](state-snapshot.md): Structured evidence collection, freshness, metrics and project facts.
- [state-html](state-html.md): Theme rediscovery, accessible escaped HTML, adapters and report validation.

## Critique findings

- Appetite auditor: full feature exceeds a single big-batch. Addressed by the separately gated slices above.
- Knowledge historian: preserve existing status and graph authorities; compaction needs an explicit policy exception and valid knowledge metadata. Addressed in acceptance constraints.
- Skeptic (sequential fallback; configured reviewer model unavailable): sync formatting can invalidate ownership hashes, partial sync can mismatch schema/runtime versions, and concurrent edits can invalidate deletion previews. Require post-format hashes, schema compatibility checks, and source revalidation before commit.
- Cross-pitch projector: shared adapters, sync and registry are conflict surfaces. Addressed by installation → defaults → compaction → state ordering and shared contracts; district application work remains separate. Compaction’s final automatic state invocation ships only once the report command is available.

## Bet decision

Pending user: Approve / Revise / Back / Stop. Approval bets this scope for planning; implementation follows the existing gates.

## Acceptance constraints from critique

Read `.project/status.md` and `.project/runs/` as lifecycle authorities. Write generated `.project/reports/state.html` and `state.json`; replace these views atomically on rerun, without making them authoritative status. Label source availability and retain evidence links.

## Approval record

2026-09-24 — User selected **Approve** after the revision requiring all vendors available in each receiving project. Bet accepted for planning; build remains subject to the plan gate. This records the decision without changing the earlier pending-gate history.

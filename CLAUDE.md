# CLAUDE.md

> Project-specific mirror for the AI development workflow. `AGENTS.md` is the shared entry point
> for all harnesses; this file is self-contained for Claude Code sessions.

## What this project uses

A ShapeUp-style, 5-phase AI development pipeline with specialised subagents, coding rules, a
persistent knowledge graph, and cost-aware model routing.

- **Pipeline and gates:** `ai-framework/workflow/overview.md`
- **Harness adapters and model profiles:** `ai-framework/integrations/harnesses.md`
- **Coding, security, and architecture rules:** `ai-framework/rules/`
- **Project-specific data:** `.project/`
- **Knowledge graph:** `.project/knowledge/graph.json`; rebuild it with
  `node ai-framework/scripts/graphify.js` after editing a knowledge entry.

## The Pipeline

```
(brainstorm) -> /shape -> /critique -> bet -> /plan -> /build -> /audit -> /ship
                                                            every 5 ships -> /cooldown
```

| Phase | Playbook | Purpose |
|---|---|---|
| shape | `.claude/skills/shape/SKILL.md` | Frame problem, set appetite, name rabbit holes, no-gos |
| critique | `.claude/skills/critique/SKILL.md` | Pre-bet red-team for big-batch and AI scopes |
| plan | `.claude/skills/plan/SKILL.md` | Decompose scopes with checkable exits |
| build | `.claude/skills/build/SKILL.md` | Execute and verify scopes |
| audit | `.claude/skills/audit/SKILL.md` | Review, security, test, UX, i18n, and eval fan-out |
| ship | `.claude/skills/ship/SKILL.md` | Reconcile pitch and implementation, extract knowledge |
| cooldown | `.claude/skills/cooldown/SKILL.md` | Promote learning and triage the backlog |

## Subagents

`.claude/agents/*.md` are canonical role prompts. Select available models by the `fast`,
`standard`, and `deep` profiles in `ai-framework/integrations/harnesses.md`. Key roles include
security reviewer, code reviewer, test-coverage checker, UX reviewer, i18n checker, evaluator,
skeptic, architect, planner, build-error resolver, and refactor cleaner.

## Confirmation Gate

Every gated phase ends with **Approve / Revise / Back / Stop**. Never auto-advance. The adaptive
gate matrix in `ai-framework/workflow/overview.md` determines the gates for small batches, big
batches, bug fixes, and hotfixes.

## Response style (caveman mode)

Default response style is brevity (`caveman`, default level `full`). If the `caveman` skill is
installed and enabled (`.project/skills/registry.json`), load it at the level
`node ai-framework/scripts/skill-defaults.js resolve-mode --phase agent --args-text "<the user's message>"`
returns, unless that is `off`. A `caveman=<lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra|off>`
token in a message overrides it for that message only; a persistent change is an explicit edit to
`.project/skills/modes.json`. Skills, phase commands, and subagents apply the same resolution
themselves (`ai-framework/integrations/skill-defaults.md`). The skill's own Auto-Clarity and
Boundaries rules still apply: security warnings, irreversible-action confirmations, and text
persisted to project files stay normal prose.

## Guardrails

- Never read or copy secret-bearing files (`.env`, `.env.local`, `credentials.json`,
  `settings.local.json`).
- Never rewrite historical records under `.project/pitches/`, `.project/design/`, or
  `.project/pitches/_archive/`.
- Load only the records required for the active phase; traverse the knowledge graph rather than
  bulk-reading project knowledge.

## Project specifics

### Product

La Salle Norandino is defining a single-domain, multi-site public platform for district, country,
territory, and school contexts. The active shaped pitch is
`.project/pitches/district-multisite-foundation/`.

### Architecture Direction

- Tenant hierarchy: `district -> country -> territory (optional) -> school`.
- Users and administrators must be restricted to their assigned organisation node and permitted
  descendants; tenant checks are server-enforced.
- Canonical path-based sites, configurable but controlled landing sections, scoped articles/blog,
  media/documents, and migration with redirects are in scope.
- Data provider, authentication, CMS/editor, hosting, infrastructure, and operations are
  intentionally undecided pending discovery.

### Technology Direction

- Proposed only: TypeScript, TanStack Start and justified TanStack packages, Tailwind, Vite, and
  Ox tooling as needed.
- No application dependencies, package manager, scripts, or infrastructure have been configured.

### Project Records

- Public-site evidence: `.project/analysis/2026-09-21-current-site-validation.md`.
- Requirements: `.project/requirements/features/multisite-platform.md`.
- Scope and effort estimate: `.project/pitches/district-multisite-foundation/pitch.md`.
- First discovery scope: organisation/source inventory, access governance, migration design, then a
  technical proposition. Do not begin implementation until the pitch has a recorded bet decision.

### Verification

- Validate workflow records: `node ai-framework/scripts/setup-validator.js`.
- Validate the knowledge graph: `node ai-framework/scripts/graphify.js --check`.

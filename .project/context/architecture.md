# Architecture Context

## Overview

The bundle is a set of Markdown playbooks and role prompts, JSON configuration, and small Node.js scripts. There is no server, database or build step. Each supported vendor reads its own entry file and adapter directory, and all adapters point at one canonical set of playbooks.

## Layout

- `AGENTS.md` and `CLAUDE.md` are the entry files (OpenCode, Codex and Cursor read `AGENTS.md`; Claude Code reads `CLAUDE.md`).
- `.claude/skills/*/SKILL.md` and `.claude/agents/*.md` are the canonical phase and utility playbooks and role prompts.
- `.agents/`, `.opencode/`, `.cursor/` and `.codex/` hold the per-vendor adapters, plugins, commands and hook wiring.
- `ai-framework/workflow/` documents the phases and gate matrix.
- `ai-framework/rules/` holds the stack-agnostic rules.
- `ai-framework/hooks/` holds the hook wiring template and hook scripts, including the token-consumption collector and report renderer.
- `ai-framework/scripts/` holds the Node tools (setup validator, workflow doctor, graph builder, skill installer, bundle-sync, state report, and others), each with tests.
- `ai-framework/integrations/` documents harness routing, model profiles and skill handling.
- `ai-framework/templates/project/` is the scaffold copied into a project during setup.

## Project Records

`.project/` holds this checkout's own state: `pitches/` (one folder per pitch, with its plan, hill chart, evidence and audit records), `knowledge/` (decisions, patterns, issues, and a generated graph and index), `runs/` (archived ship logs), `skills/` (installed skill registry and packages), `rules/`, `context/` and `status.md`. `.project/metrics/` and generated reports are Git-ignored.

## Data Flow

A pitch moves through the phase playbooks, each reading only the records it needs. Hooks and plugins write bounded local metrics. `graphify.js` rebuilds the knowledge graph after entries change. `bundle-sync` compares an unpacked project with a newer bundle copy and applies approved updates.

## Integrations

Claude Code, OpenCode, Codex and Cursor as hosts. External skills are fetched from pinned Git sources by the installer and are never auto-installed.

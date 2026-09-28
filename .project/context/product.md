# Product Context

## Product

`ai-workflow-portable` is a self-contained, tool-agnostic bundle of a ShapeUp-style development pipeline. It gives an AI coding assistant named phases, confirmation gates, specialised subagent role prompts, coding and security rules, a persistent knowledge graph, hill-chart progress tracking and cost-aware model routing. It is copied into other projects and kept in step with `bundle-sync`.

## Users

- Maintainers of this bundle, who change skills, agents, rules, scripts, templates and hooks.
- Developers who unpack the bundle into a project and work through `/shape`, `/plan`, `/build`, `/audit` and `/ship`.
- AI assistants on Claude Code, OpenCode, Codex and Cursor that read the entry files and follow the playbooks.

## Product Goal

Make AI-assisted development repeatable and reviewable: every piece of work is framed, planned with checkable exit criteria, built with evidence, audited in parallel, and shipped with its lessons recorded.

## Core Capabilities

- Five-phase pipeline with adaptive confirmation gates, plus critique before a bet and cooldown every five ships.
- Canonical skill playbooks and role prompts with native adapters for each supported vendor.
- Knowledge graph of decisions, patterns and issues that phases query instead of bulk-reading.
- Installable external skills, configurable default skills, token-consumption metrics and a project state report.
- Diagnostics: workflow doctor, setup validator and bundle-sync drift checks.

## Product Constraints

- Rules and templates stay stack-agnostic; project-specific conventions are generated into the target project, never edited into the portable files.
- Metrics and generated reports are local, Git-ignored and never store prompts, responses or secrets.
- Nothing application-specific is kept in this repository; applications built with the workflow keep their own records in their own repositories.

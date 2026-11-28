---
id: changing-a-shipped-template-or-skill-has-hidden-consumers
type: issue
created: 2026-11-26
updated: 2026-11-26
tags: [planning, templates, vendor-mirrors, migration, impact]
related: [installed-skill-wrappers-ship-as-orphans, prove-ownership-by-shipped-content-before-removing-a-renamed-file]
source: workspace-slim
severity: medium
resolved: true
confidence: medium
---

# Issue: a one-line edit to a shipped template or skill broke eight tests

## Symptom

A plan's blast-radius check searched for readers of the changed content and listed none for two files. The first full verifier then failed: a
vendor byte copy of the edited skill was stale, and `consolidation-migrate.mts` refreshes a project's copy of a template only when it matches a
**hash of a previously shipped version**, with tests that rebuild old versions from the current file.

## Rule

Before editing anything under `ai-framework/templates/project/` or a canonical skill: search for the file's path, not only its words; check
`PREVIOUS_TEMPLATE_HASHES` and add the old file's hash (computed from Git, not from the new file); run `skill-vendors.mts cursor-mirrors`.
Registering the old hash is also what lets installed projects with an unedited copy receive the new text.

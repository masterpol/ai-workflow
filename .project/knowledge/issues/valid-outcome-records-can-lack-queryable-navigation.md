---
id: valid-outcome-records-can-lack-queryable-navigation
type: issue
created: 2026-10-23
updated: 2026-10-23
tags: [knowledge-graph, compaction, discovery, verification]
related: [graphify, a-gate-must-not-trust-its-own-author]
source: legacy-upgrade
severity: medium
resolved: true
---

# Issue: lint-clean outcome records did not prove navigable retained content

## Observation

After the first legacy-upgrade batch, the graph check passed but a slug's H1 reached retained
content only through containment rather than the required typed one-hop outcome relation.
Schema and link validity did not establish discovery behavior.

## Resolution

Add bounded typed outcome links using the same normalized targets as outcome lint. Route
heading anchors to their graph nodes and use a page fallback where needed. Only outcome
roots emit these links; protected targets are refused before reads. Five planted mutations were
caught. The final 46 upgraded outcomes have navigation evidence and 276 outcome links.

## Prevention

Pair structural graph checks with an explicit traversal assertion from the consumer's starting
node to its expected destinations. Record lexical query limits separately from typed relations.

---
id: data-files-use-their-own-toon-grammar-not-the-config-parser
type: decision
created: 2026-10-19
updated: 2026-10-19
tags: [toon, parser, grammar, data-files]
related: [unified-toon-config-schema-v2, a-version-migrator-edits-the-token-not-the-model, backtracking-regex-over-untrusted-text-is-quadratic]
source: toon-machine-data
---

# Decision: workflow data files use their own TOON grammar, separate from the configuration parser

**Chosen:** data grammar 1.0 (`.project/decisions/toon-data-grammar.md`, `runtime/toon-data.mts`), with a required `@toon-data 1` header, sized arrays, tables for uniform rows, and refusal instead of approximation.
**Why not extend the config parser:** it is a closed-schema grammar with a key whitelist and a 64 KiB cap, and `[N]` there means an inferred inline array. Widening it would have changed what `ai-workflow.toon` means and needed a `schemaVersion` bump.
**Consequence:** the config parser and its tests are untouched; a change to what a data file means bumps the header number and ships a migrator in the same commit.

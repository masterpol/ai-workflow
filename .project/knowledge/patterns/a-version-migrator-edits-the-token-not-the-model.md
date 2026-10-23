---
id: a-version-migrator-edits-the-token-not-the-model
type: pattern
created: 2026-10-17
updated: 2026-10-17
tags: [migration, config, schema, byte-preservation, round-trip]
confidence: low
related: [a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version, prove-a-guard-test-with-an-in-memory-mutant, a-gate-must-not-trust-its-own-author]
source: vendor-model-toon
---
# Pattern: an additive schema migration edits the version token and appends, then proves it through the strict reader

## Summary

When a new schema version only adds an optional block, convert an existing file by changing the one
version digit and appending the new block, not by re-emitting a parsed model. Then run the result
through the strict reader before writing.

## Why

`vendor-model-toon` first rebuilt the file from a parsed model: that dropped comments, CRLF endings,
trailing blank lines and (via a default block) custom values. A textual `convertV2` that matches a
single bare `schemaVersion: 2` line, replaces only the `2`, detects the file's EOL and appends the
default block keeps every other byte. The existing `loadConfig` round trip still rejects a v2 file with
unknown keys, so the textual edit cannot launder bad input.

## How to apply

- Accept only the exact old version token (single occurrence, bare); refuse if the new block already exists.
- Emit with the same writer used elsewhere and re-read it with the strict reader before any write.
- Keep the emitter honest too: it must write the model's own block, not a constant, or a re-emit loses data.
- Plant a canary in the version matcher (`2` to any digit) when auditing: reviewers that catch it prove they read the guard.

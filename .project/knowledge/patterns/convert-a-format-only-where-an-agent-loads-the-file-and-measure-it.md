---
id: convert-a-format-only-where-an-agent-loads-the-file-and-measure-it
type: pattern
created: 2026-10-19
updated: 2026-10-19
tags: [toon, token-cost, data-files, scope, measurement]
related: [a-pitch-can-pass-its-own-tests-and-break-on-the-real-file, reviewer-reports-contradicted-by-measurement, unified-toon-config-schema-v2]
source: toon-machine-data
confidence: low
---

# Pattern: convert a data file to a cheaper format only where an agent loads it, and measure the result

## Summary

The ask was "all workflow-only data should be TOON to save tokens". A grep inventory showed that almost none of it is loaded by an agent: ledgers, metrics and the graph are read by scripts or queried through them, and the only file agents open on every phase (the skill registry) belongs to another pitch's banner text. Converting script-only files saves nothing and adds risk.

## Do

- Before converting, list each candidate with its reader and the `file:line` where an agent or skill is told to open it. No such line, no conversion.
- Keep host-native files (`.claude/settings*.json`, `.codex/hooks.json`, `package.json`) in the host's format.
- Report savings with two named proxies against the file as stored and against minified JSON. If one proxy rises while the other falls, say "mixed". On this repo's prose-heavy datasets TOON beat the pretty-printed file but was mixed against minified JSON.
- Keep the golden dataset that gates the change in the old format until the new reader is proven.

---
id: default-graphify-query-can-hide-knowledge-entries
type: issue
created: 2026-11-26
updated: 2026-11-26
tags: [graphify, knowledge, search, ranking, output-budget]
related: [pitch-compaction-gate-and-recovery-design, a-report-over-an-untrusted-tree-runs-only-bundle-code]
source: fix-graphify-knowledge-query
severity: medium
confidence: high
resolved: true
---

# Issue: default Graphify queries can hide knowledge entries

Two of three pitch-compaction questions returned no knowledge file at Graphify’s default output budget. Raising the budget exposed some Markdown file nodes, while typed knowledge entries were still missing for those two questions.

The mixed graph can select seed nodes whose neighborhoods omit typed knowledge entries. It also renders seeds and nearby high-degree nodes before truncating, so reachable Markdown file nodes can disappear from the rendered answer.

The workflow wrapper now ranks typed knowledge nodes by question terms in their titles, entry IDs and tags. A plain query prepends up to five paths, then runs the native traversal. Explicit options and graphs ineligible for a bounded project read use native Graphify output.

The three pilot questions each surfaced five readable paths after the fix. The remaining stdout, stderr and exit status matched the explicit-budget baseline.

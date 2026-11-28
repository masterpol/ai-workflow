# Automated selective loading pilot

2026-11-26. Shaping experiment in a disposable harness. The original knowledge files and frozen pilot inputs were read without changes. [Machine-readable evidence](selective-routing-evidence.json)

## What ran

1. Replayed lexical selection against the three original load questions and 26 frozen questions. The specificity-biased selector missed Q24. The smoothed top-three variant surfaced the expected source in all 26 frozen questions and cost 1,956 words across the original three. On eight independently written probes, lexical selection passed four, missed or abstained on three in-scope probes, and routed an unrelated Git question to compaction. Rejected as a standalone selector.
2. A separate selector saw five short catalog descriptions and the three original questions plus eight held-out cases. It chose source IDs on ten warm cases and requested full search on the unrelated case. Independent readers answered from the selected cards and quoted their evidence.
3. The first answer to the generic ledger question applied the grouping rule without its per-file boundary. The revised experiment always adds the per-file companion when the group rule is selected. A fresh reader distinguished eligible bulk from decisions and approvals, retained the stop-and-split rule, and flagged uncertainty about specific file classes.
4. Tested the route guard in scratch. It validates known unique IDs, expands the companion, reapplies the card cap, checks source hashes, and falls back on an unknown or invalid route, a missing card, or a hash mismatch. Ten assertions passed.

## Words loaded

| Workload | Graphify five-card body baseline | Catalog and full-card route | Savings |
|---|---:|---:|---:|
| Three original questions | 3,555 | 1,628 | 54.21% |
| Eight held-out cases including fallback | 11,033 | 6,419 | 41.82% |
| All eleven cases | 14,588 | 8,047 | 44.84% |

The candidate charges the router instructions and catalog for each question, the route response, answer instructions and paths, and the full source text including frontmatter. Project rule load is zero for this checkout. The cold case also charges the native traversal and all fallback cards. It cost 2,342 words against its 1,459-word baseline. The original-threshold comparison starts with baseline card bodies only, which understates baseline cost relative to the candidate accounting.

On the original questions, loading the 204-word excerpt set before verifying the same full cards would raise load to 1,832 words. The earlier excerpt-only pass did not establish that fallback could usually be skipped. Full-card loading is the proposed first implementation.

## Scope of the result

This is a replay with one live catalog selector and independent answers against assigned cards. The 26-case count measures lexical source recall only. The ten independent warm answers were graded against their intended rule or question, including the repeated ledger check. The cold case tested routing and cost. It did not grade a Git procedure answer.

No workflow phase used the prototype in production. This measures reconstructed model-visible text, with router prompts repeated per query for accounting, and excludes transport envelopes, real latency, and billed cost. The pair comes from the planted fixture. A product catalog would need an actual source for every companion. The held-out questions were written independently after the lexical baseline was selected. The second router was run on that same set, so further development needs fresh probes.

The 30% load threshold was met for this bounded pilot. Independent use, exact-runtime fallback, the owner’s usability and cost decisions, and a test with a material exception outside the catalog remain open before adoption.

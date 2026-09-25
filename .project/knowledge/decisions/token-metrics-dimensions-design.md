---
id: token-metrics-dimensions-design
type: decision
created: 2026-09-25
updated: 2026-09-25
tags: [token-metrics, collector, report, schema, hooks, design]
related: [reversible-aggregates-store-their-routing, allow-list-untrusted-labels-at-ingest-and-at-render, async-agent-launch-hook-counted-as-completion, workflow-tooling-pitches-share-standing-no-gos-and-design-answers]
source: metrics-report-dimensions
---

# Decision: how token metrics record and report vendor, model, agent, effort and skill

## Summary

Token snapshot schema v2 adds usage dimensions. The design answers below keep the report truthful; the code is
`ai-framework/hooks/scripts/token-consumption.js` (collector) and `token-report.js` (renderer).

## Decision

**What the report says.** `.project/metrics/token-consumption.md` and `.html` open with a Usage summary (most
used vendor and model, with the basis they were ranked on), then tables by vendor, model, agent, reasoning
effort and skill. Values a harness does not report show `Unreported`; completions with no nonzero cost show
`Unpriced`. Counts start at the v2 migration date, printed in the report; nothing is back-filled.

**Rabbit-hole answers that stand:**
- Each table states its unit (OpenCode: one completion per assistant message; Claude/Codex: one per subagent
  stop). The headline ranks by reported tokens where a vendor reports them and says when tokens are
  unavailable (today Claude and Codex); per-vendor units live in a separate "By Vendor Unit" table because
  the existing "By Vendor" header is pinned by a test.
- Cost `0` reads as free, so cost ranks only over completions with a nonzero cost; the rest are `Unpriced`.
- "Effort" means reasoning effort, not the workflow's fast/standard/deep profile.
- v1→v2 migrates in place and keeps lifetime totals; older collectors cannot read a v2 file.
- Aggregates store their routing so reversal never recomputes it ([[reversible-aggregates-store-their-routing]]);
  names are allow-listed at ingest and again at render ([[allow-list-untrusted-labels-at-ingest-and-at-render]]);
  dimensions are nested by vendor in prototype-free maps with capped distinct keys and an "other" bucket.
- A skill event never enters the completion path: it has its own branch and bounded dedup ring.
- The model for Claude subagents comes from payload fields, with no transcript read (the user reserved that
  decision); if no payload has it, it shows `Unreported`.

**No-gos held (each tested):** no prompts, responses, tool arguments, skill args or transcripts stored (marker
strings grepped out of all three output files); no per-run logs or unbounded arrays (2,000 events with 9,000
character ids gave a 3 KB file); no Cursor collector and no estimated tokens or cost for Claude or Codex;
caveman-mode attribution and never-block-the-agent behavior unchanged; `.project/metrics/` stays git-ignored.

**Deviations that changed the plan:**
- D1: Claude async launches fire `PostToolUse(Agent)` at launch and `SubagentStop` at completion, so they were
  double-counted; a launch now stores only a bounded model note and `SubagentStop` reads the model from it
  ([[async-agent-launch-hook-counted-as-completion]]). Existing counts were not corrected.
- D2: the last scope (docs, doctor, end to end) was built inline, not dispatched: three small edits.
- D3: after the renderers moved out, collector coverage fell below target; tests were added (underflow guard,
  float residue at zero, lock reclaim).
- D5: audit-cycle-1 fixes added beyond the plan: name allow-list, id truncation to 128, status allow-list, cost
  and token bounds, realpath containment of `.project` and `.project/metrics`, fixed JSON-parse error text,
  `agent:`-prefixed note keys, bounded plugin session maps, and `opencode-plugin.test.js`.
- D6: the cycle-2 security re-check was never completed by a reviewer agent (rate limit, then two stalls); the
  author ran the checks and one more gap was found and fixed (agent ids shown as labels). Shipped on that basis.

## Consequences

- **Pros**: a report that cannot imply a winner it cannot measure, and a bounded, hostile-input-safe snapshot.
- **Cons**: history before migration has no dimensions; Claude/Codex show no tokens or cost.
- **Implications**: an independent security re-review of the collector remains a followup.

## References

`README.md` metrics section; [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].

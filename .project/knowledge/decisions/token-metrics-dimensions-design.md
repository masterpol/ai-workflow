---
id: token-metrics-dimensions-design
type: decision
created: 2026-09-25
updated: 2026-09-27
tags: [token-metrics, collector, report, schema, hooks, design]
related: [reversible-aggregates-store-their-routing, allow-list-untrusted-labels-at-ingest-and-at-render, async-agent-launch-hook-counted-as-completion, workflow-tooling-pitches-share-standing-no-gos-and-design-answers, false-cross-pitch-attribution-in-a-shared-uncommitted-file]
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
- D7 (`independent-rereview-catch-up`, S2, 2026-09-26): the deferred independent security re-review ran. 12 more
  fixes: a guarded snapshot reader (symlink/FIFO/non-regular refused without blocking, own skip outcome), an
  unrecognised-`schemaVersion` snapshot no longer silently overwritten, `mode` bounded and allow-listed
  (was an unbounded Markdown-link vector), `hook_event_name` allow-listed and stdin capped at 1 MB by bytes
  (the decision's "bounded snapshot" claim was false: a 3 MB event name gave a 3 MB snapshot), full snapshot-shape
  validation before any later event can throw mid-write, the renderer's allow-list widened from the agent label
  alone to every string/number/date field (vendor, model, mode, scope, dates were reaching Markdown/HTML raw),
  token counts made whole numbers (float residue could underflow a reversal and lose the event), model notes
  vendor-scoped (`agent:<vendor>:<id>`, a Claude note could otherwise be read by another vendor's completion),
  the modes.json read guarded the same way the snapshot read is, and a rejected snapshot is now kept aside as
  `token-consumption.json.rejected` instead of silently discarded. Not fixed: the plugin's own hardening
  (null-event throws, unbounded map values, `undefined/undefined` model strings — guarded in the collector
  instead, per the per-slice fix cap) and the `since`/`metricScope` collector-renderer test gap (the review
  bench's canary attempts on both were refused because they broke no test). See `review-metrics.md`.

## Consequences

- **Pros**: a report that cannot imply a winner it cannot measure, and a bounded, hostile-input-safe snapshot.
- **Cons**: history before migration has no dimensions; Claude/Codex show no tokens or cost.
- **Implications**: the independent security re-review this entry once listed as a followup is done (D7); the
  plugin's own hardening and the `since`/`metricScope` test gap are now the open followups instead.

## References

`README.md` metrics section; [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].

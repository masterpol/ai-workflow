# Appetite audit: token-time-report

Perspective: appetite-auditor (pre-bet). Declared appetite: big-batch (cap 15 files / 1,500 LOC / 1 week). Inputs: `pitch.md`, `shaping-evidence.md`, and the existing source named there. No source was changed.

## Projection

The pitch and shaping evidence list nine implementation, test and contract files: `flow-report.mts`, `flow-report.test.mts`, `flow-render.mts`, `flow-render.test.mts`, `state-pages.mts`, its existing state HTML test, `integrations/workflow-metrics.md`, `VERSION` and `CHANGELOG.md`. Checked against the breadboard's places, that list is short by at least two to four files.

- **Joiner.** The solution sketch names a "pure joiner" between store copies and the bounded tables, and the rabbit holes assign it a separate plan scope. No joiner module or test is in the nine-file list. Adding it means two more files.
- **Guarded reader and lease.** The pitch requires reuse of guarded readers for token v3 and usage v2 under one metrics lease. The lease is implemented in `ai-framework/hooks/scripts/metrics-lock.js` (per `.project/knowledge/decisions/collector-metrics-lease-design.md`). The token reader lives in `ai-framework/hooks/scripts/token-consumption.mts`, which is 1,085 lines. Reuse from a report CLI means either importing from hook code or extracting a reader. Either path adds at least one file, and extraction could touch the collector.
- **Fixtures.** Hostile-label, sparse, legacy and missing-source tests need fixture files. The pitch does not count them.

Conservative projection: 9 listed, plus 2 for the joiner, plus 1–2 for reader/lease reuse, plus about 1 for fixtures, gives 13–14 files. That is 0.87–0.93× the 15-file cap. Within cap, but close.

## LOC

The pitch states the 1,500-LOC cap but gives no LOC projection, so the bet cannot check it. Comparable existing modules give a rough scale: `workflow-metrics-report.mts` is 150 lines with a 290-line test, and `state-render.mts` is 256 lines. The flow report covers a joiner, three renderers (JSON, Markdown, HTML), lease handling, owned publication and hostile-label escaping. Rough estimate: about 1,200–1,700 LOC including tests, with an upper bound near 2,000. The conservative figure of about 1,700 is 1.13× the 1,500 cap. The upper bound is about 1.33×, which is still in the medium band. Crossing 1.4× (2,100 LOC) is plausible if the reader extraction grows. This is an estimate from module sizes, not measured data.

## Findings

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| A1 | appetite-auditor | medium | borderline | Projected 13–14 files against a 15-file big-batch cap (0.87–0.93×). The nine-file list omits the joiner module and test, the guarded reader and lease reuse, and fixtures. Add them to the budget table before the bet, and state the total as a number. |
| A2 | appetite-auditor | medium | borderline | No LOC projection exists. Rough estimate is 1,200–1,700 LOC (conservative 1,700, 1.13× the 1,500 cap), with an upper bound near 2,000. Add a per-file LOC estimate to `shaping-evidence.md` so the bet can compare against the cap. |
| A3 | appetite-auditor | medium | scope-overrun risk | Reader and lease reuse in `token-consumption.mts` and `metrics-lock.js` may require touching collector code, which the no-gos forbid ("No collector/hook/prompt changes"). Either the no-go or the reuse plan has to give. Decide before the bet: copy the minimal read logic into the report (more LOC), or extract a shared reader with an explicit, bounded exception to the no-go. |
| A4 | appetite-auditor | acknowledged | split plan | The pitch says "split if extraction exceeds appetite" but does not name a split. Pre-declare two scopes with their own caps: scope 1 is the joiner plus reader, scope 2 is render plus state-pages plus docs. This keeps the one-week appetite checkable. |
| A5 | appetite-auditor | acknowledged | time | The one-week appetite covers the joiner rules, canonical eligibility, `(none)` behaviour, interval treatment, stale-history handling, lease snapshot boundary, owned publication and hostile-label tests. This is a lot for one week. It is a timing risk, not a file-count risk. |

## Verdict

Not a clear appetite mismatch yet. The declared big-batch appetite is plausible at about 13–14 files, but the pitch's own file list is incomplete and it has no LOC projection. Those two gaps mean the bet cannot yet confirm the cap. Recommend fixing A1–A3 before the owner decides Bet / Re-shape / Pass. If the owner keeps big-batch, use the split in A4.

## Notes on evidence

- The pitch's knowledge references (`decisions/token-metrics-dimensions-design`, `decisions/collector-metrics-lease-design`) exist under `.project/knowledge/decisions/`.
- `shaping-evidence.md` cites `token-consumption.mts`. The file is at `ai-framework/hooks/scripts/token-consumption.mts`, not under `ai-framework/scripts/`. The pitch should give the full path when it names the reader.
- Source inspection covered `ai-framework/scripts/state-pages.mts` (225 lines), `state-history.mts` (259), `workflow-metrics-state.mts` (728), and the lease and token files above. `.project/metrics/` artifacts were not read beyond checking the recovery directory.

# Critique: knowledge-historian — token-time-report

Date: 2026-10-21. Perspective: knowledge-historian (pre-bet). Inputs: `pitch.md`, `shaping-evidence.md`, `seed-2026-10-19.md`, and `.project/knowledge/` (keyword sweep over issues, patterns and decisions). Source checked read-only: `ai-framework/scripts/workflow-metrics-state.mts` (`readText`, `readWorkflowState`, `withMetricsLease`, `writeAtomic`, `validateDestination`).

## Result

The pitch's "Knowledge consulted" list is good on the metrics-dimension and lease decisions, but it misses several entries that bear directly on the pitch's riskiest moves: reusing guarded readers, the owned report write, the single-lease snapshot, hostile labels as map keys and rendered text, and `/state` linking. Those entries are below. Confidence threshold is >75% relevance; entries I considered and dropped are listed at the end.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| K1 | knowledge-historian | high | missed-issue | `issues/hardening-a-shared-reader-made-its-writer-destructive`. The pitch reuses token v3 and usage v2 "guarded readers". The shared reader already returns `refused` for a symlink, unsafe or oversized state, and `missing` only for absence. A caller that collapses `refused` into `missing` or zero would silently report absence as zero. Add to "Knowledge consulted". Rabbit hole "report scope" should require that `refused` and `missing` stay distinct and that refused sources render as `Unavailable` with the reason, not as zero. |
| K2 | knowledge-historian | high | missed-pattern | `patterns/a-report-never-overwrites-a-file-it-did-not-write`. The pitch writes owned `.project/metrics/flow-report.{json,md,html}`. The multipage `/state` writer once deleted user `*.html` files that carried its marker, and later overwrote a user `index` file that shared a generated name. Owned publication must match the full generated-name set and a marker, and must refuse to replace anything else. Add to "Knowledge consulted". Extend the publication hostile-label test to a pre-existing user file at each generated name. |
| K3 | knowledge-historian | high | missed-pattern | `patterns/pin-directory-identities-across-async-leases` with `issues/metrics-ancestor-swap-during-async-lease`. The report takes one metrics lease, copies both stores, releases, then renders and publishes. Path validation before the awaited lease does not hold for the later write. Capture directory identity before waiting, recheck it after acquisition, and recheck before the publish step. The pitch states "single-lease snapshot boundary" but cites neither entry. Add both. |
| K4 | knowledge-historian | high | missed-pattern | `patterns/allow-list-untrusted-labels-at-ingest-and-at-render`. Pitch, phase and scope labels come from hook payloads and the stores, and reach HTML and Markdown output. A length bound and HTML escape are not enough; Markdown links and look-alike characters survive. The pitch's "hostile-label tests" are right but unanchored. Add the entry and require an allow-list at both ingest and render, not escaping only. |
| K5 | knowledge-historian | medium | missed-issue | `issues/counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys`. The pitch joins "in nested maps". A plain `{}` keyed by labels returns inherited `constructor` or `toString` for a pitch, phase or scope named that way, and the count becomes a string. Use `Map` or null-prototype objects for every label-keyed level, including `(none)`. Add to "Knowledge consulted". |
| K6 | knowledge-historian | medium | missed-issue | `issues/reusing-a-transaction-exposes-its-lock-reader-to-new-callers`. Same class as K1, one level down: reusing a transaction or lock reader for a new caller exposed FIFOs and huge files to the lock read. The report should call the guarded readers directly, not a write transaction. If reuse needs an exported helper, the helper should be the one the existing readers already use. |
| K7 | knowledge-historian | medium | missed-pattern | `patterns/a-writer-reinspects-the-target-at-the-publish-step`. The owned write is check, temp file, rename. The pattern says re-inspect at publish and clean up only what this writer created. Matches K2 and K3; medium because the pitch names atomic publication but not the re-inspect step. |
| K8 | knowledge-historian | medium | missed-decision | `decisions/project-state-report-design`. The pitch adds one `/state` link through `state-pages.mts` and says `/state` never generates the report. This decision already fixes how `/state` links to generated report pages (own marker, page budget, theme, untrusted-value re-emit). Read it before the link is planned so the flow page follows the same contract. |

## Evidence checked in source

- `ai-framework/scripts/workflow-metrics-state.mts:560` `readText` returns `refused` for a symlink, non-regular file or oversize state, and opens with `O_NOFOLLOW` and `O_NONBLOCK`. This already encodes the K1 lesson, so the report reader should reuse it with its three-way status intact.
- `workflow-metrics-state.mts:543` `metricsDirectory` resolves the real path and refuses a non-directory ancestor. The report's owned output must go through the same resolution, not a fresh `path.join`.
- `workflow-metrics-state.mts:617` `writeAtomic` and `:613` `validateDestination` refuse a symlink or non-file destination. They do not check for a user file at a generated name, so K2 needs a report-level check on top.
- `withMetricsLease` at `:646` returns a `written: false` result on refusal. The pitch's "fail closed" must therefore render the snapshot as unavailable on refusal, not as a partial result.
- `state-pages.mts` exports only `GENERATOR_MARKER`, `PAGE_NAMES`, `PAGE_BYTE_CAP` and `createStatePages`. The `/state` link should reuse that marker and page-name contract, consistent with K8.

## Projected budget (historian contribution)

The pitch projects 9 files against a 15-file cap. The missed entries add scope in three places, none of which breaks the cap if the plan holds:

- Report-scope tests for K2, K3 and K7: one owned-write test file with a user-file-at-generated-name case and a symlinked-ancestor-after-lease case. These fit inside `flow-report.test.mts`, so no new file.
- Label tests for K4 and K5: prototype-key and hostile-label cases in `flow-report.test.mts` and `flow-render.test.mts`. No new file.
- Possible reader helper for K1 and K6: if the guarded-reader reuse needs an exported helper from `workflow-metrics-state.mts`, that is one more source file and one more test file. Projection becomes 11, still under 15. If the helper also touches the token v3 reader, projection is 12. Stop and split if it passes 13.

Net: 9 projected, 9 to 12 with the missed entries, cap 15. Flag the reader helper as the swing item for the appetite reviewer.

## Considered and dropped

- `patterns/a-lease-refused-capture-leaves-a-bounded-marker-for-the-next-lease`: concerns capture-side drop counting, not the report read. Confidence low.
- `patterns/read-before-the-lease-commit-cursor-and-totals-together`: concerns transcript cursors in the collector. The report does not advance a cursor, so not applicable.
- `issues/native-capture-needs-state-boundary-attribution`: capture-side. Its `(none)` and sentinel lessons overlap the pitch's existing "(other)/(unknown)/(unattributed) never match" rule, so nothing new to add.

## Knowledge consulted is not comprehensive

Five of the pitch's cited entries are right. The eight findings above are the misses. The highest-value additions are K1 through K4, because each maps to a failure class that has already recurred in this repository.

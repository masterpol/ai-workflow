# P2c-S3 batch 4 — apply preview

Prepared 2026-10-22 after owner approval of source review for the two named pitches. This is the apply gate. No batch-4 live upgrade has run, nothing was published to live records, and nothing was committed.

## Exact proposed actions

Publish the two staged source supplements under .project/records/legacy-upgrades, then apply each exact proposed payload through legacy-upgrade.mts. Each upgrade preserves original v1 bytes in a sibling, writes its validated v2 ledger and lint-clean outcome, updates the generated index, retires only its bound legacy narrative and rebuilds/checks the graph. Required archive verification reads receive explicit per-invocation receipts before I/O. Original archives, compact records and historical durable targets remain unchanged.

Approval covers only the two slugs below, their exact staged supplements and payloads, and the archive-verification reads required to apply and verify them. Other campaign slugs retain separate gates.

## Coverage and omissions

| Pitch | Retained / required sections | Coverage | Other files | Whole-file omissions | Outcome bytes / cap |
|---|---:|---:|---|---:|---:|
| state-quoted-fonts | 11/11 | 100.00% | 6/7 retained, 7/7 accounted | 1 | 1121/3000 |
| workflow-usage-metrics | 17/22 | 77.27% | 19/33 retained, 33/33 accounted | 14 | 1614/3000 |

All 33 required sections and 40 other files have explicit, original-hash-bound judgments (80,519 source bytes across 41 files). Retained section coverage is 28/33 (84.85%); all required items are accounted for. There are five omitted sections and 15 omitted whole files: 20 process-noise omissions, no other reason. There are no accepted gaps or other-reason omissions and no new knowledge entries. state-quoted-fonts deviations.md is merged (it records no deviation), not omitted. Every body and file hash is the value computed by the real bodyHashOf with the runtime sha256Hex; the reviewers' own computed section hashes matched them for all 33 sections. Destinations are only each pitch's unchanged compact record or its own staged supplement, so each binding is one of two hashes.

Exact omissions:

- state-quoted-fonts / hill.md — process-noise: all scopes done; positions superseded by the shipped record.
- workflow-usage-metrics / log.md#2026-10-08-s1-start — process-noise: approval and test-strategy narrative, repeated by retained sections.
- workflow-usage-metrics / log.md#s1-verification-attempt-1 — process-noise: two fixture and assertion mistakes fixed in the same slice.
- workflow-usage-metrics / log.md#s1-exit-evidence-complete — process-noise: command and count log superseded by the final 156/156 evidence in the retained sections.
- workflow-usage-metrics / log.md#s2-start-approved — process-noise: approval note; its D2 prerequisite is retained as deviation D2.
- workflow-usage-metrics / log.md#s3-start-approved — process-noise: approval note and a transient failure retained in the compatibility and limitations records.
- workflow-usage-metrics / audit-prompts/*.txt (13 files: code, conflicts, coverage, cycle2-code, cycle2-coverage, cycle2-security, cycle2-ux, cycle3-code-verify, cycle3-code, cycle3-coverage, cycle3-security, security, ux) — process-noise: exact reviewer dispatch text; provenance stays recoverable from each retained review record.
- workflow-usage-metrics / hill.md — process-noise: scope positions superseded by the shipped record.

Within retained files, repeated counts, scratch paths and scheduling add no further shipped behavior. The plan's bounded state limits (512 event keys, 30 daily buckets, 4 MiB files and the rest) are retained in the supplement as historical plan values and point to the current workflow metrics guide, which still lists the same bounds. The ledger records whole-file disposition; each supplement describes the relevant historical exclusions.

## Source-review findings retained

- State quoted fonts: the problem statement, the one-scope sequential plan with medium risk, the twelve-suite verification and the distinct 85, 101 and 286 test counts, the mutation proof, the reviewed module scope, and the ship-approval wording contradiction in the audit text. Source names use .js modules; current files are .mts.
- Workflow usage metrics: the user-requested narrowing to useful metrics, the legacy collector problem figures, historical state bounds, the audit triage M1, M2, S1 to S8 and refuted F1, independence and guard notes, count reconciliation (graph 41 versus 44 entries, delivery sizes of six and ten files, test counts 20, 33, 37, 38 in suites of 108, 138 and 156, 36/37 overflow fix), transient legacy failures and the unconfigured native capture.

## Exact proposed outcomes

Outcome links resolve from project root. Supplement Markdown links resolve from the final records/legacy-upgrades directory; they intentionally do not resolve from the staging directory. Historical verification is distinguished from current checks.

### state-quoted-fonts

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/state-quoted-fonts.md)

```markdown
---
slug: state-quoted-fonts
shipped: 2026-09-26
schemaVersion: 1
---
# state-quoted-fonts

The state report accepts ordinary quoted font families and one same-file CSS variable hop.
Values are re-emitted in canonical form and validated again at render time.
Historical counts and naming differences remain separately recorded.

- outcome: Quoted font families and same-file variables resolve to the project's own typeface in the state report.
- docs: none
- decisions: [bounded font discovery](.project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md)
- knowledge: [bounded font discovery](.project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md)
- code: [theme parser](ai-framework/scripts/state-theme.mts)
- verification: [historical closure](.project/records/pitch-compression/state-quoted-fonts.md), [mutation proof](.project/records/legacy-upgrades/state-quoted-fonts.md#mutation-proof)
- followups: none
- archive: [compact record](.project/records/pitch-compression/state-quoted-fonts.md), [source supplement](.project/records/legacy-upgrades/state-quoted-fonts.md)
```

### workflow-usage-metrics

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/workflow-usage-metrics.md)

```markdown
---
slug: workflow-usage-metrics
shipped: 2026-10-08
schemaVersion: 1
---
# workflow-usage-metrics

A bounded workflow usage metrics core records useful events and produces JSON, Markdown and HTML reports.
It keeps usage, outcomes, observed elapsed duration and collection health, with no token or cost data.
Native capture, adoption and historical bounds are recorded separately.

- outcome: Workflow usage events can be recorded and reported from bounded, guarded local state.
- docs: [workflow metrics guide](ai-framework/integrations/workflow-metrics.md)
- decisions: [scope and revision](.project/records/legacy-upgrades/workflow-usage-metrics.md#scope-and-revision)
- knowledge: [display buckets](.project/knowledge/patterns/display-buckets-are-not-lifecycle-identities.md), [pinned identities](.project/knowledge/patterns/pin-directory-identities-across-async-leases.md), [ancestor swap](.project/knowledge/issues/metrics-ancestor-swap-during-async-lease.md)
- code: [state](ai-framework/scripts/workflow-metrics-state.mts), [report](ai-framework/scripts/workflow-metrics-report.mts), [CLI](ai-framework/scripts/workflow-metrics.mts)
- verification: [historical closure](.project/records/pitch-compression/workflow-usage-metrics.md), [audit triage](.project/records/legacy-upgrades/workflow-usage-metrics.md#audit-triage-and-provenance)
- followups: [limitations](.project/records/legacy-upgrades/workflow-usage-metrics.md#limitations)
- archive: [compact record](.project/records/pitch-compression/workflow-usage-metrics.md), [source supplement](.project/records/legacy-upgrades/workflow-usage-metrics.md)
```

## Validation and proof boundaries

Both original archives were fully verified earlier after receipt logging, with 80,519 bytes across 41 source files. Reviewer analysis used private verified copies. Every proposed section and file hash is the normalized body hash the apply tool derives from the archived bytes. No archive was reopened for projected validation or synthetic rehearsal.

Shared validator, outcome lint and supplement link checks in projected final locations:

```text
{"slug":"state-quoted-fonts","coverage":1,"sections":11,"otherFiles":7,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1121,"recordCap":3000,"supplementBytes":2025,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"workflow-usage-metrics","coverage":0.7727272727272727,"sections":22,"otherFiles":33,"omissions":{"process-noise":19},"acceptedGaps":[],"recordBytes":1614,"recordCap":3000,"supplementBytes":4973,"projectedValidation":"passed","supplementLinks":"passed"}
{"newKnowledgeEntries":0,"sourceArchivesReopened":false}
```

Isolated real apply/replay rehearsal against synthetic archives reconstructed from the verified source copies (dry run leaves state legacy, real apply, v2 status, outcome lint, v1 byte retention, archive verify, archive bytes unchanged, replay, index and narrative retirement, supplement docs-links):

```text
state-quoted-fonts: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
workflow-usage-metrics: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
Rehearsal: 2 generated index rows, 2 upgraded slugs; real bundle graph commands with fixture Graphify extraction; live archives not reopened
```

The fixture used a real Git commitment for v1 ledgers, the real knowledge tree for the graph validator, and real bundle graph rebuild/check commands with a fixture Graphify supplying an empty extraction base. This proves transaction, validator, lint, v1 retention, archive integrity and replay paths. Live one-hop graph reachability, root immutable-source snapshots and final live exits remain required after apply approval. No live ledger, index or record was touched.

Live status remains 33 legacy, zero partial and 13 upgraded; compacted-slug dual reading counts 46 once. This gate does not approve shipping.

Boundary note: the first rehearsal failed on the reviewer's class "pointer" for SHIPPED.md#knowledge-and-followups (not in the closed class list); it was recorded as know-how. The reviewer's draft claim that four planned scopes became three is not stated in the sources and was dropped. No archive directory was opened, listed or searched, and no broad search over .project was run.

## Metrics validation

Machine-readable proof: [preview evidence](2026-10-22-p2c-s3-batch4-preview-evidence.toon). Observed workflow events are recorded, while automatic primary Codex token/cost capture remains unavailable; no missing usage or historical duration is fabricated.

## Decision

Approve / Revise / Back / Stop. Approval publishes these two exact supplements and applies these two exact payloads, including receipt-gated archive reads for required verification.

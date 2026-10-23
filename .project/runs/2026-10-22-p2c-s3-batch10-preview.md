# P2c-S3/S4 batch 10 — exact apply preview

Prepared 2026-10-22 after owner approval of the [five named source reviews](2026-10-22-p2c-s3-batch10-source-request.md). **No batch-10 live apply has run. Live remains 37 upgraded / 9 legacy / 0 partial.**

## Exact proposed actions

Publish the five exact staged supplements, then apply each exact proposed payload through legacy-upgrade.mts, with ten reviewed destination-drift pairs and explicit per-slug receipts before required archive verification reads. Preserve original v1 ledgers as siblings, validate/commit v2, publish lint-clean outcomes, regenerate index, retire only the bound legacy narratives and rebuild/check graph. Approval includes the five named slugs and their exact payload/supplement/drift hashes; no approval of other slugs, historical rewrites, test repair, public publication or shipment.

## Source coverage

| Pitch | Retained/required sections | Other files retained/accounted | Full source files | Source bytes | Outcome bytes/3000 | Supplement bytes |
|---|---:|---:|---:|---:|---:|---:|
| codex-orca-coordinator-parity | 20/20 | 14/15 | 17 | 88088 | 1183 | 19101 |
| state-multipage-report | 18/18 | 4/6 | 9 | 39615 | 1139 | 40677 |
| collector-robustness | 20/20 | 12/13 | 15 | 43776 | 1067 | 15766 |
| fix-orca-dispatch-resume-gate | 16/16 | 2/2 | 3 | 15955 | 1175 | 11077 |
| metrics-report-dimensions | 18/18 | 9/10 | 12 | 63412 | 1155 | 19007 |

All **92/92** original source sections retained. All **46/46** other files accounted (41 retained; 5 omitted). No accepted gaps. Reviewers read every file and every section body in full, in bounded untruncated batches with read ledgers: **56 files / 250846 UTF-8 bytes**. Main thread reviewed mapping/anchor/link checks and substantive drift diffs.

The metrics-report-dimensions original v1 ledger/draft lists 17 sections; the verified full source has 18. The additional pitch.md#no-gos is now retained and hash-bound. The shared validator requires every recoverable section, so neither that section nor its source boundaries were discarded to match the legacy inventory. The approved source-request count of 17 is kept as history.

## Closed omission reasons

- codex-orca-coordinator-parity/hill.md: process-noise
- state-multipage-report/SHIPPED.md: superseded
- state-multipage-report/hill.md: process-noise
- collector-robustness/hill.md: process-noise
- metrics-report-dimensions/hill.md: process-noise

Five omitted file entries: four hill charts as process-noise, one SHIPPED superseded by its verified byte-identical tracked run. No source section omitted. Meaningful hill/source facts are retained in the corresponding supplement. No omitted unread content.

## Durable copies and historical corrections

Main thread rechecked state-multipage-report SHIPPED.md byte-identical to .project/runs/2026-10-08-state-multipage-report.md; its eight shipped sections may map there. Codex parity run contains full SHIPPED/log bodies as exact constituent blocks but is longer than either; all its mapping destinations use the supplement. Collector, fix-resume-gate and metrics run files differ from their cached bodies and are supporting history only, not lossless substitutes. Every existing linked target is git-tracked. New supplements are staged, not claimed already tracked.

Historical contradictions remain explicit: parity local versus UTC ship dates and unverified trusted-host activation; multipage one-time legacy unmarked-page exception, abandoned deletion/all-or-nothing assumptions and 2.19.0 versus final 2.19.1; collector abandoned age-based/pathname-lock guarantees, suspected versus asserted collision causation, missing critique and 39-call reviewer versus 35-call budget; fix-resume Bun 66 versus final Node 23+44, reverted mistaken template restore and inline/no-canary review; metrics staged counts, source claims not all reproduced before fixing, later D7 duplicate-merge re-review and mutation/author-proof limits. Original narratives are retired only after their retained content has durable destinations.

## Reviewed destination drift

Ten exact introducing-commit/current pairs; later edits refuse. Guide changes include later schema-3 TOON, role pools/self-worker/concurrency/version support, startup validation, OpenCode service handling and assignment/refusal contracts. Knowledge-card changes add later verification and secret-read resolution, not changes silently backdated into the older pitch. Backlog drift retains original deferrals and later resolutions. Testing additions are later guard/schema/mutant/realpath and runtime-redirection proof rules, not a retroactive claim that older audits followed them.

| Pitch | Destination | Committed hash | Current hash | Reviewed reason |
|---|---|---|---|---|
| codex-orca-coordinator-parity | .project/pitches/_followups.md | sha256:c782dfa790aea9b7d5d74ec51fa2937718e8ae348738ac13bbf6e290f1a74d23 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Against introducing commit 1db913a: +218/-2 lines; the two removed lines belong to other pitches and were replaced with resolution annotations. This pitch’s four-bullet section is byte-identical; later additions note guard resolution and trusted-hook/coverage candidate work. Historical source is preserved in supplement, backlog is not a durable destination. |
| codex-orca-coordinator-parity | ai-framework/integrations/orca-vendors.md | sha256:a5e59f1eed3e9b02c11b1a109a9e7f014ec4fc79daa26384f0f49009fefda075 | sha256:80cd5074f41697a305a921d3495fa9783929980a6503c61a47faac1df4308658 | Against 1db913a: +95/-16 lines; later TOON config migration, semver policy/runtime floor, pools/self-worker/concurrency, assignment/overlap, OpenCode service management, wiring diagnostics and explicit exit/refusal contract. Codex startup/coordinator-preparation block is byte-identical; supplement preserves old runtime evidence limits. |
| codex-orca-coordinator-parity | .project/knowledge/issues/substring-hook-wiring-check-accepts-echoed-commands.md | sha256:cfad1dddc16d160e90ac05bb9e669867dfb34fe5856e7b061607da8048276953 | sha256:53e9e895db5b43de53132ddf24003ed027eeccbf9234237cf252bfc3da1d435b | Against 1db913a: +6/-2 lines; updated 2026-10-21 and confidence low→medium, plus Additional evidence for capture S5 eight registrations and command-comparison mutant. Original issue/fix text unchanged. |
| codex-orca-coordinator-parity | .project/knowledge/issues/review-guard-hashes-ignored-secret-files.md | sha256:d61174b6b20e3cfc2b4dabe17803740c23d66cfc46cc17b99de544dad01822bd | sha256:9bb2a4fef4ce8f92551060f5dd5fbeb50f8a7a7971c88832c70e41f170975cdb | Against 1db913a: +7/-3 lines; updated 2026-10-21, resolved false→true, confidence low→high, plus token-time-report production SECRET_NAME-before-read resolution. Original historical incident remains, supplement distinguishes then-unresolved from later-fixed. |
| state-multipage-report | .project/pitches/_followups.md | sha256:c782dfa790aea9b7d5d74ec51fa2937718e8ae348738ac13bbf6e290f1a74d23 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Against pitch ship commit 1db913a2bc2a7fbcd97c358984916ee21097422d, +218/-2 lines reflect later additions and resolutions; this pitch runner item is struck through as resolved 2026-10-17, other own bullets persist. Retain original deferral and later resolution as history. |
| collector-robustness | .project/pitches/_followups.md | sha256:eb312706f32024d85f513bdd7c3d619631872908ee044b3ca25716842360f24f | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Introducing commit 3be89c081f9c10c281a51bc48e0ed505d2a62214 versus current: +311/-0 lines. Metrics lease followup and candidate-table sections are byte-identical; later unrelated additions do not alter this pitch history. Lease decision hash unchanged. |
| fix-orca-dispatch-resume-gate | .project/pitches/_followups.md | sha256:c782dfa790aea9b7d5d74ec51fa2937718e8ae348738ac13bbf6e290f1a74d23 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Reviewed +218/-2 backlog lines; two removals resolve unrelated historical items and new sections record later work. This pitch service-probe/Bun limits remain retained in the supplement. |
| fix-orca-dispatch-resume-gate | ai-framework/integrations/orca-vendors.md | sha256:a5e59f1eed3e9b02c11b1a109a9e7f014ec4fc79daa26384f0f49009fefda075 | sha256:80cd5074f41697a305a921d3495fa9783929980a6503c61a47faac1df4308658 | Reviewed guide evolution to schema-3 TOON, expanded roles/pools/concurrency and version ranges, exact startup checks, OpenCode service handling, assignment/overlap and structured refusal rules. Original gate/repeat-vendor semantics preserved as historical behavior. |
| metrics-report-dimensions | .project/pitches/_followups.md | sha256:97f0c9adc832628e116a53a7dee18cdf1f582155487c07d5b27b67bf05b1a16c | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Against introducing ea82bce, +319/-0 lines are later backlog additions; original hook verification remains. Preserve original deferrals and later D7/lease developments as historical sequence. |
| metrics-report-dimensions | ai-framework/rules/testing.md | sha256:6087a3ed65b7bac31ef0235a18e25b3b1dd2217d4f37a87e4225da14ada456e2 | sha256:fdc77ea6b96206e672fc82d1417597a9a20e1f49a869a87decff997cea8023e4 | Against introducing ea82bce, +54/-0 lines add later guard/lifecycle/schema/macOS and runtime-redirection rules; original 2026-09-25 mutation/review-fix promotion remains unchanged. Do not attribute later additions to this pitch. |

## Current-session isolated evidence

Five real transaction rehearsals against synthetic archives reconstructed from already verified caches. Each fixture uses Git-committed original v1/destination bytes, then reviewed live drift; validates shared v2 schema and outcome lint, dry-run, real apply, replay, v1-byte preservation, archive validity/immutability, index row, narrative retirement, eight unchanged neighboring narratives and supplement links. Every drift path rejects wrong committed/current hashes and an edit after review; absent acceptance rejects too, **35 negative controls total**, leaving state unchanged. Live archives were not reopened for rehearsal. Fixture Graphify supplies an empty extraction base while real bundle graph validation runs. This is transaction evidence, not a new certification of the original product or live host.

```text
codex-orca-coordinator-parity: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (13 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links 1 file(s) checked, 0 broken link(s); 8 neighbouring done-work entries byte-identical
state-multipage-report: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (4 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links 1 file(s) checked, 0 broken link(s); 8 neighbouring done-work entries byte-identical
collector-robustness: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (4 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links 1 file(s) checked, 0 broken link(s); 8 neighbouring done-work entries byte-identical
fix-orca-dispatch-resume-gate: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (7 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links 1 file(s) checked, 0 broken link(s); 8 neighbouring done-work entries byte-identical
metrics-report-dimensions: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (7 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links 1 file(s) checked, 0 broken link(s); 8 neighbouring done-work entries byte-identical
```

Main generated hashes with the shared bodyHashOf from original cached bodies, checked all destination anchors/helps bounds, tracked links, draft ledger/narrative bindings and existing destination hashes. The live apply and final live checks remain pending approval. No production code changed; full suite not rerun for staging data. The separate historical live-evidence path failure remains unresolved and no timing guard or failed claim was weakened.

## Exact outcomes and review samples

### codex-orca-coordinator-parity

Exact payload · [Full source supplement](../records/legacy-upgrades/codex-orca-coordinator-parity.md)

Payload hash: sha256:2fe55c4c573a9c66be82084bf7dd9971b70cb8b48863495a10a89e2c874b67d7. Supplement hash: sha256:ddec0fa289bb96213842755449ee63afa7bfa976decca27f67769de001595ee4.

```markdown
---
slug: codex-orca-coordinator-parity
shipped: 2026-10-09
schemaVersion: 1
---
# codex-orca-coordinator-parity

Codex phase startup and coordinator adapters retain explicit identity, completion and readiness boundaries.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: Codex phase startup and coordinator adapters retain explicit identity, completion and readiness boundaries.
- docs: [source supplement](.project/records/legacy-upgrades/codex-orca-coordinator-parity.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/codex-orca-coordinator-parity.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/codex-orca-coordinator-parity.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/codex-orca-coordinator-parity.md)
- followups: [retained limits](.project/records/legacy-upgrades/codex-orca-coordinator-parity.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/codex-orca-coordinator-parity.md)
```

Mapping sample (ten rows, or all if fewer):

- SHIPPED.md#approval-and-reconciliation → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#scope-and-contract; decision/merged; Retains ship authority, single-scope reconciliation, appetite and no-commit boundary.
- SHIPPED.md#final-verify → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#verification-contract-and-chronology; behavior/merged; Preserves final targeted checks, coverage, counts and settlement evidence boundaries.
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#scope-and-contract; rule/merged; Retains shipped exclusion boundaries and required mirror invariant.
- SHIPPED.md#rabbit-holes-and-limits → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#host-and-bootstrap-limits; limit/merged; Keeps readiness, host activation, bootstrap and secret-guard boundaries distinct.
- SHIPPED.md#knowledge-and-followups → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#knowledge-and-followups; decision/merged; Preserves four original followups and their later historical resolution context.
- SHIPPED.md#docs → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#scope-and-contract; decision/merged; Records adapter-only documentation scope and preservation of the dated handoff.
- pitch.md#no-gos → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#scope-and-contract; rule/merged; Retains original scope exclusions alongside the approved adapter contract.
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#scope-and-contract; know-how/merged; Preserves ready-but-unbound recovery and coordinator-owned root/parser/deadline risks.
- audit-cycle-1.md → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#audit-method-and-attribution; know-how/merged; Retains canary isolation, reviewer limits, verified findings and rejected attributions.
- audit-cycle-2.md → .project/records/legacy-upgrades/codex-orca-coordinator-parity.md#findings-and-dispositions; know-how/merged; Preserves S1–S6 final dispositions, exact guard proof and limits of audit evidence.

Review notes:

- Run file is not whole-file byte-identical to either SHIPPED.md or log.md; both complete cached bodies are verified byte-identical constituent blocks.
- Narrative October 9 ship versus local October 8 is explicitly reconciled as UTC release date.
- Staged file-line/test/coverage/graph counts preserved; all independence labels remain no despite inconsistent rationale prose.

### state-multipage-report

Exact payload · [Full source supplement](../records/legacy-upgrades/state-multipage-report.md)

Payload hash: sha256:0006172faad5b52c32b673d850fa46d04471f04ab907a89e66d442d7f4685926. Supplement hash: sha256:dd0ddb9daa6633657f6359d8ef173d9ce40eb1cf6d34f59c3ac97a2942b4bda6.

```markdown
---
slug: state-multipage-report
shipped: 2026-10-08
schemaVersion: 1
---
# state-multipage-report

State reporting splits into bounded linked static pages with guarded publication and documented migration limits.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: State reporting splits into bounded linked static pages with guarded publication and documented migration limits.
- docs: [source supplement](.project/records/legacy-upgrades/state-multipage-report.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/state-multipage-report.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/state-multipage-report.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/state-multipage-report.md)
- followups: [retained limits](.project/records/legacy-upgrades/state-multipage-report.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/state-multipage-report.md)
```

Mapping sample (ten rows, or all if fewer):

- SHIPPED.md#pitch-implementation → .project/runs/2026-10-08-state-multipage-report.md; behavior/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- SHIPPED.md#scopes → .project/runs/2026-10-08-state-multipage-report.md; know-how/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- SHIPPED.md#no-gos-honored → .project/runs/2026-10-08-state-multipage-report.md; rule/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- SHIPPED.md#rabbit-holes → .project/runs/2026-10-08-state-multipage-report.md; limit/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- SHIPPED.md#deviations-see-deviationsmd → .project/runs/2026-10-08-state-multipage-report.md; decision/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- SHIPPED.md#verification-at-ship → .project/runs/2026-10-08-state-multipage-report.md; know-how/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- SHIPPED.md#knowledge-extracted → .project/runs/2026-10-08-state-multipage-report.md; know-how/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- SHIPPED.md#followups → .project/runs/2026-10-08-state-multipage-report.md; know-how/merged; Retains the byte-identical final ship account, including implementation, verification and historical limits.
- pitch.md#no-gos → .project/records/legacy-upgrades/state-multipage-report.md#pitch-decisions-and-constraints; rule/merged; Preserves the full source account with historical corrections, evidence limits and deferred decisions.
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/state-multipage-report.md#pitch-decisions-and-constraints; decision/merged; Preserves the full source account with historical corrections, evidence limits and deferred decisions.

Review notes:

- The done-work marker-only summary omits the documented one-time legacy unmarked-page exception.
- Pitch stale-page deletion, dispatchReady fallback and early Orca explanations were superseded; preserve the correction sequence.
- Hill/log v2.19.0 precedes final v2.19.1; phase test totals are checkpoints.

### collector-robustness

Exact payload · [Full source supplement](../records/legacy-upgrades/collector-robustness.md)

Payload hash: sha256:5fb25da817dfbcfdecb3f39cb4f1b3dce62e797cb1bc81e5698d019f5e69c5aa. Supplement hash: sha256:0ddcbde2663e8e3e934f02add64482c451d6fb9742617066b944664609a930e1.

```markdown
---
slug: collector-robustness
shipped: 2026-09-27
schemaVersion: 1
---
# collector-robustness

The metrics lease is redesigned with measured failure and filesystem limits retained.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: The metrics lease is redesigned with measured failure and filesystem limits retained.
- docs: [source supplement](.project/records/legacy-upgrades/collector-robustness.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/collector-robustness.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/collector-robustness.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/collector-robustness.md)
- followups: [retained limits](.project/records/legacy-upgrades/collector-robustness.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/collector-robustness.md)
```

Mapping sample (ten rows, or all if fewer):

- SHIPPED.md#scope-reconciliation → .project/records/legacy-upgrades/collector-robustness.md#delivered-contract; behavior/merged; Preserves SHIPPED.md#scope-reconciliation with behavior, chronology and evidence limits.
- SHIPPED.md#confidence-read-this-before-relying-on-it → .project/records/legacy-upgrades/collector-robustness.md#confidence-and-followups; limit/merged; Preserves SHIPPED.md#confidence-read-this-before-relying-on-it with behavior, chronology and evidence limits.
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/collector-robustness.md#delivered-contract; rule/merged; Preserves SHIPPED.md#no-gos-honored with behavior, chronology and evidence limits.
- SHIPPED.md#rabbit-holes-resolved-as-committed → .project/records/legacy-upgrades/collector-robustness.md#identity-and-migration; know-how/merged; Preserves SHIPPED.md#rabbit-holes-resolved-as-committed with behavior, chronology and evidence limits.
- SHIPPED.md#deviations-see-deviationsmd → .project/records/legacy-upgrades/collector-robustness.md#retired-lock-and-planning-contradictions; decision/merged; Preserves SHIPPED.md#deviations-see-deviationsmd with behavior, chronology and evidence limits.
- SHIPPED.md#audit-findings-final-disposition → .project/records/legacy-upgrades/collector-robustness.md#audit-findings-and-method; know-how/merged; Preserves SHIPPED.md#audit-findings-final-disposition with behavior, chronology and evidence limits.
- SHIPPED.md#knowledge-extracted → .project/knowledge/decisions/collector-metrics-lease-design.md; know-how/merged; Locates the durable lease ownership decision.
- SHIPPED.md#followups → .project/records/legacy-upgrades/collector-robustness.md#confidence-and-followups; limit/merged; Preserves SHIPPED.md#followups with behavior, chronology and evidence limits.
- pitch.md#no-gos → .project/records/legacy-upgrades/collector-robustness.md#delivered-contract; rule/merged; Preserves pitch.md#no-gos with behavior, chronology and evidence limits.
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/collector-robustness.md#retired-lock-and-planning-contradictions; decision/merged; Preserves pitch.md#rabbit-holes with behavior, chronology and evidence limits.

Review notes:

- Collision causation is asserted in D5 but only suspected without captured output in log and confidence section; narrative must retain uncertainty.
- Initial pitch age authority and replacement-safe pathname promise were disproved; completion contract superseded them.
- Completion draft required separate critique but approval proceeded without it.
- Ten/eleven lock tests and 403/404 suite counts reflect pre/post audit stages.
- Coverage prompt capped 35 calls but dispatch table reports 39.
- Short run record is not byte-identical to SHIPPED.md; do not claim whole-copy supersession.

### fix-orca-dispatch-resume-gate

Exact payload · [Full source supplement](../records/legacy-upgrades/fix-orca-dispatch-resume-gate.md)

Payload hash: sha256:e7c80051ec25baca7672620324121ed07ad48b1e142abdb92246378a3d155290. Supplement hash: sha256:98452a6c274bb6a1db8ebd3a433c49cdbfcb3e6a5e90c06e3fe404e8da2c7157.

```markdown
---
slug: fix-orca-dispatch-resume-gate
shipped: 2026-10-08
schemaVersion: 1
---
# fix-orca-dispatch-resume-gate

Orca replay rechecks current policy before resume, and status accepts distinct repeated vendor options.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: Orca replay rechecks current policy before resume, and status accepts distinct repeated vendor options.
- docs: [source supplement](.project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md)
- followups: [retained limits](.project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md)
```

Mapping sample (ten rows, or all if fewer):

- SHIPPED.md#scopes → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#what-shipped; behavior/merged; F1 rechecks policy/switch before resume; F2 permits distinct status vendors and rejects repeats elsewhere.
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#standing-constraints; limit/merged; No schema change, new rule, live worker or runtime secret-file reads; existing pattern reused.
- SHIPPED.md#rabbit-holes → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#incidents-and-lessons; know-how/merged; Resume semantics kept; environmental OpenCode port warning and wrongly restored template preserved.
- SHIPPED.md#verification-final-gauntlet-all-six-phases → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#verification-history; know-how/merged; Final Node 1037 pass, one skip; scoped Bun 66; validators and N/A build commands retained.
- SHIPPED.md#followups-generated → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#limits-and-open-items; limit/merged; OpenCode config-probe service conflict and unverified full Bun parity remain explicit.
- SHIPPED.md#doc-updates → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#contract-and-later-drift; decision/merged; Vendor guide already described status/resume, so this ship did not change it; stack prose was corrected.
- audit-cycle-1.md → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#audit-history; know-how/merged; Inline code/security/coverage pass, no scratch/canary, nine regression cases and skipped roles preserved.
- log.md#bug-resume-existing-skips-policy-gate → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#root-cause-and-fix; know-how/merged; Replay of unknown-liveness attempt skipped policy checks and returned resume-shaped success.
- log.md#fix → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#root-cause-and-fix; decision/merged; Recheck switch and evaluateLaunch before ledger resume; status vendor list remains command-specific.
- log.md#files-changed → .project/records/legacy-upgrades/fix-orca-dispatch-resume-gate.md#what-shipped; know-how/merged; Preserves ownership of two source files and their regression tests, with branch cases.

Review notes:

- Original bug evidence, intermediate wrong restoration, inline-review limits and conflicting suite counts are retained in the supplement.

### metrics-report-dimensions

Exact payload · [Full source supplement](../records/legacy-upgrades/metrics-report-dimensions.md)

Payload hash: sha256:2d071207dd90db9ae538c4e4ffde70075824f7d1c07884832369630d767b5f88. Supplement hash: sha256:ab3ef0e3261beaa185f3b1ddef76d53671ef8fffe77de8a4b4fb22ed4aad2b71.

```markdown
---
slug: metrics-report-dimensions
shipped: 2026-09-25
schemaVersion: 1
---
# metrics-report-dimensions

Token reporting adds bounded dimensions and explicit reporting coverage with collector and output safeguards.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: Token reporting adds bounded dimensions and explicit reporting coverage with collector and output safeguards.
- docs: [source supplement](.project/records/legacy-upgrades/metrics-report-dimensions.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/metrics-report-dimensions.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/metrics-report-dimensions.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/metrics-report-dimensions.md)
- followups: [retained limits](.project/records/legacy-upgrades/metrics-report-dimensions.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/metrics-report-dimensions.md)
```

Mapping sample (ten rows, or all if fewer):

- SHIPPED.md#what-changed-for-the-user → .project/records/legacy-upgrades/metrics-report-dimensions.md#behavior-and-schema-contract; behavior/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- SHIPPED.md#scope-reconciliation → .project/records/legacy-upgrades/metrics-report-dimensions.md#verification-timeline-and-evidence-limits; know-how/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- SHIPPED.md#audit → .project/records/legacy-upgrades/metrics-report-dimensions.md#audit-cycle-2; decision/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/metrics-report-dimensions.md#constraints-and-bounds; rule/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- SHIPPED.md#rabbit-holes → .project/records/legacy-upgrades/metrics-report-dimensions.md#behavior-and-schema-contract; decision/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- SHIPPED.md#deviations-deviationsmd → .project/records/legacy-upgrades/metrics-report-dimensions.md#scope-execution-and-deviations; decision/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- SHIPPED.md#followups-generated-pitchesfollowupsmd → .project/records/legacy-upgrades/metrics-report-dimensions.md#followups-lessons-and-later-history; know-how/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- SHIPPED.md#notes-for-cooldown → .project/records/legacy-upgrades/metrics-report-dimensions.md#followups-lessons-and-later-history; know-how/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- pitch.md#no-gos → .project/records/legacy-upgrades/metrics-report-dimensions.md#constraints-and-bounds; rule/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/metrics-report-dimensions.md#behavior-and-schema-contract; decision/merged; Preserves source decisions, behavior, historical verification and explicit limits without overstating independent review.

Review notes:

- Cache has 18 required sections versus draft/v1 17: added pitch.md#no-gos is read and retained.
- Tracked run is a compact timeline, not byte-identical to SHIPPED; all source mappings use supplement.
- Narrative each-reproduced-first overstates S5 code-plausibility evidence; mixed security finding counts must remain explicit.
- Rollup tracked-file count disagrees with its list; final file count and staged test totals preserved as historical claims.

## After this batch

Successful apply would yield **42/46 upgraded**, with only pitch-compaction, portable-skill-defaults, portable-skill-installation and project-state-report remaining. [Final-group source request](2026-10-22-p2c-s3-batch11-source-request.md) is a read-only preflight; those archives are still unread and need their own source approval. The live-evidence test repair and final scope/audit/ship gates remain separate.

## Decision

Approve / Revise / Back / Stop. Approval publishes and applies only the five exact reviewed proposals above, their ten exact drift acceptances and required receipt-gated archive verification reads.

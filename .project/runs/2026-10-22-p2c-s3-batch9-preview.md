# P2c-S3/S4 batch 9 — exact apply preview

Prepared 2026-10-22. All five source reviews are complete. Live state stays **32 upgraded / 14 legacy / 0 partial**, with no batch-9 live apply performed.

## Proposed actions

Publish the five exact staged supplements, then apply the five exact proposed payloads through legacy-upgrade.mts with reviewed destination drift and explicit per-invocation archive-read receipts. Each apply preserves v1 bytes, validates v2/outcome, updates the generated index, retires only the bound narrative and rebuilds/checks the graph. Approval includes required verification reads for these five slugs only. Historical source archives and existing durable documents stay untouched. This gate does not approve shipment or other legacy slugs.

## Coverage

| Pitch | Sections retained/required | Other files retained/accounted | Source files read | Source bytes | Outcome bytes/3000 |
|---|---:|---:|---:|---:|---:|
| orca-auto-start-all-phases | 12/12 | 4/6 | 8 | 48429 | 1153 |
| runner-aware-runtime-boundary-validator | 12/12 | 4/6 | 8 | 33491 | 1281 |
| token-attribution | 8/8 | 11/13 | 13 | 85058 | 1131 |
| token-time-report | 34/34 | 31/39 | 39 | 274950 | 1127 |
| workflow-usage-state | 24/24 | 10/15 | 15 | 96261 | 1149 |

All 90 required sections retained. All 79 other files accounted; 60 retained, 19 omitted. No accepted gaps. Source reviews cover 538189 original UTF-8 bytes across 83 files; the two tier-A caches each contain eight files, not six (six is their otherFiles count).

## Omission reasons

- orca-auto-start-all-phases/SHIPPED.md: superseded
- orca-auto-start-all-phases/hill.md: process-noise
- runner-aware-runtime-boundary-validator/SHIPPED.md: superseded
- runner-aware-runtime-boundary-validator/hill.md: process-noise
- token-attribution/SHIPPED.md: superseded
- token-attribution/hill.md: process-noise
- token-time-report/collect-historian.json: process-noise
- token-time-report/collect-skeptic.json: process-noise
- token-time-report/delivery-pending.json: process-noise
- token-time-report/dispatch-appetite.json: process-noise
- token-time-report/dispatch-historian.json: process-noise
- token-time-report/dispatch-overlap.json: process-noise
- token-time-report/dispatch-skeptic.json: process-noise
- token-time-report/hill.md: process-noise
- workflow-usage-state/audit-prompts/code.txt: process-noise
- workflow-usage-state/audit-prompts/cycle2.txt: process-noise
- workflow-usage-state/audit-prompts/security.txt: process-noise
- workflow-usage-state/audit-prompts/test.txt: process-noise
- workflow-usage-state/hill.md: process-noise

Superseded SHIPPED omissions in the two Orca/runner cases are backed by tracked run copies verified byte-identical. Token-attribution's retained supplement carries its full shipped reconciliation. Hill positions, transport receipts and prompts omitted only after completed source review; meaningful incidents remain in supplements.

## Large-source proof and copies

The token-time-report review read **39/39 file bodies and 34/34 section bodies in full**, in indexed untruncated batches, with an incremental read ledger. Source body sizes sum to 274,950 bytes (the larger cache embeds duplicate section bodies). All sections mapped; 31 of 39 other files retained, eight process-noise. Its full review is saved at the user-specified scratch report. Its dated log and hill are **not byte-identical** (11243 vs 10590 bytes, and 884 vs 872); final closure is missing/pending in preparation copies. They are linked as preparation history, not used as lossless destinations. Final cached closure and tracked receipt are distinguished. No SHIPPED-to-run identity is claimed for this pitch.

## Reviewed destination drift

Main thread verified introducing-commit hashes and live bindings; small frontmatter diffs are only related additions (orca-policy and graphify), with unchanged bodies. Two older backlog histories have +218/-2 lines (other items resolved, current pitch bullets retained); three newer histories have 32-line drift affecting unrelated approvals/candidate references and appended tasks. Exact per-file before/after pairs follow. Any later edit refuses.

| Pitch | File | Committed hash | Current hash | Review reason |
|---|---|---|---|---|
| orca-auto-start-all-phases | .project/knowledge/decisions/orca-auto-start-design.md | sha256:9c7fe387a21f330361fbdedc6ae3e59e8c7d4703ae068578e8d2df7b4a8531dd | sha256:899a33b34982f368c840c0dff57a9e3dc70c72b6e519361e631eb2f37f27d68c | One frontmatter related line adds orca-policy; mapped decision content is unchanged. |
| orca-auto-start-all-phases | .project/pitches/_followups.md | sha256:c782dfa790aea9b7d5d74ec51fa2937718e8ae348738ac13bbf6e290f1a74d23 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Reviewed +218/-2 lines: removed lines are strikethrough resolutions for other pitches; this pitch own four-bullet section is byte-identical. Later lookupWorker 256 KiB overflow is separate orca-bounded-control-receipts work. |
| runner-aware-runtime-boundary-validator | .project/knowledge/patterns/a-source-scanner-fails-closed-on-what-it-cannot-read.md | sha256:60cf6cec5d08d0448e553817b868b052241e7b19ac4749c961b643563a051271 | sha256:c2d3063ff1507a458e23dfddbb49a7a72cea7ef1d5d1774dd320ee32f8bf07bf | Only related frontmatter changed; the scanner pattern body remains unchanged. |
| runner-aware-runtime-boundary-validator | .project/pitches/_followups.md | sha256:c782dfa790aea9b7d5d74ec51fa2937718e8ae348738ac13bbf6e290f1a74d23 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Reviewed additive backlog drift and two resolved historical lines for other pitches; scanner followup substance remains, including later path/read-hardening work. |
| token-attribution | .project/pitches/_followups.md | sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Reviewed 32-line backlog drift since v1 introduction: unrelated candidate approvals, two renamed pitch references and appended candidates/ship blocker; this pitch own followup content is unchanged. |
| token-time-report | .project/pitches/_followups.md | sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Reviewed 32-line backlog drift since v1 introduction: unrelated candidate approvals, two renamed pitch references and appended candidates/ship blocker; this pitch own followup content is unchanged. |
| workflow-usage-state | .project/pitches/_followups.md | sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10 | sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5 | Reviewed 32-line backlog drift since v1 introduction: unrelated candidate approvals, two renamed pitch references and appended candidates/ship blocker; this pitch own followup content is unchanged. |

## Validation

Isolated rehearsal **5/5 PASS**, using real shared validators, outcome lint, original-content normalized hashes, synthetic source archives reconstructed from verified caches, Git commitment of original destinations and the real knowledge tree. No live source archive reopened. Each pitch proves dry-run, apply, replay, v1 byte retention, archive verification/immutability, generated index, narrative retirement, 13 byte-identical neighboring entries and zero broken supplement links. Each drift path refuses wrong committed/current hashes and a later edit; absent acceptance also refuses: 7 negative controls per two-drift slug and 4 per one-drift slug, **26 total**. No refusal changed state.

Source readings are historical verification; this rehearsal is current-session transaction evidence. Production tests were not rerun for staging data. Full-suite closure remains blocked by the stale live-evidence path, diagnosed separately: focused fragment/dataset runs 208 tests, 207 pass, one ENOENT; earlier 18 failures also included a load-sensitive timing assertion and its dependent cascade. No bound weakened and no failed live outcome relabelled.

Current setup validation: READY, 25 checks; 46 valid ledgers (14 v1 / 32 v2), 32 lint-clean outcomes, 175 TypeScript entries parse. Preview/tracker links: two files, zero broken links. Staged hashes and every existing binding rechecked current. Repository-wide git diff --check reports four pre-existing trailing-blank-line findings (_followups.md, active consolidation pitch, workflow-v3-rollout pitch, forced cooldown run). Those bound/historical files were not altered to clear the findings.

## Exact outcomes and mapping samples

### orca-auto-start-all-phases

Payload · [Supplement](../records/legacy-upgrades/orca-auto-start-all-phases.md)

Payload hash: sha256:69b2c227948291baee5aeff97327bfc64617ffec97a05f8025b19d50ae64bf26. Supplement hash: sha256:ba53d7e5f622ea8912cb7406c155ce022065133da58c605ca700e4cc265c40c3.

```markdown
---
slug: orca-auto-start-all-phases
shipped: 2026-10-08
schemaVersion: 1
---
# orca-auto-start-all-phases

Orca phase startup and explicit fail-closed recovery shipped with hook and command-path limits retained.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: Orca phase startup and explicit fail-closed recovery shipped with hook and command-path limits retained.
- docs: [source supplement](.project/records/legacy-upgrades/orca-auto-start-all-phases.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/orca-auto-start-all-phases.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/orca-auto-start-all-phases.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/orca-auto-start-all-phases.md)
- followups: [retained limits](.project/records/legacy-upgrades/orca-auto-start-all-phases.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/orca-auto-start-all-phases.md)
```

Ten mapping lines (or all if fewer):

- SHIPPED.md#pitch-implementation → .project/runs/2026-10-08-orca-auto-start-all-phases.md#pitch--implementation; behavior/merged; Promise-by-promise result: what the switch, stop-and-ask, orca=normal and readiness do, and what was cut.
- SHIPPED.md#scopes → .project/records/legacy-upgrades/orca-auto-start-all-phases.md#what-shipped; know-how/merged; Scope outcomes P0-S5, the 15-file list and ~1,000 lines (run file also holds it, #scopes).
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/orca-auto-start-all-phases.md#no-gos; rule/merged; The six no-gos and that each held.
- SHIPPED.md#rabbit-holes → .project/records/legacy-upgrades/orca-auto-start-all-phases.md#rabbit-holes-and-how-they-closed; know-how/merged; R-by-R resolution (R1-R15) incl. the audit-found R14 fix.
- SHIPPED.md#deviations-see-deviationsmd-and-audit-cycle-12md → .project/runs/2026-10-08-orca-auto-start-all-phases.md#deviations-see-deviationsmd-and-audit-cycle-12md; know-how/merged; Where the build diverged from the plan.
- SHIPPED.md#verification-at-ship → .project/runs/2026-10-08-orca-auto-start-all-phases.md#verification-at-ship; know-how/merged; Suite counts, live hook output, the Bun-parallel token-consumption flake.
- SHIPPED.md#knowledge-extracted → .project/records/legacy-upgrades/orca-auto-start-all-phases.md#lessons-and-where-they-live; know-how/merged; Which knowledge entries came out of this pitch.
- SHIPPED.md#followups → .project/records/legacy-upgrades/orca-auto-start-all-phases.md#open-items-and-later-status; limit/merged; The four followups plus their later status. (_followups.md itself is refused for v2: pitches/*.)
- pitch.md#no-gos → .project/records/legacy-upgrades/orca-auto-start-all-phases.md#no-gos; rule/merged; Six boundaries (full text).
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/orca-auto-start-all-phases.md#rabbit-holes-and-how-they-closed; decision/merged; Resolved decisions (stop-and-ask, 12 phase skills, recursion, off path) plus R1-R15 and pushed-to-no-go.

### runner-aware-runtime-boundary-validator

Payload · [Supplement](../records/legacy-upgrades/runner-aware-runtime-boundary-validator.md)

Payload hash: sha256:b9140d1aaf1273271a079b5f82acb5711d748dee60d943ea623796e104f77123. Supplement hash: sha256:b175ae15ae7ee7218253e442aab048089dcf2a87c779bbe96d0104a98473ff40.

```markdown
---
slug: runner-aware-runtime-boundary-validator
shipped: 2026-10-08
schemaVersion: 1
---
# runner-aware-runtime-boundary-validator

A bounded runner-aware scanner reports runtime-boundary violations and preserves advisory and unparsed distinctions.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: A bounded runner-aware scanner reports runtime-boundary violations and preserves advisory and unparsed distinctions.
- docs: [source supplement](.project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md)
- followups: [retained limits](.project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md)
```

Ten mapping lines (or all if fewer):

- SHIPPED.md#pitch-implementation → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#what-shipped; behavior/merged; Promise-to-result table: violation kinds incl. unparsed and advisory dynamic-computed, doctor/invariants wiring, process.* advisory
- SHIPPED.md#scopes → .project/runs/2026-10-08-runner-aware-runtime-boundary-validator.md#scopes; know-how/merged; V1-V3, six owned files, ~540 lines at build
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#standing-constraints; limit/merged; No rewrite, no dependency, read-only, no app validation, test convention kept
- SHIPPED.md#rabbit-holes → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#scope-and-risks; know-how/merged; Fixtures then two-cycle hardening; node:url counted plainly; one doctor summary warning
- SHIPPED.md#deviations-see-deviationsmd-audit-cycle-1md-audit-cycle-2md → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#deviations; know-how/merged; unparsed omitted from plan contract; fail-open fix; non-literal rule narrowed; cycle-2 not re-reviewed
- SHIPPED.md#verification-at-ship → .project/runs/2026-10-08-runner-aware-runtime-boundary-validator.md#verification-at-ship; know-how/merged; Node 1239/Bun 1230, doctor figures, no build/lint
- SHIPPED.md#knowledge-extracted → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#related-records; know-how/merged; Names the pattern and decision entries
- SHIPPED.md#followups → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#limits-and-open-items; limit/merged; Open items, with item 1 now resolved
- pitch.md#no-gos → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#standing-constraints; limit/merged; Five no-gos
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/runner-aware-runtime-boundary-validator.md#scope-and-risks; know-how/merged; Resolved/pushed-to-plan/pushed-to-no-go split

### token-attribution

Payload · [Supplement](../records/legacy-upgrades/token-attribution.md)

Payload hash: sha256:bfbe57eeb143ce25043dd076d4a68f7e754b70aebd0ddcdfd1666ec6ca325192. Supplement hash: sha256:1e614d71441175c9a6b9bcdad3065f801f8c96ffc183e5d5075f892d3a161354.

```markdown
---
slug: token-attribution
shipped: 2026-10-19
schemaVersion: 1
---
# token-attribution

Token reporting gains canonical pitch, phase and scope attribution while preserving missing-usage and collector safety semantics.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: Token reporting gains canonical pitch, phase and scope attribution while preserving missing-usage and collector safety semantics.
- docs: [source supplement](.project/records/legacy-upgrades/token-attribution.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/token-attribution.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/token-attribution.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/token-attribution.md)
- followups: [retained limits](.project/records/legacy-upgrades/token-attribution.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/token-attribution.md)
```

Ten mapping lines (or all if fewer):

- SHIPPED.md#scopes → .project/records/legacy-upgrades/token-attribution.md#what-shipped; behavior/merged; S1-S10 outcomes, spike verdicts, commit hashes and release 2.34.0.
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/token-attribution.md#standing-constraints; rule/merged; Honored no-gos with the cap numbers and the four recorded plan deviations.
- SHIPPED.md#rabbit-holes → .project/records/legacy-upgrades/token-attribution.md#rabbit-holes-and-risks; know-how/merged; Which holes were resolved and which three surfaced as followups.
- SHIPPED.md#audit → .project/records/legacy-upgrades/token-attribution.md#audit-history; know-how/merged; One-cycle audit outcome, planted canaries, independence limits and fixes.
- SHIPPED.md#followups-generated → .project/records/legacy-upgrades/token-attribution.md#open-followups; limit/merged; The eight deferred items, spelled out, since _followups.md cannot be a destination.
- SHIPPED.md#doc-updates → .project/records/legacy-upgrades/token-attribution.md#what-shipped; know-how/merged; Which docs changed in-pitch (token-consumption.md, state-report.md); no ADR.
- pitch.md#no-gos → .project/records/legacy-upgrades/token-attribution.md#standing-constraints; rule/merged; The seven pitch no-gos including Cursor, network, back-fill and hook-blocking bans.
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/token-attribution.md#rabbit-holes-and-risks; decision/merged; Resolved answers, owners of pushed risks, and deferred items with rationale.

### token-time-report

Payload · [Supplement](../records/legacy-upgrades/token-time-report.md)

Payload hash: sha256:4e32f249752ae50d869c3b2116d182fc2c1d15606d88e9fa856e85a3d5a9e8e9. Supplement hash: sha256:2bbf573b4dd7d76a4a35538c9c980e6992964e9f14702d912e2f21d12766b734.

```markdown
---
slug: token-time-report
shipped: 2026-10-22
schemaVersion: 1
---
# token-time-report

Joined token and stored-union time reports ship with guarded publication, reporting coverage and explicit source-window limits.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: Joined token and stored-union time reports ship with guarded publication, reporting coverage and explicit source-window limits.
- docs: [source supplement](.project/records/legacy-upgrades/token-time-report.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/token-time-report.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/token-time-report.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/token-time-report.md)
- followups: [retained limits](.project/records/legacy-upgrades/token-time-report.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/token-time-report.md)
```

Ten mapping lines (or all if fewer):

- SHIPPED.md#result → .project/records/legacy-upgrades/token-time-report.md#what-shipped; behavior/merged; Retains joined-report commands, exact identities, one-sided rows and unavailable semantics.
- SHIPPED.md#scopes → .project/records/legacy-upgrades/token-time-report.md#what-shipped; behavior/merged; Preserves S1–S3 outcomes and authorized review-bench repairs.
- SHIPPED.md#verification → .project/records/legacy-upgrades/token-time-report.md#verification-history; know-how/merged; Preserves final Node/Bun, coverage and validator results plus wrapper failure and N/A checks.
- SHIPPED.md#audit-and-evidence-boundaries → .project/records/legacy-upgrades/token-time-report.md#audit-evidence-and-limits; limit/merged; Keeps incomplete reports, citation corrections, discarded mutants and independence limits.
- SHIPPED.md#no-gos-and-rabbit-holes → .project/records/legacy-upgrades/token-time-report.md#standing-constraints; limit/merged; Retains exclusions, separate-window limits, per-file publication and filesystem race.
- SHIPPED.md#knowledge-and-follow-ups → .project/records/legacy-upgrades/token-time-report.md#lessons-and-open-items; know-how/merged; Preserves extracted lessons, TTR-A1–A4 and unmeasured browser limits.
- SHIPPED.md#documents-and-recovery → .project/records/legacy-upgrades/token-time-report.md#release-and-recovery-records; know-how/merged; Records contract ownership, preparation snapshots, evidence archive and cooldown state.
- SHIPPED.md#final-closure → .project/records/legacy-upgrades/token-time-report.md#release-and-recovery-records; know-how/merged; Records owner-approved local closure without commit, push or human-terminal cleanup.
- pitch.md#no-gos → .project/records/legacy-upgrades/token-time-report.md#standing-constraints; limit/merged; Keeps no collector/schema/backfill/transcript/estimate scope and no implicit state generation.
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/token-time-report.md#design-decisions; know-how/merged; Keeps guarded-reader reuse, identity pins, cap folds and deferred comparable-window work.

### workflow-usage-state

Payload · [Supplement](../records/legacy-upgrades/workflow-usage-state.md)

Payload hash: sha256:522f862431865ab7eff984cefd100e086502fc8d29d365ccc2ab177d7ab9e4fe. Supplement hash: sha256:8bf5a20df3de0887419373ca174b0903a1cb0f77dc866a7317a54b9433d037ec.

```markdown
---
slug: workflow-usage-state
shipped: 2026-10-20
schemaVersion: 1
---
# workflow-usage-state

Schema-2 workflow usage state records bounded activity, union time, wait gaps and flow transitions without transcript content.
Original source decisions, contradictions and verification limits are retained in the linked supplement.
This legacy upgrade makes no new execution or live-quality claim.

- outcome: Schema-2 workflow usage state records bounded activity, union time, wait gaps and flow transitions without transcript content.
- docs: [source supplement](.project/records/legacy-upgrades/workflow-usage-state.md)
- decisions: [retained decisions](.project/records/legacy-upgrades/workflow-usage-state.md)
- knowledge: [lessons and constraints](.project/records/legacy-upgrades/workflow-usage-state.md)
- code: none
- verification: [historical verification](.project/records/legacy-upgrades/workflow-usage-state.md)
- followups: [retained limits](.project/records/legacy-upgrades/workflow-usage-state.md), [backlog](.project/pitches/_followups.md)
- archive: [reviewed recovery record](.project/records/legacy-upgrades/workflow-usage-state.md)
```

Ten mapping lines (or all if fewer):

- SHIPPED.md#scopes → .project/records/legacy-upgrades/workflow-usage-state.md#what-shipped; behavior/merged; Per-scope outcomes S1-S9: schema 2 migration, activity key, interval engine, LRU tree, drop marker, report rows, contract doc, 1,007,578-byte full-cap state.
- SHIPPED.md#no-gos-honored → .project/records/legacy-upgrades/workflow-usage-state.md#standing-constraints; limit/merged; Five no-gos with the evidence that each held, plus the four plan deviations flagged at ship.
- SHIPPED.md#rabbit-holes → .project/records/legacy-upgrades/workflow-usage-state.md#risks-and-resolutions; know-how/merged; Which rabbit holes were resolved as planned, which surfaced during build/audit (clock ahead of events, hand-edited frontier).
- SHIPPED.md#audit → .project/records/legacy-upgrades/workflow-usage-state.md#audit-triage; know-how/merged; Two audit cycles, three independent reviewers with canaries, the single must-fix M1 and its two-sided fix.
- SHIPPED.md#final-verify → .project/records/legacy-upgrades/workflow-usage-state.md#verification-history; know-how/merged; pre-ship-verify exit 1 on a package-less bundle, the real commands run instead, and the pre-existing dataset-mapping and bun stall failures.
- SHIPPED.md#docs → .project/records/legacy-upgrades/workflow-usage-state.md#contract-and-code; know-how/merged; Contract lives in workflow-metrics.md; no ADR, the drop-channel and cap choices come from the S1 spike.
- SHIPPED.md#followups-generated → .project/records/legacy-upgrades/workflow-usage-state.md#limits-and-open-items; limit/merged; Six followups (capture wiring, O_* constants, test flake and bun stall, ship wrapper, audit tree, test hygiene).
- pitch.md#no-gos → .project/records/legacy-upgrades/workflow-usage-state.md#standing-constraints; limit/merged; Original five no-gos the pitch bet on.
- pitch.md#rabbit-holes → .project/records/legacy-upgrades/workflow-usage-state.md#risks-and-resolutions; know-how/merged; Resolved items, risks pushed to plan with owners, and what was pushed to no-go.
- deviations.md#s3 → .project/records/legacy-upgrades/workflow-usage-state.md#deviations-from-plan; behavior/merged; Arriving start competes in eviction; rewritten unmatched-finish test and why.

## Remaining work after approval

After successful batch 9: 37/46 upgraded, nine remain. See [remaining-work](../records/consolidation/remaining-work.md). The state-ai-authoring evidence-path repair needs its own bounded step because the prior audit exhausted three cycles; no cycle-4 audit is implied.

## Decision

Approve / Revise / Back / Stop. Approval publishes and applies only these five exact proposals with the seven exact drift pairs and receipt-gated verification reads.

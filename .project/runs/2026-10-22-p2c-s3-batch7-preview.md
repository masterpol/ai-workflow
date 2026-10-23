# P2c-S3 batch 7 — apply preview

Prepared 2026-10-22 after owner approval of source review for two pitches (tier B-large pointer ledgers: instruction-compression with 33 pointer sections and 20 other files, and unified-toon-config with 22 pointer sections and 6 other files). This is the apply gate. No batch-7 live upgrade has run, nothing was published to live records, and nothing was committed.

## Exact proposed actions

Publish the two staged source supplements under .project/records/legacy-upgrades, then apply each exact proposed payload through legacy-upgrade.mts (version 2.48.1). Neither pitch has a compact record, so the upgrade retires the done-work narrative and each new supplement is the durable home for every retained fact. Each upgrade preserves original v1 bytes in a sibling, writes its validated v2 ledger and lint-clean outcome, updates the generated index, retires only its bound legacy narrative and rebuilds/checks the graph. Required archive verification reads receive explicit per-invocation receipts before I/O. Original archives and historical durable targets remain unchanged. Neither pitch has destination drift, so acceptDestinationDrift is not used.

Approval covers only the two slugs below, their exact staged supplements and payloads, and the archive-verification reads required to apply and verify them. Other campaign slugs retain separate gates.

## Coverage and omissions

| Pitch | Retained / required sections | Coverage | Other files | Whole-file omissions | Outcome bytes / cap | Supplement bytes |
|---|---:|---:|---|---:|---:|---:|
| instruction-compression | 33/33 | 100.00% | 20/20 retained, 20/20 accounted | 0 | 1920/3000 | 31352 |
| unified-toon-config | 22/22 | 100.00% | 6/6 retained, 6/6 accounted | 0 | 1844/3000 | 26854 |

All 55 required sections and 26 other files have explicit, original-hash-bound judgments (360,817 source bytes across 26 files). Retained section coverage is 55/55 (100.00%) and all 26 other files are retained. There are no omitted sections and no omitted whole files, so no omission reason (process-noise or superseded) is used; there are no accepted gaps and no new knowledge entries. Every body and file hash is the value computed by the real bodyHashOf with the runtime sha256Hex, and the isolated rehearsal reconstructed the sources and re-derived them through the tool's own validator.

Exact omissions: none.

Section and file destinations are anchors in each pitch's own staged supplement, with these exceptions where an existing tracked file holds the same bytes. The cached bodies were compared byte for byte with the archived text:

- instruction-compression log.md maps to .project/runs/2026-10-19-instruction-compression.md (byte-identical, 11,007 bytes).
- instruction-compression hill.md maps to .project/runs/2026-10-19-instruction-compression-hill.md (byte-identical, 1,133 bytes), so it is retained rather than omitted.
- unified-toon-config hill.md maps to .project/runs/2026-10-16-unified-toon-config-hill.md (byte-identical, 4,153 bytes). The reviewer proposed omitting it as process-noise; it is retained instead because a faithful copy exists.
- unified-toon-config log.md is merged into the supplement chronology; its byte-identical run copy (22,482 bytes) is linked from the supplement but is not the mapped destination.

Bindings are the supplement hash and the hash of each run copy named above. No destination-drift file is involved.

Reviewer-proposed destinations that were not accepted: instruction-compression s3-review.md. The reviewer called the analysis file .project/analysis/2026-10-18-instruction-compression-s3-review-analysis.md a confirmed copy, but it is not byte-identical: it adds a two-line moved-on preface and rebases or de-links references to archived files. Its substance was therefore merged into a new supplement section, S3 review decision (score table, PASS versus incomplete-review conflict, five-point revision, approval outcome), and the file is mapped there. The analysis file is linked from the supplement as a related copy only.

## Source-review findings retained

- instruction-compression: the measured word baseline and ownership model, golden-behavior design and dataset hash, the bounded bet and critique findings K1 to E1, the plan boundary and exit contract, the baseline experiment and six-point S1 amendment, S1 and S2 delivery, the S3 rejection and approved deferral, R1 fixture repair, native observation measurements, audit cycle and verification history, no-gos and limits, open items and operational lessons.
- unified-toon-config: the single TOON file and loadConfig primitives, owner decisions, design and rabbit-hole resolutions, standing constraints, three critique loops, the 13-scope plan and hard rules, build chronology, the schemaVersion 2 reshape, delivered migrator behavior, two audit cycles (ReDoS must-fix, escape-byte must-fix), verification history, accepted and open limits, and lessons.

Review claims the cached bodies do not support were dropped. unified-toon-config: the exact Orca error code attributed to the worker-list blocker (worker-identity-unavailable) and the literal writeFileSync expression for the atomic writer appear only in reviewer-read live files, not the cache, so both are stated in general terms. instruction-compression: no claim was made that the lessons are absent elsewhere, because .project/knowledge was not searched; the supplement says its lessons are recorded here and were not compared with the knowledge entries.

## Contradictions kept as historical

Each supplement lists its contradictions without rewriting them. instruction-compression: Bet date 2026-10-17 in the ship record versus 2026-10-18 in the pitch records; scope events dated 2026-10-18 while the changelog dates 2.31.6 to 2.31.8 on 2026-10-19; the 14 contracts predating the pitch; about 40 versus 44 canonical wrappers; estimates versus actual line counts. unified-toon-config: target 3.0.0 versus shipped 2.25.0; legacy deletion promised versus never shipped; schema sketch v1 versus shipped v2; maxConcurrentWorkers 1..16, 1..3, then 1..16; a1 size 7 versus 12 versus 13 files; critique counts that do not sum; final hill positions versus the log; one versus several stashes; the X12 diff criterion versus the grader edit.

## Exact proposed outcomes

Outcome links resolve from project root. Supplement Markdown links resolve from the final records/legacy-upgrades directory; they intentionally do not resolve from the staging directory. Links to sibling supplements point at files published by earlier batches that are present and not git-ignored but not yet committed. Historical verification is distinguished from current checks.

### instruction-compression

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/instruction-compression.md)

```markdown
---
slug: instruction-compression
shipped: 2026-10-19
schemaVersion: 1
---
# instruction-compression

The build and audit phase wrappers now point at their phase owners and passed a frozen 31-case loading check with no new scored regression (1,314 to 489 and 941 to 468 words).
The ship wrapper change was rejected after OpenCode lost two satisfied criteria, and it was restored to its earlier bytes; an upgrade-fixture repair shipped in its place.
Savings are source-word counts only; no token, cost or latency gain is claimed.

- outcome: Build and audit wrappers are thin with reusable owner-loading proof; the ship wrapper stays deferred with its failed evidence kept.
- docs: [build skill](.claude/skills/build/SKILL.md), [audit skill](.claude/skills/audit/SKILL.md), [build phase](ai-framework/workflow/phases/2-build.md), [audit phase](ai-framework/workflow/phases/3-audit.md)
- decisions: [S3 review decision](.project/records/legacy-upgrades/instruction-compression.md#s3-review-decision)
- knowledge: [failed candidates kept](.project/knowledge/patterns/a-compression-pilot-keeps-failed-candidates-and-defers.md), [one owner per topic](.project/knowledge/patterns/one-owner-per-instruction-topic-guarded-by-contract-tests.md), [killed mutation script](.project/knowledge/issues/mutation-script-killed-leaves-source-mutated.md)
- code: [loading proof](ai-framework/scripts/instruction-loading.test.mts), [contract tests](ai-framework/scripts/workflow-contracts.test.mts), [upgrade fixture](ai-framework/scripts/runtime/upgrade.test.mts)
- verification: [audit and verification history](.project/records/legacy-upgrades/instruction-compression.md#audit-and-verification-history)
- followups: [open items](.project/records/legacy-upgrades/instruction-compression.md#open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/instruction-compression.md)
```

### unified-toon-config

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/unified-toon-config.md)

```markdown
---
slug: unified-toon-config
shipped: 2026-10-16
schemaVersion: 1
---
# unified-toon-config

All workflow configuration now lives in one root ai-workflow.toon read through loadConfig, with the legacy JSON files kept as a one-minor fallback.
A migrator converts legacy files with backups, dual-hash tracking and a fresh-process re-parse, and it never deletes them; an owner reshape moved Orca settings under integrations.orca at schemaVersion 2.
Two audit cycles fixed a ReDoS and a terminal escape echo; later pitches changed the schema again.

- outcome: One validated TOON file configures the workflow, migrated by a guarded CLI, with legacy files read as a temporary fallback.
- docs: [example toon](ai-framework/templates/ai-workflow.example.toon), [runtime README](ai-framework/scripts/runtime/README.md)
- decisions: [schema v2](.project/knowledge/decisions/unified-toon-config-schema-v2.md), [TOON subset grammar](.project/decisions/toon-subset-grammar.md)
- knowledge: [untrusted text in errors](.project/knowledge/patterns/untrusted-text-reaches-the-terminal-through-error-messages.md), [quadratic regex](.project/knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md), [reconcile every worker](.project/knowledge/patterns/reconcile-every-worker-of-a-wave-before-committing-any-scope.md)
- code: [config](ai-framework/scripts/runtime/config.mts), [migrator](ai-framework/scripts/config-migrate.mts), [orca policy](ai-framework/scripts/orca-policy.mts)
- verification: [verification history](.project/records/legacy-upgrades/unified-toon-config.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/unified-toon-config.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/unified-toon-config.md)
```

## Validation and proof boundaries

Both original archives were fully verified earlier after receipt logging, with 360,817 bytes across 26 source files. Reviewer analysis used private verified copies. Every proposed section and file hash is the normalized body hash the apply tool derives from the archived bytes. No archive was reopened for projected validation or synthetic rehearsal.

Shared v2 validation, outcome lint and supplement link checks in projected final locations:

```text
{"slug":"instruction-compression","coverage":1,"sections":33,"otherFiles":20,"omissions":{},"acceptedGaps":[],"recordBytes":1920,"recordCap":3000,"supplementBytes":31352,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"unified-toon-config","coverage":1,"sections":22,"otherFiles":6,"omissions":{},"acceptedGaps":[],"recordBytes":1844,"recordCap":3000,"supplementBytes":26854,"projectedValidation":"passed","supplementLinks":"passed"}
{"newKnowledgeEntries":0,"sourceArchivesReopened":false}
```

Isolated real apply/replay rehearsal against synthetic archives reconstructed from the verified source copies (dry run leaves state legacy, real apply, v2 status, outcome lint, v1 byte retention, archive verify, archive bytes unchanged, replay, generated index row present, retired narrative heading absent, 20 neighbouring done-work entries byte-identical, supplement docs-links including linked sibling supplements):

```text
instruction-compression: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 20 neighbouring done-work entries byte-identical
unified-toon-config: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 20 neighbouring done-work entries byte-identical
Rehearsal: 2 generated index rows, 2 upgraded slugs, retired narratives absent, neighbouring done-work entries byte-identical; real bundle graph commands with fixture Graphify extraction; live archives not reopened
```

The fixture used a real Git commitment for v1 ledgers and their bound destinations, the real knowledge tree for the graph validator, the full live done-work file (so neighbours could be compared), the real narrative bound by each legacyEntryHash, and real bundle graph rebuild/check commands with a fixture Graphify supplying an empty extraction base. This proves transaction, validator, lint, v1 retention, archive integrity, narrative retirement and replay paths. Live one-hop graph reachability, root immutable-source snapshots and final live exits remain required after apply approval. No live ledger, index or record was touched.

Live state remains 21 legacy, zero partial and 25 upgraded (46 pitches in all). No apply has run. This gate does not approve shipping.

Boundary notes: no archive directory was opened, listed or searched, and no broad search over .project was run; the cache was the source. Live files read beyond the staged campaign inputs were the done-work narrative, the three run and analysis copies compared with the cache, the followups backlog and changelog references named by the reviews, and existence and tracking checks of linked paths.

## Metrics validation

Machine-readable proof: [preview evidence](2026-10-22-p2c-s3-batch7-preview-evidence.toon). Observed workflow events are recorded, while automatic primary Codex token/cost capture remains unavailable; no missing usage or historical duration is fabricated.

## Decision

Approve / Revise / Back / Stop. Approval publishes these two exact supplements and applies these two exact payloads, including receipt-gated archive reads for required verification.

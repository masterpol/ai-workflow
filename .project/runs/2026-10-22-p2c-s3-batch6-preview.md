# P2c-S3 batch 6 — apply preview

Prepared 2026-10-22 after owner approval of source review for the five named pitches (tier B pointer ledgers: toon-machine-data, vendor-model-toon, workflow-usage-capture, orca-role-pools and upstream-project-drift; workflow-usage-capture is B-large with 31 pointer sections). This is the apply gate. No batch-6 live upgrade has run, nothing was published to live records, and nothing was committed.

## Exact proposed actions

Publish the five staged source supplements under .project/records/legacy-upgrades, then apply each exact proposed payload through legacy-upgrade.mts (version 2.48.1). None of these pitches has a compact record, so the upgrade retires the done-work narrative and each new supplement is the durable home for every retained fact. Each upgrade preserves original v1 bytes in a sibling, writes its validated v2 ledger and lint-clean outcome, updates the generated index, retires only its bound legacy narrative and rebuilds/checks the graph. Required archive verification reads receive explicit per-invocation receipts before I/O. Original archives and historical durable targets remain unchanged. None of the five has destination drift, so acceptDestinationDrift is not used.

Approval covers only the five slugs below, their exact staged supplements and payloads, and the archive-verification reads required to apply and verify them. Other campaign slugs retain separate gates.

## Coverage and omissions

| Pitch | Retained / required sections | Coverage | Other files | Whole-file omissions | Outcome bytes / cap | Supplement bytes |
|---|---:|---:|---|---:|---:|---:|
| toon-machine-data | 7/7 | 100.00% | 7/9 retained, 9/9 accounted | 2 | 1731/3000 | 17471 |
| vendor-model-toon | 13/13 | 100.00% | 5/6 retained, 6/6 accounted | 1 | 1546/3000 | 10120 |
| workflow-usage-capture | 31/31 | 100.00% | 9/10 retained, 10/10 accounted | 1 | 1992/3000 | 31530 |
| orca-role-pools | 23/23 | 100.00% | 6/7 retained, 7/7 accounted | 1 | 1746/3000 | 21840 |
| upstream-project-drift | 21/21 | 100.00% | 8/9 retained, 9/9 accounted | 1 | 1543/3000 | 23286 |

All 95 required sections and 41 other files have explicit, original-hash-bound judgments (388,597 source bytes across 43 files). Retained section coverage is 95/95 (100.00%); 35 of 41 other files are retained and all are accounted for. There are six omitted whole files and no omitted sections: all six are process-noise, no superseded or other reason. There are no accepted gaps and no new knowledge entries. Every body and file hash is the value computed by the real bodyHashOf with the runtime sha256Hex (the ledger tool function), and the isolated rehearsal reconstructed the sources and re-derived them through the tool's own validator. Section and file destinations are anchors in each pitch's own staged supplement, with one exception: the upstream-project-drift drift-ledger.md file points at the existing analysis file .project/analysis/2026-10-16-upstream-drift-ledger-analysis.md, which holds the same text (the cached body differs only by a two-line moved-on note in the analysis file). Bindings are the supplement hash, that analysis file hash, and the unchanged legacy knowledge destination already bound by the v1 ledgers for vendor-model-toon and orca-role-pools (the schema-bump issue). Those files were checked against the hashes in the drafts and have not drifted.

Exact omissions:

- toon-machine-data / build-start.md — process-noise: approval brief and Orca readiness for the start gate; its limits are repeated in the pitch and SHIPPED no-gos.
- toon-machine-data / hill.md — process-noise: hill positions whose counts conflict with SHIPPED; the conflict is kept in the supplement.
- vendor-model-toon / hill.md — process-noise: single scope done; content equals the shipped record.
- workflow-usage-capture / hill.md — process-noise: all scopes done; positions and counts also live in the build log and the run snapshot.
- orca-role-pools / hill.md — process-noise: all seven scopes done on 2026-10-16; restates the shipped scopes.
- upstream-project-drift / hill.md — process-noise: all scopes done; restates the shipped scopes.

No section was omitted. The classes used are all in the closed vocabulary (behavior, decision, know-how, limit); the orca-role-pools D7 section keeps the review's class decision, which the tool allows, with its destination in the supplement. Reviewer-proposed omissions that were not accepted: workflow-usage-capture plan.md and shaping-draft.md (marked superseded after headings only) are retained, because their full bodies hold the event mapping, the A1 contract items, start conditions, blast radius, claim corrections and the original token-time-report design that no other source carries; five workflow-usage-capture log and deviation sections (S5 order, S6 fixture, approval gate, S4 start, final closure) are retained rather than omitted; upstream-project-drift checkpoint.md and sync-proof.json (marked superseded) are retained because they hold commit lists, open decision numbers and per-file mismatch classes not stated elsewhere.

## Source-review findings retained

- toon-machine-data: data grammar 1.0 with its shared reader and writer, converter with proxies, the rule, 13 golden cases (8 enforced, 5 live-only), the 14-row inventory and NO-GO, deviations, audit M1 to M3, cycle 2 C1 to C5, acknowledged items, canaries and the 37-minute mutation hang.
- vendor-model-toon: the models block at schemaVersion 3, strict validation, convertV2 byte preservation, the three build incidents, the canary-only audit, A2 gaps, and verification counts.
- workflow-usage-capture: S1 to S7 delivery, the A1 prerequisite repair, payload facts and G1 mapping, planned event mapping and A1 contract items, measurements, the RN-shaped rollout check, the audit with its OpenCode model-pin proof, wrapper fallback closure, and the shaping origin with part B.
- orca-role-pools: pool policy, assignment module, ledger overlap guard, D1 to D9, the M1 must-fix and its fix, incidents, critique findings and counts.
- upstream-project-drift: the 178-row ledger summary, S0 to S10 delivery, D1 to D9, the mid-build checkpoint, wave outcomes, baseline and final counts, sync-proof classes and release state.

Review claims the cached bodies do not support were dropped. toon-machine-data: grammar internals the sources do not state (header text, 1 MiB size cap, TOON depth limit) are not asserted. vendor-model-toon: the claim that the knowledge issue still calls in-place conversion open. orca-role-pools: the claim that the changelog repeats the 98 count, and the issue-file status claim. upstream-project-drift: the claim that D7's three fixes were followed by a fourth EPERM site (the S9 log calls it a third site), the npm, pnpm, yarn and bun list for pre-ship-verify, and the processOwnerPid ledger field. Owner decision numbers 3 to 8 are confirmed by D7, the log, the checkpoint and SHIPPED; numbers 11, 13 and 14 appear only in the live backlog.

## Contradictions kept as historical

Each supplement lists its contradictions without rewriting them. Highlights: toon-machine-data grammar 1.1 versus 1.0, 15 versus 12 files, 2.32.0 versus 2.32.1, test counts 30/27/21 versus 26/14/15, 9 versus 13 golden cases; vendor-model-toon 93 versus 98 stale tests, 134 versus 137 and 1461 versus 1464 counts, a record-check "ok" versus "not run"; workflow-usage-capture shipped 2026-10-22 in done-work versus 2026-10-21 in the pitch records, file budgets of 8, 12, 15 files, Node suite 2317, 2363 and 2360 and graph counts 107, 111 and 112; orca-role-pools suite figures 1574, 1608, 1626 and 1635, red baseline 98 versus 99, grader tests 15 versus 16, and an in-place conversion open in the ship record but resolved in the backlog; upstream-project-drift exact versus floor version check, Codex versus OpenCode workers, the checkpoint's worker S5 versus D9's coordinator, two versus four flaky tests, and baseline 1267 versus final 1327 versus later 1492.

## Exact proposed outcomes

Outcome links resolve from project root. Supplement Markdown links resolve from the final records/legacy-upgrades directory; they intentionally do not resolve from the staging directory. Historical verification is distinguished from current checks.

### toon-machine-data

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/toon-machine-data.md)

```markdown
---
slug: toon-machine-data
shipped: 2026-10-19
schemaVersion: 1
---
# toon-machine-data

Workflow-only data files read by agents can now be written in a lossless TOON subset (data grammar 1.0) with a shared reader and writer.
A converter proves a round trip before writing, and a rule says when to use TOON and to measure each file.
Nothing in the repository was converted because no existing file qualified; the skill registry is the real saving.

- outcome: New agent-loaded data files can start in TOON with a rule, a converter and a hardened reader and writer.
- docs: [machine-data-format rule](ai-framework/rules/machine-data-format.md), [data grammar](.project/decisions/toon-data-grammar.md)
- decisions: [data files use their own grammar](.project/knowledge/decisions/data-files-use-their-own-toon-grammar-not-the-config-parser.md)
- knowledge: [convert only where loaded](.project/knowledge/patterns/convert-a-format-only-where-an-agent-loads-the-file-and-measure-it.md), [writer re-inspects](.project/knowledge/patterns/a-writer-reinspects-the-target-at-the-publish-step.md), [mutation hang](.project/knowledge/issues/an-unbounded-mutation-run-hangs-on-a-mutant-that-removes-a-stall-guard.md)
- code: [parser](ai-framework/scripts/runtime/toon-data.mts), [reader and writer](ai-framework/scripts/runtime/data-file.mts), [converter](ai-framework/scripts/toon-convert.mts)
- verification: [audit and review chronology](.project/records/legacy-upgrades/toon-machine-data.md#audit-and-review-chronology)
- followups: [followups](.project/records/legacy-upgrades/toon-machine-data.md#followups), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/toon-machine-data.md)
```

### vendor-model-toon

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/vendor-model-toon.md)

```markdown
---
slug: vendor-model-toon
shipped: 2026-10-17
schemaVersion: 1
---
# vendor-model-toon

ai-workflow.toon gained a models block at schemaVersion 3 that maps each vendor's fast, standard and deep profile to a model, with strict validation.
config-migrate converts a version 2 file in place, keeping values, comments and line endings, and the example and README show the block.
Agent files were left untouched; the block was inert until the later agent-model-sweep pitch.

- outcome: Projects declare model identifiers per vendor profile in one validated block, and version 2 files migrate in place.
- docs: [example toon](ai-framework/templates/ai-workflow.example.toon), [model routing rule](ai-framework/rules/model-routing.md), [harnesses](ai-framework/integrations/harnesses.md)
- decisions: [TOON subset grammar](.project/decisions/toon-subset-grammar.md)
- knowledge: [migrator edits the token](.project/knowledge/patterns/a-version-migrator-edits-the-token-not-the-model.md), [schema bump left stale tests](.project/knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md)
- code: [config](ai-framework/scripts/runtime/config.mts), [config-migrate](ai-framework/scripts/config-migrate.mts)
- verification: [verification history](.project/records/legacy-upgrades/vendor-model-toon.md#verification-history)
- followups: [historical limits](.project/records/legacy-upgrades/vendor-model-toon.md#historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/vendor-model-toon.md)
```

### workflow-usage-capture

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/workflow-usage-capture.md)

```markdown
---
slug: workflow-usage-capture
shipped: 2026-10-22
schemaVersion: 1
---
# workflow-usage-capture

Claude lifecycle hooks and OpenCode plugin events now feed metadata-only workflow usage capture through the existing state boundary.
Eight capture-owned Claude hook groups are validated by the doctor; the bounded CLI never blocks and exits 0.
OpenCode user-turn timing is unverified, so wait stays Unavailable; Codex and Cursor capture is out of scope.

- outcome: Workflow usage events are captured automatically from Claude and OpenCode without storing prompt or response text.
- docs: [workflow metrics guide](ai-framework/integrations/workflow-metrics.md), [harnesses](ai-framework/integrations/harnesses.md)
- decisions: [event mapping and A1 contract](.project/records/legacy-upgrades/workflow-usage-capture.md#plan-and-event-mapping)
- knowledge: [lease budget](.project/knowledge/patterns/observational-hooks-check-budget-before-acquiring-a-lease.md), [state-boundary attribution](.project/knowledge/issues/native-capture-needs-state-boundary-attribution.md), [guard snapshot bound](.project/knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md), [package-less wrapper](.project/knowledge/issues/package-less-bundle-ship-wrapper-cannot-select-checks.md), [Orca model preflight](.project/knowledge/issues/orca-model-preflight-can-leave-unproven-ledger-ownership.md)
- code: [capture adapter](ai-framework/hooks/scripts/workflow-capture.mts), [doctor](ai-framework/scripts/workflow-doctor.mts), [OpenCode plugin](.opencode/plugins/token-consumption.ts), [hook template](ai-framework/hooks/hooks.json)
- verification: [verification history](.project/records/legacy-upgrades/workflow-usage-capture.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/workflow-usage-capture.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/workflow-usage-capture.md)
```

### orca-role-pools

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/orca-role-pools.md)

```markdown
---
slug: orca-role-pools
shipped: 2026-10-17
schemaVersion: 1
---
# orca-role-pools

A coordinator can now list itself and several workers, and a role can be a pool of up to three distinct vendors.
A pure assignment module splits scopes round-robin, keeps reviewer different from implementer and rotates only after a proven clean failure.
Launch authority is unchanged; overlapping authorized paths across live scopes are refused. Concurrency above 3 is unverified.

- outcome: Orca roles accept worker pools with deterministic, resumable assignment and a path-overlap guard.
- docs: [orca vendors](ai-framework/integrations/orca-vendors.md)
- decisions: [build decisions and deviations](.project/records/legacy-upgrades/orca-role-pools.md#build-decisions-and-deviations)
- knowledge: [schema bump left stale tests](.project/knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md), [ownership predicate](.project/knowledge/patterns/an-ownership-predicate-must-mirror-the-claim-transactions-set.md), [gate spawns what it probed](.project/knowledge/patterns/a-gate-spawns-exactly-what-it-probed.md)
- code: [assign](ai-framework/scripts/orca-assign.mts), [policy](ai-framework/scripts/orca-policy.mts), [dispatch](ai-framework/scripts/orca-dispatch.mts), [ledger](ai-framework/scripts/orca-ledger.mts)
- verification: [verification and historical counts](.project/records/legacy-upgrades/orca-role-pools.md#verification-and-historical-counts)
- followups: [follow-ups and historical limits](.project/records/legacy-upgrades/orca-role-pools.md#follow-ups-and-historical-limits), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/orca-role-pools.md)
```

### upstream-project-drift

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/upstream-project-drift.md)

```markdown
---
slug: upstream-project-drift
shipped: 2026-10-16
schemaVersion: 1
---
# upstream-project-drift

Improvements fixed by hand in three downstream projects were classified in a 178-row ledger and the portable ones taken into the base (release 2.23.0).
The base gained task ownership, runtime child ownership, hook hardening, a strict Orca minimum version and an OpenCode port step.
No project was synced or edited; the ledger and sync proof hand the rollout to workflow-v3-rollout.

- outcome: The base absorbed the portable downstream fixes, and the remaining drift is classified for the rollout.
- docs: [drift ledger analysis](.project/analysis/2026-10-16-upstream-drift-ledger-analysis.md)
- decisions: [build decisions and deviations](.project/records/legacy-upgrades/upstream-project-drift.md#build-decisions-and-deviations)
- knowledge: [reconcile every worker of a wave](.project/knowledge/patterns/reconcile-every-worker-of-a-wave-before-committing-any-scope.md)
- code: [opencode service](ai-framework/scripts/opencode-service.mts), [orca preflight](ai-framework/scripts/orca-preflight.mts), [runtime node](ai-framework/scripts/runtime/node.mts)
- verification: [verification history](.project/records/legacy-upgrades/upstream-project-drift.md#verification-history)
- followups: [release state and open items](.project/records/legacy-upgrades/upstream-project-drift.md#release-state-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/upstream-project-drift.md)
```

## Validation and proof boundaries

All five original archives were fully verified earlier after receipt logging, with 388,597 bytes across 43 source files. Reviewer analysis used private verified copies. Every proposed section and file hash is the normalized body hash the apply tool derives from the archived bytes. No archive was reopened for projected validation or synthetic rehearsal.

Shared v2 validation, outcome lint and supplement link checks in projected final locations:

```text
{"slug":"toon-machine-data","coverage":1,"sections":7,"otherFiles":9,"omissions":{"process-noise":2},"acceptedGaps":[],"recordBytes":1731,"recordCap":3000,"supplementBytes":17471,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"vendor-model-toon","coverage":1,"sections":13,"otherFiles":6,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1546,"recordCap":3000,"supplementBytes":10120,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"workflow-usage-capture","coverage":1,"sections":31,"otherFiles":10,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1992,"recordCap":3000,"supplementBytes":31530,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"orca-role-pools","coverage":1,"sections":23,"otherFiles":7,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1746,"recordCap":3000,"supplementBytes":21840,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"upstream-project-drift","coverage":1,"sections":21,"otherFiles":9,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1543,"recordCap":3000,"supplementBytes":23286,"projectedValidation":"passed","supplementLinks":"passed"}
{"newKnowledgeEntries":0,"sourceArchivesReopened":false}
```

Isolated real apply/replay rehearsal against synthetic archives reconstructed from the verified source copies (dry run leaves state legacy, real apply, v2 status, outcome lint, v1 byte retention, archive verify, archive bytes unchanged, replay, generated index row present, retired narrative heading absent, 25 neighbouring done-work entries byte-identical, supplement docs-links including linked sibling supplements):

```text
toon-machine-data: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 25 neighbouring done-work entries byte-identical
vendor-model-toon: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 25 neighbouring done-work entries byte-identical
workflow-usage-capture: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 25 neighbouring done-work entries byte-identical
orca-role-pools: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 25 neighbouring done-work entries byte-identical
upstream-project-drift: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 25 neighbouring done-work entries byte-identical
Rehearsal: 5 generated index rows, 5 upgraded slugs, retired narratives absent, neighbouring done-work entries byte-identical; real bundle graph commands with fixture Graphify extraction; live archives not reopened
```

The fixture used a real Git commitment for v1 ledgers and their legacy destinations, the real knowledge tree for the graph validator, the full live done-work file (so neighbours could be compared), the real narrative bound by each legacyEntryHash, and real bundle graph rebuild/check commands with a fixture Graphify supplying an empty extraction base. This proves transaction, validator, lint, v1 retention, archive integrity, narrative retirement and replay paths. Live one-hop graph reachability, root immutable-source snapshots and final live exits remain required after apply approval. No live ledger, index or record was touched.

Live state remains 26 legacy, zero partial and 20 upgraded (46 pitches in all). No apply has run. This gate does not approve shipping.

Boundary notes: no archive directory was opened, listed or searched, and no broad search over .project was run; the cache was the source. The only live files read beyond the staged campaign inputs were the done-work narrative, the existing analysis file, the followups backlog, the changelog heading, the knowledge entries named in the supplements and code paths checked for existence.

## Metrics validation

Machine-readable proof: [preview evidence](2026-10-22-p2c-s3-batch6-preview-evidence.toon). Observed workflow events are recorded, while automatic primary Codex token/cost capture remains unavailable; no missing usage or historical duration is fabricated.

## Decision

Approve / Revise / Back / Stop. Approval publishes these five exact supplements and applies these five exact payloads, including receipt-gated archive reads for required verification.

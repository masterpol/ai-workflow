# P2c-S3 batch 2 — apply preview

Prepared 2026-10-22 after owner approval of source review for the five named pitches. This is the apply gate. No batch-2 live upgrade has run.

## Exact proposed actions

Publish the five staged source supplements under .project/records/legacy-upgrades, then apply each exact proposed payload through legacy-upgrade.mts. Each upgrade preserves original v1 bytes in a sibling, writes its validated v2 ledger and lint-clean outcome, updates the generated index, retires only its bound legacy narrative and rebuilds/checks the graph. Required archive verification reads receive explicit per-invocation receipts before I/O. Original archives, compact records and historical durable targets remain unchanged.

Approval covers only the five slugs below, their exact staged supplements and payloads, and the archive-verification reads required to apply and verify them. Other campaign slugs and the four historical destination conflicts retain separate gates.

## Coverage and omissions

| Pitch | Retained / required sections | Coverage | Other files accounted | Whole-file omissions | Outcome bytes / cap |
|---|---:|---:|---:|---:|---:|
| opencode-handoff | 6/7 | 85.71% | 2/2 | 0 | 963/3000 |
| orca-vendor-orchestration | 2/2 | 100.00% | 6/6 | 0 | 1215/3000 |
| orca-vendor-dispatch | 7/7 | 100.00% | 7/7 | 0 | 1077/3000 |
| orca-vendor-reconcile | 6/7 | 85.71% | 6/6 | 1 | 1207/3000 |
| ts-runtime-injection | 7/7 | 100.00% | 21/21 | 3 | 1258/3000 |

All 30 required sections and 42 other files have explicit, original-hash-bound judgments. Retained section coverage is 28/30 (93.33%); all required items are accounted for. There are two omitted sections and four omitted whole files: four process-noise items and two superseded items. There are no accepted gaps or other-reason omissions and no new knowledge entries. No behavior/decision targets a generated index, outcome record or historical pitch directory.

Exact omissions:

- opencode-handoff / SHIPPED.md#pitch-implementation-reconciliation — process-noise: completion checklist and document-size acceptance bookkeeping; the deliverable, correction and scope survive.
- orca-vendor-reconcile / SHIPPED.md#followups — process-noise: pointer-only section; the retained compact record and source supplement preserve the historical limits.
- orca-vendor-reconcile / hill.md — process-noise: intermediate positions/legend and superseded counts; final results and provenance remain.
- ts-runtime-injection / baseline.md — process-noise: raw pre-change counts/hashes; reusable parity method survives from detailed baselines.
- ts-runtime-injection / checkpoint.md — superseded: unfinished-wave instruction replaced by shipped closure; shared-ownership lessons remain.
- ts-runtime-injection / hill.md — superseded: intermediate state replaced by final closure; host/launcher caveats remain.

Within retained files, repeated counts, scratch paths, scheduling and obsolete proposals add no further shipped behavior; substantive lessons and qualifications are retained in the linked destinations. The ledger records whole-file disposition; each supplement describes the relevant historical exclusions.

## Source-review findings retained

- OpenCode handoff: corrected absent-adapter diagnosis, handoff-only scope, historical probe authority and unresolved original date versus index date.
- Orchestration: read-only investigation, plausible launcher diagnosis, upstream-versus-installed evidence, mail delivery semantics, superseded policy proposals and unmet all-vendor acceptance.
- Dispatch: partial-S0 approval, failure-resource receipts and retained ownership, two-cycle audit limits, mutation gap, earlier flake and unsupported appetite/rate-limit claims.
- Reconcile: accepted scope overrun, exact scratch-Git safeguards, later review/count chronology, clean-export missing dependency and historical race/platform/budget limits.
- Runtime migration: plugin/Python exceptions, accepted behavior/history qualifications, ESM injection and binary adapter lessons, hidden test discovery, original guard-coverage and path-replacement limitations.

## Exact proposed outcomes

Each complete fenced record below exceeds ten lines. Outcome links resolve from project root. Supplement Markdown links resolve from the final records/legacy-upgrades directory; they intentionally do not resolve from the staging directory. Historical verification is clearly distinguished from current checks.

### opencode-handoff

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/opencode-handoff.md)

```markdown
---
slug: opencode-handoff
shipped: 2026-10-09
schemaVersion: 1
---
# opencode-handoff

The handoff captures OpenCode adapter and Orca integration context.
Its probe and verification claims describe the historical session.
Current runtime requirements and historical scope limits are linked below.

- outcome: A project-local OpenCode handoff preserves configuration, blockers and verification guidance.
- docs: [historical handoff](.project/context/opencode-handoff.md), [current Orca contract](ai-framework/integrations/orca-vendors.md)
- decisions: [scope and evidence limits](.project/records/legacy-upgrades/opencode-handoff.md#scope-and-evidence-limits)
- knowledge: none
- code: none
- verification: [historical checks](.project/context/opencode-handoff.md#how-to-verify)
- followups: [remaining verification limits](.project/records/legacy-upgrades/opencode-handoff.md)
- archive: [source supplement](.project/records/legacy-upgrades/opencode-handoff.md)
```

### orca-vendor-orchestration

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/orca-vendor-orchestration.md)

```markdown
---
slug: orca-vendor-orchestration
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-orchestration

The orchestration initiative split into four separately shipped parts.
Its current contract describes policy, dispatch, reconciliation and integration.
Historical investigation and partial live verification remain separately recorded.

- outcome: Four guarded components provide optional multi-vendor Orca coordination.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md)
- decisions: [coordination boundaries](.project/records/legacy-upgrades/orca-vendor-orchestration.md#configuration-and-coordination-boundaries)
- knowledge: [executed-case reporting](.project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md)
- code: none
- verification: [historical feasibility](.project/records/legacy-upgrades/orca-vendor-orchestration.md#historical-feasibility)
- followups: [closure and provenance](.project/records/legacy-upgrades/orca-vendor-orchestration.md#closure-and-provenance)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-orchestration.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-orchestration.md)
```

### orca-vendor-dispatch

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/orca-vendor-dispatch.md)

```markdown
---
slug: orca-vendor-dispatch
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-dispatch

Dispatch uses an ownership ledger and a guarded launch boundary.
The implementation and current Orca contract describe supported behavior.
Historical verification, partial live proof and review limits remain linked below.

- outcome: Supervised dispatch preserves ownership across launch, completion and retry.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md)
- decisions: [scope and source discrepancies](.project/records/legacy-upgrades/orca-vendor-dispatch.md#scope-and-source-discrepancies)
- knowledge: none
- code: [dispatch](ai-framework/scripts/orca-dispatch.mts)
- verification: [historical closure](.project/records/pitch-compression/orca-vendor-dispatch.md)
- followups: [historical limits](.project/records/legacy-upgrades/orca-vendor-dispatch.md#audit-and-historical-limits)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-dispatch.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-dispatch.md)
```

### orca-vendor-reconcile

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/orca-vendor-reconcile.md)

```markdown
---
slug: orca-vendor-reconcile
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-reconcile

Reconciliation admits and checks worker changes before integration.
Evidence and cleanup decisions remain bound to the integrated patch.
Historical review chronology and assurance limits remain separately recorded.

- outcome: Guarded reconciliation preserves user changes and patch-bound settlement evidence.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md#reconcile-core-opt-in-library-only)
- decisions: [approved scope](.project/records/legacy-upgrades/orca-vendor-reconcile.md#scope-and-build-decisions)
- knowledge: [patch-bound settlement](.project/knowledge/patterns/settle-only-with-proof-bound-to-this-patch.md)
- code: [reconcile core](ai-framework/scripts/orca-reconcile.mts)
- verification: [historical closure](.project/records/pitch-compression/orca-vendor-reconcile.md)
- followups: [assurance limits](.project/records/legacy-upgrades/orca-vendor-reconcile.md#historical-assurance-and-limitations)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-reconcile.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-reconcile.md)
```

### ts-runtime-injection

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/ts-runtime-injection.md)

```markdown
---
slug: ts-runtime-injection
shipped: 2026-10-08
schemaVersion: 1
---
# ts-runtime-injection

Workflow tooling uses injected runtime adapters and direct TypeScript entries.
Current runtime and sync documentation own execution and upgrade guidance.
The source supplement preserves historical exceptions, migration lessons and verification limits.

- outcome: Injected Node and Bun adapters support direct workflow tooling without a build step.
- docs: [runtime](ai-framework/scripts/runtime/README.md), [upgrade guidance](ai-framework/docs/versioning-and-sync.md)
- decisions: [module and adapter choices](.project/records/legacy-upgrades/ts-runtime-injection.md#module-and-adapter-decisions)
- knowledge: [sync safety](.project/knowledge/patterns/sync-tools-refuse-symlinks-in-source-and-destination.md)
- code: [runtime selection](ai-framework/scripts/runtime/select.mts)
- verification: [historical closure](.project/records/pitch-compression/ts-runtime-injection.md)
- followups: [historical limits](.project/records/legacy-upgrades/ts-runtime-injection.md#scope-and-historical-limits)
- archive: [compact record](.project/records/pitch-compression/ts-runtime-injection.md), [source supplement](.project/records/legacy-upgrades/ts-runtime-injection.md)
```

## Validation and proof boundaries

All five original archives were fully verified after receipt logging, with 185,845 bytes across 42 source files. Reviewer analysis used private verified copies. Each per-pitch reviewer inspected every file and rechecked the exact proposal. Corrections to hypothetical worker-marker denial and historical runtime guard/race limits were incorporated and hashes regenerated. No archive was reopened for projected validation or synthetic rehearsal.

Shared validator, outcome lint and supplement link checks in projected final locations:

```text
{"slug":"opencode-handoff","coverage":0.8571428571428571,"sections":7,"otherFiles":2,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":963,"recordCap":3000,"supplementBytes":1698,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"orca-vendor-orchestration","coverage":1,"sections":2,"otherFiles":6,"omissions":{},"acceptedGaps":[],"recordBytes":1215,"recordCap":3000,"supplementBytes":6239,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"orca-vendor-dispatch","coverage":1,"sections":7,"otherFiles":7,"omissions":{},"acceptedGaps":[],"recordBytes":1077,"recordCap":3000,"supplementBytes":5543,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"orca-vendor-reconcile","coverage":0.8571428571428571,"sections":7,"otherFiles":6,"omissions":{"process-noise":2},"acceptedGaps":[],"recordBytes":1207,"recordCap":3000,"supplementBytes":4499,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"ts-runtime-injection","coverage":1,"sections":7,"otherFiles":21,"omissions":{"process-noise":1,"superseded":2},"acceptedGaps":[],"recordBytes":1258,"recordCap":3000,"supplementBytes":7328,"projectedValidation":"passed","supplementLinks":"passed"}
{"projectedKnowledgeEntries":45,"sourceArchivesReopened":false}
```

Isolated real apply/replay rehearsal against synthetic archives reconstructed from the verified source copies:

```text
opencode-handoff: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
orca-vendor-orchestration: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
orca-vendor-dispatch: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
orca-vendor-reconcile: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
ts-runtime-injection: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
Rehearsal: 5 generated index rows, 5 upgraded slugs; real bundle graph commands with fixture Graphify extraction; live archives not reopened
```

The fixture used a real Git commitment for v1 ledgers and original durable targets. Real bundle graph rebuild/check commands ran with fixture Graphify supplying an empty extraction base, exercising the real knowledge overlay. This proves transaction, validator, lint, v1 retention, archive integrity and replay paths. Live one-hop graph reachability, root immutable-source snapshots and final live exits remain required after apply approval. The first fixture run correctly refused because the context target was omitted from its synthetic commit; the fixture was corrected without changing live targets. A staged-location link check was corrected to use final projected paths. Both incidents are recorded in the pitch log.

Live status remains 43 legacy, zero partial and three upgraded; compacted-slug dual reading counts 46 once. Tier A remains 3/19 upgraded. Four historical target conflicts remain stopped. Full-suite state-fragment/dataset failures remain open and unwaived; this gate does not approve shipping.

## Metrics validation

The local workflow-usage state records this S3 activity as a collector-clock build phase under connected-memory-consolidation, scope S3. Three pause/resume pairs existed at review start; the phase pauses again at this gate. The workflow report confirms observed collection. Native-source labels alone do not verify automatic primary Codex capture. Observed workflow events are recorded, while automatic primary Codex token/cost capture remains unavailable; no missing usage or historical duration is fabricated.

Machine-readable proof: [preview evidence](2026-10-22-p2c-s3-batch2-preview-evidence.toon).

## Decision

Approve / Revise / Back / Stop. Approval publishes these five exact supplements and applies these five exact payloads, including receipt-gated archive reads for required verification.

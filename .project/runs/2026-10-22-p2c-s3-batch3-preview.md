# P2c-S3 batch 3 — apply preview

Prepared 2026-10-22 after owner approval of source review for the five named pitches. This is the apply gate. No batch-3 live upgrade has run.

## Exact proposed actions

Publish the five staged source supplements under .project/records/legacy-upgrades, then apply each exact proposed payload through legacy-upgrade.mts. Each upgrade preserves original v1 bytes in a sibling, writes its validated v2 ledger and lint-clean outcome, updates the generated index, retires only its bound legacy narrative and rebuilds/checks the graph. Required archive verification reads receive explicit per-invocation receipts before I/O. Original archives, compact records and historical durable targets remain unchanged.

Approval covers only the five slugs below, their exact staged supplements and payloads, and the archive-verification reads required to apply and verify them. Other campaign slugs and the four historical destination conflicts retain separate gates.

## Coverage and omissions

| Pitch | Retained / required sections | Coverage | Other files accounted | Whole-file omissions | Outcome bytes / cap |
|---|---:|---:|---:|---:|---:|
| independent-rereview-catch-up | 25/25 | 100.00% | 24/24 | 16 | 1424/3000 |
| native-safety-feasibility | 8/10 | 80.00% | 14/14 | 8 | 1013/3000 |
| orca-vendor-foundation | 17/21 | 80.95% | 12/12 | 2 | 1371/3000 |
| orca-vendor-reconcile-integration | 7/8 | 87.50% | 5/5 | 1 | 1467/3000 |
| runtime-test-helpers | 9/9 | 100.00% | 6/6 | 1 | 1208/3000 |

All 73 required sections and 61 other files have explicit, original-hash-bound judgments (286,779 source bytes across 63 files). Retained section coverage is 66/73 (90.41%); all required items are accounted for. There are seven omitted sections and 28 omitted whole files: 35 process-noise omissions, no other reason. There are no accepted gaps or other-reason omissions and no new knowledge entries. No behavior/decision targets a generated index, outcome record or historical pitch directory. Destinations are only each pitch's unchanged compact record or its own staged supplement, so each binding is one of two hashes.

Exact omissions:

- independent-rereview-catch-up / hill.md — process-noise: its file-count table duplicates the shipped record and log; the shared-suite count discrepancy survives in the supplement.
- independent-rereview-catch-up / prompts/*.txt (15 files: s1-s1a to s1-s1e, s2-s2a to s2-s2e, s3-cross, s3-fix, s3-s3a to s3-s3c) — process-noise: one-shot reviewer dispatch prompts; the reusable template lives in the audit phase and each review record keeps its prompt hash.
- native-safety-feasibility / SHIPPED.md#delivery — process-noise: ship-gate bookkeeping only; the compact record also duplicates it.
- native-safety-feasibility / log.md#2026-09-26-shipped — process-noise: closure bookkeeping only.
- native-safety-feasibility / audit-code-cycle-1.md, audit-code-cycle-2.md, audit-cross-cycle-1.md, audit-security-cycle-1.md, audit-test-cycle-1.md — process-noise: per-reviewer records and scratch-canary bookkeeping summarized in the retained audit.md and the supplement's audit triage.
- native-safety-feasibility / audit-prompts.md — process-noise: reviewer prompt text; only the known-limitations list survives, in the supplement.
- native-safety-feasibility / hill.md — process-noise: positions superseded by the shipped record.
- native-safety-feasibility / ship-readiness.md — process-noise: duplicates SHIPPED.md.
- orca-vendor-foundation / SHIPPED.md#closing-gate — process-noise: process-only gate record that repeats ship selection.
- orca-vendor-foundation / log.md#audit-cycles-1-2 — process-noise: repeats the retained audit cycle record.
- orca-vendor-foundation / log.md#ship-preparation-2026-10-07 — process-noise: ship bookkeeping.
- orca-vendor-foundation / log.md#ship-closed-2026-10-07 — process-noise: closure bookkeeping.
- orca-vendor-foundation / hill.md — process-noise: positions superseded by the shipped record.
- orca-vendor-foundation / pre-build-inventory.json — process-noise: stale hashes; the source evidence says it is not a restore target.
- orca-vendor-reconcile-integration / SHIPPED.md#followups — process-noise: pointer-only section; the follow-up backlog owns the items.
- orca-vendor-reconcile-integration / hill.md — process-noise: all scopes done; stale nine-test grader count.
- runtime-test-helpers / hill.md — process-noise: all four scopes done; the 8/8 self-test count is superseded by 13/13.

Within retained files, repeated counts, scratch paths, scheduling and superseded plan limits add no further shipped behavior; substantive lessons and qualifications are retained in the linked destinations. The ledger records whole-file disposition; each supplement describes the relevant historical exclusions.

## Source-review findings retained

- Independent re-review: reviewer models and why, whole-file prompts and scratch-copy proofs, S1 to S3 finding classes and unfixed items, plus six explicit historical contradictions (must-fix-only versus lower-tier fixes, canary claims, missing S3 guard snapshot, overlapping-pitch claim, count discrepancy, unamended first-pass contract).
- Native safety: medium-to-must-fix promotion of M1, security walk and cross-pitch result, reviewer-told non-defects, line count 384 versus 386, and an unresolved ship date (source 2026-09-26, index 2026-09-27).
- Foundation: policy and preflight contract, mutation outcomes (17 of 20 and 15 of 15), pinned Orca 1.4.222 guide hashes, audit canaries versus real fixes, deferred items, release numbering and the external commit.
- Reconcile integration: one-file overrun accepted, CLI contract and exit codes, reviewer isolation and canary, commit hygiene, test-count differences and live smoke limited to Claude.
- Runtime test helpers: memoryFs symlink contract, no automatic fixture cleanup, Buffer versus Uint8Array, mutant survival before the fix, superseded runScript runner reading and unreconciled failure counts.

## Exact proposed outcomes

Each complete fenced record below exceeds ten lines. Outcome links resolve from project root. Supplement Markdown links resolve from the final records/legacy-upgrades directory; they intentionally do not resolve from the staging directory. Historical verification is clearly distinguished from current checks.

### independent-rereview-catch-up

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/independent-rereview-catch-up.md)

```markdown
---
slug: independent-rereview-catch-up
shipped: 2026-09-27
schemaVersion: 1
---
# independent-rereview-catch-up

A review bench and audit reviewer contract supported fresh-context re-review of shipped compaction, metrics and state code.
Independence meant fresh context in the same model family, not independent blind spots.
Source inconsistencies and unfixed review limits remain separately recorded.

- outcome: Fresh-context re-review of shipped workflow code is supported by a review bench and reviewer contract.
- docs: [audit reviewer contract](ai-framework/workflow/phases/3-audit.md)
- decisions: [reviewer protocol rationale](.project/records/legacy-upgrades/independent-rereview-catch-up.md#reviewer-protocol-rationale)
- knowledge: [instrument audit lesson](.project/knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md), [author trust lesson](.project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md)
- code: [review bench](ai-framework/scripts/review-bench.mts)
- verification: [historical closure](.project/records/pitch-compression/independent-rereview-catch-up.md)
- followups: [historical inconsistencies](.project/records/legacy-upgrades/independent-rereview-catch-up.md#historical-inconsistencies)
- archive: [compact record](.project/records/pitch-compression/independent-rereview-catch-up.md), [source supplement](.project/records/legacy-upgrades/independent-rereview-catch-up.md)
```

### native-safety-feasibility

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/native-safety-feasibility.md)

```markdown
---
slug: native-safety-feasibility
shipped: 2026-09-27
schemaVersion: 1
---
# native-safety-feasibility

A scratch-only spike measured directory-relative and inode-anchored primitives on one macOS host.
It changed no production code and does not certify other platforms.
Assurance limits and the date discrepancy remain separately recorded.

- outcome: Scratch measurements informed the inode-anchoring decision without changing the runtime contract.
- docs: none
- decisions: [inode anchoring and stable inode locks](.project/knowledge/decisions/inode-anchoring-and-stable-inode-locks.md)
- knowledge: none
- code: none
- verification: [historical closure](.project/records/pitch-compression/native-safety-feasibility.md)
- followups: [assurance limits](.project/records/legacy-upgrades/native-safety-feasibility.md#assurance-limits)
- archive: [compact record](.project/records/pitch-compression/native-safety-feasibility.md), [source supplement](.project/records/legacy-upgrades/native-safety-feasibility.md)
```

### orca-vendor-foundation

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/orca-vendor-foundation.md)

```markdown
---
slug: orca-vendor-foundation
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-foundation

Foundation added an opt-in vendor policy reader, a bounded read-only preflight and static doctor diagnostics.
No worker is launched and every result reports normal workflow with dispatch not ready.
Fixture and mutation evidence does not establish live Orca readiness.

- outcome: Opt-in vendor policy, bounded preflight and diagnostics prepare Orca coordination without launching workers.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md)
- decisions: [policy and preflight contract](.project/records/legacy-upgrades/orca-vendor-foundation.md#scope-and-policy-contract)
- knowledge: [opt-in before discovery](.project/knowledge/patterns/opt-in-before-runtime-discovery.md), [rounded-zero timeout](.project/knowledge/issues/rounded-zero-timeout-disables-cancellation.md)
- code: [policy](ai-framework/scripts/orca-policy.mts), [preflight](ai-framework/scripts/orca-preflight.mts)
- verification: [historical closure](.project/records/pitch-compression/orca-vendor-foundation.md)
- followups: [open items](.project/records/legacy-upgrades/orca-vendor-foundation.md#open-items)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-foundation.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-foundation.md)
```

### orca-vendor-reconcile-integration

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/orca-vendor-reconcile-integration.md)

```markdown
---
slug: orca-vendor-reconcile-integration
shipped: 2026-10-08
schemaVersion: 1
---
# orca-vendor-reconcile-integration

A thin CLI, grader and opt-in wiring connect Orca reconciliation to the workflow phases.
Worker text stays data, human gates stay in place and live smoke observed Claude only.
Historical counts, review limits and follow-ups remain separately recorded.

- outcome: A thin guarded CLI and grader wire opt-in Orca reconciliation into the workflow without live multi-vendor proof.
- docs: [current Orca contract](ai-framework/integrations/orca-vendors.md)
- decisions: [scope and build decisions](.project/records/legacy-upgrades/orca-vendor-reconcile-integration.md#scope-and-build-decisions)
- knowledge: [thin CLI](.project/knowledge/patterns/a-thin-cli-keeps-every-guard-in-the-library.md), [grader reporting](.project/knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md)
- code: [CLI](ai-framework/scripts/orca-run.mts), [grader](ai-framework/scripts/orca-eval-grader.mts)
- verification: [historical closure](.project/records/pitch-compression/orca-vendor-reconcile-integration.md)
- followups: [assurance limits](.project/records/legacy-upgrades/orca-vendor-reconcile-integration.md#historical-assurance-and-limitations)
- archive: [compact record](.project/records/pitch-compression/orca-vendor-reconcile-integration.md), [source supplement](.project/records/legacy-upgrades/orca-vendor-reconcile-integration.md)
```

### runtime-test-helpers

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/runtime-test-helpers.md)

```markdown
---
slug: runtime-test-helpers
shipped: 2026-10-08
schemaVersion: 1
---
# runtime-test-helpers

Shared runtime test helpers were added and piloted on three suites.
Callers remain responsible for fixture cleanup and for binary-comparison conventions.
Review chronology and historical failure counts remain separately recorded.

- outcome: Shared runtime test helpers provide fakes and fixtures for workflow test suites.
- docs: none
- decisions: [build decisions](.project/records/legacy-upgrades/runtime-test-helpers.md#build-decisions-and-incidents)
- knowledge: [faithful fakes](.project/knowledge/patterns/keep-the-fakes-guarantee-the-thing-they-replace.md), [alias guard](.project/knowledge/issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard.md)
- code: [test helpers](ai-framework/scripts/runtime/test-helpers.mts)
- verification: [historical closure](.project/records/pitch-compression/runtime-test-helpers.md)
- followups: [historical limits](.project/records/legacy-upgrades/runtime-test-helpers.md#historical-limits)
- archive: [compact record](.project/records/pitch-compression/runtime-test-helpers.md), [source supplement](.project/records/legacy-upgrades/runtime-test-helpers.md)
```

## Validation and proof boundaries

All five original archives were fully verified earlier after receipt logging, with 286,779 bytes across 63 source files. Reviewer analysis used private verified copies. Every proposed section and file hash is the normalized body hash the apply tool derives from the archived bytes. No archive was reopened for projected validation or synthetic rehearsal.

Shared validator, outcome lint and supplement link checks in projected final locations:

```text
{"slug":"independent-rereview-catch-up","coverage":1,"sections":25,"otherFiles":24,"omissions":{"process-noise":16},"acceptedGaps":[],"recordBytes":1424,"recordCap":3000,"supplementBytes":4122,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"native-safety-feasibility","coverage":0.8,"sections":10,"otherFiles":14,"omissions":{"process-noise":10},"acceptedGaps":[],"recordBytes":1013,"recordCap":3000,"supplementBytes":3722,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"orca-vendor-foundation","coverage":0.8095238095238095,"sections":21,"otherFiles":12,"omissions":{"process-noise":6},"acceptedGaps":[],"recordBytes":1371,"recordCap":3000,"supplementBytes":5950,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"orca-vendor-reconcile-integration","coverage":0.875,"sections":8,"otherFiles":5,"omissions":{"process-noise":2},"acceptedGaps":[],"recordBytes":1467,"recordCap":3000,"supplementBytes":3019,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"runtime-test-helpers","coverage":1,"sections":9,"otherFiles":6,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1208,"recordCap":3000,"supplementBytes":2306,"projectedValidation":"passed","supplementLinks":"passed"}
{"newKnowledgeEntries":0,"sourceArchivesReopened":false}
```

Isolated real apply/replay rehearsal against synthetic archives reconstructed from the verified source copies:

```text
independent-rereview-catch-up: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
native-safety-feasibility: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
orca-vendor-foundation: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
orca-vendor-reconcile-integration: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
runtime-test-helpers: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
Rehearsal: 5 generated index rows, 5 upgraded slugs; real bundle graph commands with fixture Graphify extraction; live archives not reopened
```

The fixture used a real Git commitment for v1 ledgers and original durable targets, the real knowledge tree for the graph validator, and real bundle graph rebuild/check commands with a fixture Graphify supplying an empty extraction base. This proves transaction, validator, lint, v1 retention, archive integrity and replay paths. Live one-hop graph reachability, root immutable-source snapshots and final live exits remain required after apply approval. The first supplement link check in the fixture reported one missing target each for two supplements because those linked files had not been copied into the projected tree; the fixture was corrected without changing any supplement or live target. This incident and the unconfirmed wiki-link premise are recorded in the pitch log.

Live status remains 38 legacy, zero partial and eight upgraded; compacted-slug dual reading counts 46 once. Tier A remains 8/19 upgraded. Four historical target conflicts remain stopped. Full-suite state-fragment/dataset failures remain open and unwaived; this gate does not approve shipping.

Source-review boundary incidents carried forward: the earlier native reviewer ran broad searches over .project and all three first-wave reviewers enumerated filenames, as recorded in the pitch log; that output is excluded from source provenance and was not retroactively authorized. This assembly stayed within the private cache, drafts, reviews, batch-2 files and explicit durable paths. One premise was not borne out: the compact record of orca-vendor-foundation uses wiki identifiers for its three knowledge entries, and all three resolve to existing entries. The supplement therefore records that the compact record uses identifiers rather than file links, and links the three files.

## Metrics validation

Machine-readable proof: [preview evidence](2026-10-22-p2c-s3-batch3-preview-evidence.toon). Observed workflow events are recorded, while automatic primary Codex token/cost capture remains unavailable; no missing usage or historical duration is fabricated.

## Decision

Approve / Revise / Back / Stop. Approval publishes these five exact supplements and applies these five exact payloads, including receipt-gated archive reads for required verification.

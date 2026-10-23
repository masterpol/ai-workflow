# P2c-S3 batch 8 — apply preview

Prepared 2026-10-22 after owner approval of source review for five pitches (tier B-small pointer ledgers): state-ai-authoring (27 pointer sections, 7 other files), state-deep-evidence (32, 9), state-fragment-sanitizer (38, 10), state-report-redesign (8, 12) and test-execution-performance (11, 9). This is the apply gate. No batch-8 live upgrade has run, nothing was published to live records, and nothing was committed.

## Exact proposed actions

Publish the five staged source supplements under .project/records/legacy-upgrades, then apply each exact proposed payload through legacy-upgrade.mts (version 2.48.1). None of these pitches has a compact record, so the upgrade retires each done-work narrative and each new supplement is the durable home for every retained fact. Each upgrade preserves original v1 bytes in a sibling, writes its validated v2 ledger and lint-clean outcome, updates the generated index, retires only its bound legacy narrative and rebuilds/checks the graph. Required archive verification reads receive explicit per-invocation receipts before I/O. Original archives and historical durable targets remain unchanged.

New in this batch: every payload carries one reviewed destination-drift acceptance for .project/pitches/_followups.md (see Reviewed destination drift). Approval covers only the five slugs below, their exact staged supplements and payloads, the five drift acceptances and the archive-verification reads required to apply and verify them. Other campaign slugs retain separate gates.

## Coverage and omissions

| Pitch | Retained / required sections | Coverage | Other files | Omissions | Outcome bytes / cap | Supplement bytes |
|---|---:|---:|---|---:|---:|---:|
| state-ai-authoring | 27/27 | 100.00% | 7/7 retained, 7/7 accounted | 0 | 2027/3000 | 23181 |
| state-deep-evidence | 31/32 | 96.88% | 9/9 retained, 9/9 accounted | 1 | 1894/3000 | 21917 |
| state-fragment-sanitizer | 36/38 | 94.74% | 9/10 retained, 10/10 accounted | 3 | 1885/3000 | 27492 |
| state-report-redesign | 8/8 | 100.00% | 12/12 retained, 12/12 accounted | 0 | 1822/3000 | 11708 |
| test-execution-performance | 10/11 | 90.91% | 8/9 retained, 9/9 accounted | 2 | 1784/3000 | 6546 |

All 116 required sections and 47 other files have explicit, original-hash-bound judgments (550,949 source bytes across 47 files). Retained section coverage is 112/116 (96.55%) and 45/47 other files are retained. Six items are omitted (four sections and two whole files, listed below), each with a closed reason; there are no accepted gaps and no new knowledge entries. Every body and file hash is the value computed by the real bodyHashOf with the runtime sha256Hex, and the rehearsal re-derived them through the tool's own validator.

Exact omissions (reasons are from the closed set process-noise and superseded):

- state-deep-evidence / deviations.md#open-for-s5 (section) — superseded
- state-fragment-sanitizer / log.md#2026-10-19-s2s4-wave-started (section) — process-noise
- state-fragment-sanitizer / log.md#s4-collection-and-diff-hygiene (section) — process-noise
- state-fragment-sanitizer / hill.md (file) — process-noise
- test-execution-performance / SHIPPED.md#doc-updates (section) — process-noise
- test-execution-performance / plan.md (file) — process-noise

- state-deep-evidence deviations.md#open-for-s5 is superseded because the S5 log entry shows the wiring and the invalid-name handling done.
- state-fragment-sanitizer log sections hold only run and context ids, message ids and delivery acknowledgements; the vendor-placement and graph-restore facts are kept through the deviations sections. Its hill.md differs from the tracked run copy (2,431 against 1,621 bytes), so it is omitted rather than mapped.
- test-execution-performance plan.md is scaffolding whose exit criteria were met; SHIPPED doc-updates only notes that testing.md exists and no ADR was needed.

Byte-identical run copies. The cached bodies were compared byte for byte with these tracked files, so the hill chart or log is retained instead of omitted, mapped to the copy, and bound by the copy's hash:

- state-ai-authoring hill.md → .project/runs/2026-10-20-state-ai-authoring-hill.md (1,541 bytes). The reviewer proposed omitting it; the tracked run copy of its log is NOT identical (1,653 against 16,420 bytes), so log.md is merged into the supplement.
- state-deep-evidence log.md → .project/runs/2026-10-21-state-deep-evidence.md (17,184 bytes) and hill.md → .project/runs/2026-10-21-state-deep-evidence-hill.md (2,195 bytes). The reviewer proposed omitting the hill.
- state-report-redesign hill.md → .project/runs/2026-10-19-state-report-redesign-hill.md (1,527 bytes). No log file exists in its archive. The reviewer proposed omitting the hill.
- test-execution-performance log.md → .project/runs/2026-10-21-test-execution-performance.md (1,117 bytes) and hill.md → .project/runs/2026-10-21-test-execution-performance-hill.md (961 bytes). The reviewer proposed omitting the hill.
- state-fragment-sanitizer: neither the log nor the hill matches its run copy, so no run copy is mapped.

Reviewer destinations changed: state-ai-authoring SHIPPED.md#doc-updates maps to the what-shipped section (where the docs paragraph lives) rather than scope-and-contract. Reviewer drafts proposed omitting the hill chart of four pitches; those are retained as above.

Dropped or softened claims (the cache or a named durable file does not support them):

- state-fragment-sanitizer: a named orca-run reconcile command (cache only says reconciled), live line counts 266/268/134 and 668, statements that the live state report guide's caps and reason classes were verified equal to the spike lists, and a link to an untracked candidate pitch file (now named in prose only). The stale-doc remark is reworded: at ship the guide said the library was not wired; a later pitch added the injector.
- state-deep-evidence: the claim that the guard snapshot card records a 16 MiB shared limit from token-time-report; the supplement now says only that the linked card records later status for that cap. The citation path is written value.open as the sources have it.
- state-ai-authoring: a 120-row count for the live-runs table (the cache table has about 85 data rows; the supplement says only the full per-run table), and the reviewer's statement that the upgrade must keep live-runs.md or change the test, which is an owner decision (see below).
- Links only to tracked files that exist; the staged-supplement link check lists no missing or untracked target.

## Reviewed destination drift

Each v1 ledger cites .project/pitches/_followups.md as a legacy destination. That living file changed after the introducing commit of every one of the five ledgers (all introduced in b26b45b0e90ef02cadd850b9c151def287690cd0), so legacy-upgrade stops unless the payload carries acceptDestinationDrift bound to the exact committed and current hashes and a written reason. I diffed the committed blob against the live file: 32 changed lines (7 removed, 25 added), in lines 385, 393, 400, 409 and 414 (approval tags or a note on other candidate pitches: agent-model-sweep-bet-3, mandatory-fixture-seeding, doc-sweep-stale-claims, bundle-sync-stale-ledger) and from line 537 (two candidate bullets rewritten to name moved pitch files, then two new candidate sections and a connected-memory-consolidation ship-verification entry). The span from line 443 to 523, which holds all five pitches' followups sections, hashes identically in both versions (sha256:008377e741a3943c923c40965db49e267fd537799315242532437b8817908301). None of the five pitches' own followups lines changed, so no pitch was stopped.

| Pitch | Introducing commit | committed hash | current hash | Own followups lines (unchanged) |
|---|---|---|---|---|
| state-ai-authoring | `b26b45b0e90e` | `sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10` | `sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5` | 476-483 |
| state-deep-evidence | `b26b45b0e90e` | `sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10` | `sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5` | 505-515 |
| state-fragment-sanitizer | `b26b45b0e90e` | `sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10` | `sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5` | 462-468 |
| state-report-redesign | `b26b45b0e90e` | `sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10` | `sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5` | 443-451 |
| test-execution-performance | `b26b45b0e90e` | `sha256:b5b291191757d02022ed4dc426b4e505f33050531446fe83f557e8d0c135ec10` | `sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5` | 516-523 |

Written reasons placed in the payloads (each under the 500 character limit, 303 characters):

- state-ai-authoring: Backlog edited after v1 commit b26b45b (32 changed lines): lines 385, 393, 400, 409 and 414 gained an approval tag or note on other candidate pitches; bullets 537-538 now name moved pitch files; 18 lines were appended. This pitch's own followups, lines 476-483, are unchanged (lines 443-523 hash equal).
- state-deep-evidence: Backlog edited after v1 commit b26b45b (32 changed lines): lines 385, 393, 400, 409 and 414 gained an approval tag or note on other candidate pitches; bullets 537-538 now name moved pitch files; 18 lines were appended. This pitch's own followups, lines 505-515, are unchanged (lines 443-523 hash equal).
- state-fragment-sanitizer: Backlog edited after v1 commit b26b45b (32 changed lines): lines 385, 393, 400, 409 and 414 gained an approval tag or note on other candidate pitches; bullets 537-538 now name moved pitch files; 18 lines were appended. This pitch's own followups, lines 462-468, are unchanged (lines 443-523 hash equal).
- state-report-redesign: Backlog edited after v1 commit b26b45b (32 changed lines): lines 385, 393, 400, 409 and 414 gained an approval tag or note on other candidate pitches; bullets 537-538 now name moved pitch files; 18 lines were appended. This pitch's own followups, lines 443-451, are unchanged (lines 443-523 hash equal).
- test-execution-performance: Backlog edited after v1 commit b26b45b (32 changed lines): lines 385, 393, 400, 409 and 414 gained an approval tag or note on other candidate pitches; bullets 537-538 now name moved pitch files; 18 lines were appended. This pitch's own followups, lines 516-523, are unchanged (lines 443-523 hash equal).

Notes: the unchanged lines are the state-report-redesign leftovers section (443-451), the From state-fragment-sanitizer section (462-468), the state-ai-authoring items inside From workflow-usage-state (476-483), From state-deep-evidence ship (505-515) and From test-execution-performance ship (516-523).

The acceptance is bound to the live bytes read now. The current hash is sha256:d0404fd9e23bfeb0230a469b09f0312a5ffde39b7070dcbdadf8aaa0748495f5. It must be re-checked at gate time. Any edit to .project/pitches/_followups.md before apply, including adding or removing a line anywhere in the file, invalidates the acceptance and the binding, and stops the upgrade with no write. The apply window must therefore contain no other edits to that file. If it changes, regenerate the hashes and this table, and review again.

## Owner decision to surface: state-ai-authoring live-runs.md

The removed .project/pitches/state-ai-authoring/live-runs.md (36,920 bytes; cache hash sha256:2fad1150d2cb1b0b4455560ac4c38ad4d027c3613186dc7d4d062578ce30f092 is the ledger-normalized body hash, and the raw file hash is sha256:868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a) is read by ai-framework/scripts/state-fragment-dataset.test.mts through a path constant at line 17, in the test at line 435. That directory is already absent, so the test fails with ENOENT today (the unwaived item recorded in the followups entry "Stale live-evidence test blocks shipping"). The supplement does not carry the table; it summarises harness, budget, per-case pass counts, the Cursor not-run row and the blocked claim. I am not deciding between:

1. Restore live-runs.md at a tracked path and repoint the test constant. Effect: the test passes and the claim stays computed against real evidence; the restored bytes come from the verified cache (or a separately approved archive read) and must match the cached hash; it adds a tracked evidence file and one test-source edit. The upgrade retiring the narrative is unaffected.
2. Change the test so it does not require the real record (keep the synthetic negative controls only). Effect: the failure ends without restoring a file, but the computed-claim check against the real 72-run record is lost and the blocked claim then lives only in the supplement prose.
3. Waive the failure. Effect: the ENOENT stays, the full suite stays red, and ship of connected-memory-consolidation stays blocked until a later fix.

This batch's apply does not change that failure either way: the pitch directory is already gone, the supplement does not recreate the file, and no test or production file is edited.

## Source-review findings retained

- state-ai-authoring: the five-slot design and header grammar, hash and stamp pipeline, standing constraints and the two accepted weaknesses, deviations D1 to D43, three review rounds, the spike and 72-run matrix with per-case pass counts, audit cycle 1 canaries, test and mutant progressions, follow-ups and lessons.
- state-deep-evidence: the four additive sections, corrections found against the code, design decisions and module key rule, critique rulings, plan and entry gate, deviations and size exceptions, build log highlights, live evaluation and regressions, audit chronology, incidents, owner decisions and release records.
- state-fragment-sanitizer: the library contract and public API, caps, decisions D1 to D10, rejection message contract, dataset partition, 52-row mutation ledger, build history and Orca incidents, three audit cycles including the A7 Proxy defect, verification history and open items.
- state-report-redesign: the seven scope outcomes, detector precedence, chart and shell contracts, plan corrections, critique, standing constraints, the audit triage with canary results, verification history and open items.
- test-execution-performance: what run-tests.mts does, scopes and deviations, the median table, no-gos, rabbit holes, verification and audit, research notes and open followups.

## Contradictions kept as historical

Each supplement lists its contradictions without rewriting them. state-ai-authoring: uncited-claim fails everywhere versus one Codex pass; hill S9 pending versus owner-accepted blocked claim; INCOMPLETE validator result versus a local toon edit; 14, 15 file counts; estimated versus measured costs. state-deep-evidence: ship date 2026-10-22 versus 2026-10-21; LOC 1636 versus 1667; 8 versus 11 link documents; log opus versus audit.md gpt reviewers. state-fragment-sanitizer: 2.35.0 versus 2.35.1; production lines 605 to 666; 45 versus 52 mutation rows; 319 versus 330 lines; Orca Run bound versus unbound. state-report-redesign: file and LOC projections; charts planned versus shipped; canary caught or not. test-execution-performance: ship date, 70 versus 75 files, 2425 versus 2428 passes, 8 versus 11 tests.

## Exact proposed outcomes

Outcome links resolve from project root. Supplement Markdown links resolve from the final records/legacy-upgrades directory; they intentionally do not resolve from the staging directory. Historical verification is distinguished from current checks.

### state-ai-authoring

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/state-ai-authoring.md)

```markdown
---
slug: state-ai-authoring
shipped: 2026-10-20
schemaVersion: 1
---
# state-ai-authoring

The /state report can carry short analysis written by the authoring model. A guarded injector stamps a draft only after sanitizer and citation checks pass, and stamped fragments render in a box labelled proposed, not observed.
Failures close per slot. Three independent review rounds and one audit cycle found no live must-fix, and release 2.37.0 shipped.
The live matrix was not met: the claim is blocked with 51 of 72 graded runs passing, accepted by the owner. Cursor never ran.

- outcome: Fragment authoring and injection ship with a closed failure model; the cross-vendor live claim stays blocked and recorded.
- docs: [state report contract](ai-framework/integrations/state-report.md), [state skill](.claude/skills/state/SKILL.md), [reports README](ai-framework/templates/project/reports/README.md)
- decisions: [state report design](.project/knowledge/decisions/project-state-report-design.md), [review rounds and rulings](.project/records/legacy-upgrades/state-ai-authoring.md#build-deviations-and-rulings)
- knowledge: [planted canary](.project/knowledge/patterns/a-planted-canary-makes-a-reviewer-finding-checkable.md), [literal prose example](.project/knowledge/patterns/a-prose-example-in-a-model-instruction-is-followed-literally.md), [headless CLI follows PWD](.project/knowledge/issues/a-headless-cli-follows-pwd-not-the-process-cwd.md)
- code: [injection module](ai-framework/scripts/state-fragment-inject.mts), [dataset mapping test](ai-framework/scripts/state-fragment-dataset.test.mts), [authoring cases](.project/evals/datasets/state-ai-authoring.json)
- verification: [verification history](.project/records/legacy-upgrades/state-ai-authoring.md#verification-history)
- followups: [follow-ups and limits](.project/records/legacy-upgrades/state-ai-authoring.md#follow-ups-and-limits), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/state-ai-authoring.md)
```

### state-deep-evidence

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/state-deep-evidence.md)

```markdown
---
slug: state-deep-evidence
shipped: 2026-10-21
schemaVersion: 1
---
# state-deep-evidence

State snapshots gained four additive sections, architecture, history, risks and tokens, built from bounded, guarded inputs with schemaVersion still 1 and missing data reported as unavailable rather than zero.
Release 2.39.0 shipped with the monorepo package map cut and 1667 added lines against a 1350 cap, accepted by the owner in writing.
The live matrix was blocked by two 0.50 regressions and unrun OpenCode and Cursor rows; the owner accepted the risk without relabelling any result.

- outcome: Deep evidence facts ship with explicit exceptions for size and live quality; no clean cross-vendor AI-quality claim is made.
- docs: [state report guide](ai-framework/integrations/state-report.md)
- decisions: [state report design](.project/knowledge/decisions/project-state-report-design.md), [audit and owner decisions](.project/records/legacy-upgrades/state-deep-evidence.md#audit-and-owner-decisions)
- knowledge: [scrubbing bypass](.project/knowledge/issues/snapshot-metadata-bypassed-output-scrubbing.md), [guard snapshot cap](.project/knowledge/issues/review-guard-snapshot-can-outgrow-its-reader.md), [package-less wrapper](.project/knowledge/issues/package-less-bundle-ship-wrapper-cannot-select-checks.md)
- code: [graph](ai-framework/scripts/state-graph.mts), [history](ai-framework/scripts/state-history.mts), [snapshot](ai-framework/scripts/state-snapshot.mts), [dataset](.project/evals/datasets/state-deep-evidence.json)
- verification: [verification history](.project/records/legacy-upgrades/state-deep-evidence.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/state-deep-evidence.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/state-deep-evidence.md)
```

### state-fragment-sanitizer

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/state-fragment-sanitizer.md)

```markdown
---
slug: state-fragment-sanitizer
shipped: 2026-10-20
schemaVersion: 1
---
# state-fragment-sanitizer

A pure sanitizer library now turns untrusted AI fragment text into re-emitted allow-listed markup with citations, or a rejection with a closed reason, and a separate evidence checker binds numbers and paths to the snapshot.
Three audit cycles ended clean after fixing a caller-limits Proxy bypass of the depth cap; 531 tests and 51 of 52 mutant rows killed, one proven redundant.
Release 2.35.0 shipped with 666 of 800 production lines. Rendering and injection were left to state-ai-authoring.

- outcome: A bounded, no-echo fragment sanitizer and citation checker ship as a library with a 13 and 9 dataset partition.
- docs: [state report guide](ai-framework/integrations/state-report.md)
- decisions: [design decisions D1 to D10](.project/records/legacy-upgrades/state-fragment-sanitizer.md#design-decisions)
- knowledge: [limits object defeats cap](.project/knowledge/patterns/a-caller-supplied-limits-object-can-defeat-a-hard-cap.md), [sparse array holes](.project/knowledge/issues/a-sparse-array-hole-skips-every-but-visits-for-of.md), [named test per case](.project/knowledge/patterns/a-golden-dataset-case-counts-only-when-a-named-test-passes.md)
- code: [parser](ai-framework/scripts/state-fragment-parse.mts), [validator](ai-framework/scripts/state-fragment.mts), [evidence checker](ai-framework/scripts/state-fragment-evidence.mts), [dataset](.project/evals/datasets/state-ai-fragments.json)
- verification: [verification history](.project/records/legacy-upgrades/state-fragment-sanitizer.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/state-fragment-sanitizer.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/state-fragment-sanitizer.md)
```

### state-report-redesign

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/state-report-redesign.md)

```markdown
---
slug: state-report-redesign
shipped: 2026-10-19
schemaVersion: 1
---
# state-report-redesign

The /state report was redesigned: one owned stylesheet and shell, a slate and blue default theme, SVG bar charts with data tables, headline cards, five empty fragment slots and a repoShape detector for monorepos.
One audit cycle fixed seven should-fix findings after every reviewer must-fix proved to be a planted canary; 200 state tests pass against a 170 baseline.
Release 2.33.0 shipped, 12 files and 414 production lines. Skill wording and browser checks at 360px and print remain open.

- outcome: A redesigned inert report with charts, navigation and theme precedence ships; the AI slots stay empty until later parts.
- docs: [state report guide](ai-framework/integrations/state-report.md)
- decisions: [state report design](.project/knowledge/decisions/project-state-report-design.md), [bounded font discovery](.project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md)
- knowledge: [prototype keys in counters](.project/knowledge/issues/counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys.md), [scratch copy runs its suites](.project/knowledge/issues/an-audit-scratch-copy-must-run-its-own-suites.md)
- code: [design](ai-framework/scripts/state-design.mts), [charts](ai-framework/scripts/state-charts.mts), [structure](ai-framework/scripts/state-structure.mts), [theme](ai-framework/scripts/state-theme.mts)
- verification: [verification history](.project/records/legacy-upgrades/state-report-redesign.md#verification-history)
- followups: [limits and open items](.project/records/legacy-upgrades/state-report-redesign.md#limits-and-open-items), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/state-report-redesign.md)
```

### test-execution-performance

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/test-execution-performance.md)

```markdown
---
slug: test-execution-performance
shipped: 2026-10-21
schemaVersion: 1
---
# test-execution-performance

A tested run-tests.mts entry point now discovers the full suite deterministically, reports the effective child runtime and supports bounded workers, a Node compile cache, coverage and listing, refusing unsupported settings.
No speed setting was promoted: Node workers were 24 percent slower, the compile cache 8 percent faster, and Bun parallel failed parity, all measured on a contended host.
Release 2.40.0 shipped. An idle-host rerun and the Bun timeout decision stay open.

- outcome: A guarded test runner and testing guide ship with defaults unchanged and the speed evidence recorded as unproven.
- docs: [testing guide](ai-framework/docs/testing.md), [testing rule](ai-framework/rules/testing.md), [performance rule](ai-framework/rules/performance.md)
- decisions: [measured outcome](.project/records/legacy-upgrades/test-execution-performance.md#measured-outcome)
- knowledge: [real-path containment](.project/knowledge/patterns/path-containment-compares-real-paths.md), [nested test context](.project/knowledge/issues/a-nested-node-test-child-inherits-the-parents-test-context.md), [runCli argv](.project/knowledge/issues/runcli-replaces-proc-argv-with-the-arguments-only.md)
- code: [run-tests](ai-framework/scripts/run-tests.mts), [run-tests tests](ai-framework/scripts/run-tests.test.mts)
- verification: [verification and audit](.project/records/legacy-upgrades/test-execution-performance.md#verification-and-audit)
- followups: [open followups](.project/records/legacy-upgrades/test-execution-performance.md#open-followups), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/test-execution-performance.md)
```

## Validation and proof boundaries

All five archives were fully verified earlier after receipt logging, with 550,949 bytes across 47 source files. Reviewer analysis used private verified copies. Every proposed section and file hash is the normalized body hash the apply tool derives from the archived bytes. No archive was reopened for projected validation or the synthetic rehearsal.

Shared v2 validation, outcome lint and supplement link checks in projected final locations:

```text
{"slug":"state-ai-authoring","coverage":1,"sections":27,"otherFiles":7,"omissions":{},"acceptedGaps":[],"recordBytes":2027,"recordCap":3000,"supplementBytes":23181,"destinationDriftAcceptances":1,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"state-deep-evidence","coverage":0.96875,"sections":32,"otherFiles":9,"omissions":{"superseded":1},"acceptedGaps":[],"recordBytes":1894,"recordCap":3000,"supplementBytes":21917,"destinationDriftAcceptances":1,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"state-fragment-sanitizer","coverage":0.9473684210526315,"sections":38,"otherFiles":10,"omissions":{"process-noise":3},"acceptedGaps":[],"recordBytes":1885,"recordCap":3000,"supplementBytes":27492,"destinationDriftAcceptances":1,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"state-report-redesign","coverage":1,"sections":8,"otherFiles":12,"omissions":{},"acceptedGaps":[],"recordBytes":1822,"recordCap":3000,"supplementBytes":11708,"destinationDriftAcceptances":1,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"test-execution-performance","coverage":0.9090909090909091,"sections":11,"otherFiles":9,"omissions":{"process-noise":2},"acceptedGaps":[],"recordBytes":1784,"recordCap":3000,"supplementBytes":6546,"destinationDriftAcceptances":1,"projectedValidation":"passed","supplementLinks":"passed"}
{"newKnowledgeEntries":0,"sourceArchivesReopened":false}
```

Isolated real apply/replay rehearsal against synthetic archives reconstructed from the verified source copies. For each pitch: the fixture committed the v1 ledger and the destination at the committed _followups.md bytes, then replaced the destination with the live drifted bytes, and the rehearsal asserted that apply refuses with no acceptance, with a wrong committed hash, with a wrong current hash and after a further edit to the destination (each leaving state legacy and the ledger unchanged); then dry run leaves state legacy, real apply with the acceptance, v2 status, outcome lint, v1 byte retention, archive verify, archive bytes unchanged, replay, generated index row present, retired narrative heading absent, neighbouring done-work entries byte-identical, supplement docs-links including linked sibling supplements:

```text
state-ai-authoring: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (4 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 18 neighbouring done-work entries byte-identical
state-deep-evidence: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (4 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 18 neighbouring done-work entries byte-identical
state-fragment-sanitizer: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (4 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 18 neighbouring done-work entries byte-identical
state-report-redesign: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (4 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 18 neighbouring done-work entries byte-identical
test-execution-performance: drift acceptance applied; refused when absent, with a wrong committed hash, a wrong current hash and an edit after review (4 refusals, no state change); projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS; supplement links passed; 18 neighbouring done-work entries byte-identical
Rehearsal: 5 generated index rows, 5 upgraded slugs, retired narratives absent, neighbouring done-work entries byte-identical; real bundle graph commands with fixture Graphify extraction; live archives not reopened
```

The fixture used a real Git commitment for v1 ledgers and their bound destinations, the real knowledge tree for the graph validator, the full live done-work file, the real narrative bound by each legacyEntryHash, and real bundle graph rebuild/check commands with a fixture Graphify supplying an empty extraction base. This proves transaction, validator, lint, drift acceptance, v1 retention, archive integrity, narrative retirement and replay paths. Live one-hop graph reachability, root immutable-source snapshots and final live exits remain required after apply approval. No live ledger, index or record was touched.

No apply has run. Live state remains 27 upgraded and 19 legacy (46 pitches in all; read-only status check). This gate does not approve shipping.

Boundary notes: no archive directory was opened, listed or searched, and no broad search over .project was run; the cache was the source. Live files read beyond the staged campaign inputs were the done-work narratives, the tracked run copies compared with the cache, the followups backlog (diffed against its committed blob), the dataset test around lines 17 and 425-445, and existence and tracking checks of linked paths.

## Metrics validation

Machine-readable proof: [preview evidence](2026-10-22-p2c-s3-batch8-preview-evidence.toon). Observed workflow events are recorded, while automatic primary Codex token/cost capture remains unavailable; no missing usage or historical duration is fabricated.

## Decision

Approve / Revise / Back / Stop. Approval publishes these five exact supplements and applies these five exact payloads with their drift acceptances, including receipt-gated archive reads for required verification.

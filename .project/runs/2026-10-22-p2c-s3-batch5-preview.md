# P2c-S3 batch 5 — apply preview

Prepared 2026-10-22 after owner approval of source review for the five named pitches (tier B pointer ledgers: agent-model-sweep is B-large with 13 done-work pointer sections, the others B-small). This is the apply gate. No batch-5 live upgrade has run, nothing was published to live records, and nothing was committed.

## Exact proposed actions

Publish the five staged source supplements under .project/records/legacy-upgrades, then apply each exact proposed payload through legacy-upgrade.mts. None of these pitches has a compact record, so the upgrade retires the done-work narrative and each new supplement is the durable home for every retained fact. Each upgrade preserves original v1 bytes in a sibling, writes its validated v2 ledger and lint-clean outcome, updates the generated index, retires only its bound legacy narrative and rebuilds/checks the graph. Required archive verification reads receive explicit per-invocation receipts before I/O. Original archives and historical durable targets remain unchanged.

Approval covers only the five slugs below, their exact staged supplements and payloads, and the archive-verification reads required to apply and verify them. Other campaign slugs retain separate gates.

## Coverage and omissions

| Pitch | Retained / required sections | Coverage | Other files | Whole-file omissions | Outcome bytes / cap | Supplement bytes |
|---|---:|---:|---|---:|---:|---:|
| agent-model-sweep | 14/14 | 100.00% | 4/5 retained, 5/5 accounted | 1 | 1493/3000 | 13221 |
| fix-instruction-conflicts | 8/8 | 100.00% | 4/4 retained, 4/4 accounted | 0 | 1583/3000 | 10887 |
| orca-engines-range | 9/9 | 100.00% | 5/6 retained, 6/6 accounted | 1 | 1381/3000 | 7599 |
| path-safety-hardening | 12/12 | 100.00% | 15/21 retained, 21/21 accounted | 6 | 1534/3000 | 9743 |
| shape-lite | 2/2 | 100.00% | 5/6 retained, 6/6 accounted | 1 | 1363/3000 | 6992 |

All 45 required sections and 42 other files have explicit, original-hash-bound judgments (149,200 source bytes across 43 files). Retained section coverage is 45/45 (100.00%); 33 of 42 other files are retained and all are accounted for. There are nine omitted whole files and no omitted sections: all nine are process-noise, no superseded or other reason. There are no accepted gaps and no new knowledge entries. Every body and file hash is the value computed by the real bodyHashOf with the runtime sha256Hex, and the isolated rehearsal reconstructed the sources and re-derived them through the tool's own validator. Section and file destinations are anchors in each pitch's own staged supplement, except one section (path-safety-hardening log.md#reproducible-in-memory-mutation-method) that points at the existing pattern entry prove-a-guard-test-with-an-in-memory-mutant. Bindings are therefore the supplement hash plus the unchanged legacy knowledge destinations already bound by the v1 ledgers (one for agent-model-sweep, three for path-safety-hardening). Those four files were checked against the Git commit that introduced each v1 ledger and have not drifted, so no drift acceptance is needed.

Exact omissions:

- agent-model-sweep / hill.md — process-noise: all seven scopes done; its 54/54 doctor figure is superseded by 56/56 and noted in the supplement.
- orca-engines-range / hill.md — process-noise: all scopes done; its 53 tests and 2160 rows are superseded by 57 and 2480.
- shape-lite / hill.md — process-noise: all four scopes done; the conflicting "6 new tests" figure is noted in the supplement.
- path-safety-hardening / hill.md — process-noise: both scopes done; content equals the shipped record.
- path-safety-hardening / completion-audit-code-prompt.txt, completion-audit-cross-prompt.txt, completion-audit-security-prompt.txt, completion-audit-test-prompt.txt, completion-audit-test-cycle2-prompt.txt — process-noise: exact reviewer dispatch text; hashes and coverage limits remain in each retained report and in the supplement.
- fix-instruction-conflicts: no omissions. Prompt hashes and Orca delivery bookkeeping inside audit.md are not carried; the run, workers, canary and findings are.

Within retained files, the five-case mutation script in path-safety-hardening log.md is not kept (three cases belong to other pitches and its file names are obsolete); the method is in the existing pattern entry. The ledger records whole-file disposition; each supplement describes the relevant historical exclusions.

## Source-review findings retained

- agent-model-sweep: the three-bet shape, the 16 profile assignments, atomic canonical plus Cursor commit, opencode top-level model pairing, doctor fallback removal, the four incidents (unmet dependency, codex effort mismatch, mandatory toon, upgrade fixture failures), audit M1 to M5, historical counts, Bet 3 shape and deferred should-fixes.
- fix-instruction-conflicts: findings A to M with their single owners, the cycle 1 Orca run with canary and the owner-accepted eval risk, the validation pass (run_320b1626df73, not certified independent) and unreconciled counts.
- orca-engines-range: the range grammar and default, S1 to S4 behavior, upgrade note, deviations d1 to d5, the canary and parity run, historical verification and followups.
- path-safety-hardening: the approved trusted-directory contract, shared journal namespace and quiesce-before-migration duty, test and mutant history, audit chronology with the superseded cycle 1 verdict, open limits and delivery.
- shape-lite: scopes S1 to S4 including the added import validation, critique findings K1 to K4, S1 to S3, A1, deviations, audit M1, M2 and S1 to S5, and acknowledged items.

## Contradictions kept as historical

Each supplement lists its contradictions without rewriting them. Highlights: agent-model-sweep doctor test counts 54, 56, 48 and 67, version 2.27.0 versus 2.28.0, open incidents that were later resolved, F1 labelled cycle 1 and cycle 2; fix-instruction-conflicts contract counts 8, 14 and 13, two Orca runs with different independence, "9 residuals" versus seven topics, and a validation record that says it is not shipped; orca-engines-range 2160 versus 2480 rows, plan versus shipped invalid-range reason, "0 must-fix" versus a refuted canary; path-safety-hardening 4096 versus 4097 lock-read bytes, 132, 189, 58 and 231 counts, a superseded "cannot ship" verdict, two versus four mutants and knowledge entries dated after the ship; shape-lite 2.9.0 versus 2.9.1, `--phase shape` versus `utility`, 6 versus 10 tests.

## Exact proposed outcomes

Outcome links resolve from project root. Supplement Markdown links resolve from the final records/legacy-upgrades directory; they intentionally do not resolve from the staging directory. Historical verification is distinguished from current checks.

### agent-model-sweep

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/agent-model-sweep.md)

```markdown
---
slug: agent-model-sweep
shipped: 2026-10-16
schemaVersion: 1
---
# agent-model-sweep

Canonical agents declare a capability profile in frontmatter and no longer name a model.
The doctor reads profiles from that key, warns without it and no longer guesses from model prefixes.
Cursor mirrors, opencode routing, tests and docs changed together; other vendor mirrors stayed for a later bet.

- outcome: Agent profiles come from one frontmatter key checked by the doctor and an invariant test.
- docs: [harnesses](ai-framework/integrations/harnesses.md), [vendors](ai-framework/docs/vendors.md), [extending](ai-framework/docs/extending.md)
- decisions: [profile detection in frontmatter](.project/knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md)
- knowledge: [warn text consistency](.project/knowledge/patterns/warn-text-must-be-self-consistent-with-the-code-it-ships.md), [mandatory config check](.project/knowledge/patterns/mandatory-config-files-emit-one-top-level-failure.md)
- code: [doctor](ai-framework/scripts/workflow-doctor.mts), [invariant test](ai-framework/scripts/agent-frontmatter-invariant.test.mts)
- verification: [historical counts](.project/records/legacy-upgrades/agent-model-sweep.md#verification-and-historical-counts)
- followups: [Bet 3 and historical limits](.project/records/legacy-upgrades/agent-model-sweep.md#follow-ups-and-historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/agent-model-sweep.md)
```

### fix-instruction-conflicts

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/fix-instruction-conflicts.md)

```markdown
---
slug: fix-instruction-conflicts
shipped: 2026-10-18
schemaVersion: 1
---
# fix-instruction-conflicts

Conflicting instructions across phase specs, skills, agents and rules now agree, with one owner per topic.
No gate, reviewer, evidence requirement or permission boundary was removed.
Contract tests guard the owners; live behavior across vendors was not verified.

- outcome: Each instruction topic has one owning file and contract tests keep its copies consistent.
- docs: [orca vendors](ai-framework/integrations/orca-vendors.md), [vendors](ai-framework/docs/vendors.md), [skill defaults](ai-framework/integrations/skill-defaults.md)
- decisions: [findings and owners](.project/records/legacy-upgrades/fix-instruction-conflicts.md#findings-and-owners)
- knowledge: [one owner per topic](.project/knowledge/patterns/one-owner-per-instruction-topic-guarded-by-contract-tests.md), [instruction drift](.project/knowledge/issues/instruction-copies-drift-into-contradictions.md)
- code: [contract tests](ai-framework/scripts/workflow-contracts.test.mts), [security reviewer](.claude/agents/security-reviewer.md), [overview](ai-framework/workflow/overview.md)
- verification: [review chronology](.project/records/legacy-upgrades/fix-instruction-conflicts.md#review-chronology), [validation pass](.project/records/legacy-upgrades/fix-instruction-conflicts.md#validation-pass)
- followups: [historical limits](.project/records/legacy-upgrades/fix-instruction-conflicts.md#historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/fix-instruction-conflicts.md)
```

### orca-engines-range

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/orca-engines-range.md)

```markdown
---
slug: orca-engines-range
shipped: 2026-10-16
schemaVersion: 1
---
# orca-engines-range

The accepted Orca version is now an npm-style range in config instead of a constant in code.
A hand-written linear parser checks it, and invalid ranges fail closed with a position.
A bare version is an exact pin; the default floor is greater than or equal to 1.4.224.

- outcome: Projects state the supported Orca versions as a range and new releases need no code edit.
- docs: [orca vendors](ai-framework/integrations/orca-vendors.md)
- decisions: [decisions and deviations](.project/records/legacy-upgrades/orca-engines-range.md#decisions-and-deviations)
- knowledge: [parse untrusted values](.project/knowledge/patterns/parse-untrusted-values-and-re-emit-them.md), [backtracking regex](.project/knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md)
- code: [range engine](ai-framework/scripts/runtime/semver-range.mts), [preflight](ai-framework/scripts/orca-preflight.mts), [config](ai-framework/scripts/runtime/config.mts)
- verification: [historical verification](.project/records/legacy-upgrades/orca-engines-range.md#historical-verification)
- followups: [followups](.project/records/legacy-upgrades/orca-engines-range.md#followups), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/orca-engines-range.md)
```

### path-safety-hardening

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/path-safety-hardening.md)

```markdown
---
slug: path-safety-hardening
shipped: 2026-09-27
schemaVersion: 1
---
# path-safety-hardening

Ledger commits, archive, removal and recovery now share one transaction context and journal namespace.
New writes refuse pending compaction or legacy installer journals; ancestor swaps and symlinks are refused.
The supported contract is trusted project directories; hostile ancestor races stay unsolved and open.

- outcome: Managed writes stay inside the project under the trusted-directory contract, and interrupted ledger commits recover.
- docs: [project readme](README.md)
- decisions: [shared recovery context and trusted directories](.project/knowledge/decisions/compaction-recovery-shares-context-and-trusted-directories.md)
- knowledge: [lock reader exposed to new callers](.project/knowledge/issues/reusing-a-transaction-exposes-its-lock-reader-to-new-callers.md), [in-memory mutant](.project/knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md)
- code: [skill registry](ai-framework/scripts/skill-registry.mts), [pitch compress](ai-framework/scripts/pitch-compress.mts), [pitch archive](ai-framework/scripts/pitch-archive.mts)
- verification: [verification history](.project/records/legacy-upgrades/path-safety-hardening.md#verification-history), [run record](.project/runs/2026-09-27-path-safety-hardening.md)
- followups: [historical limits](.project/records/legacy-upgrades/path-safety-hardening.md#historical-limits)
- archive: [source supplement](.project/records/legacy-upgrades/path-safety-hardening.md)
```

### shape-lite

Exact proposed payload · [Exact source supplement](../records/legacy-upgrades/shape-lite.md)

```markdown
---
slug: shape-lite
shipped: 2026-10-07
schemaVersion: 1
---
# shape-lite

A fast, bounded framing step handles small tasks or mid-flow rejections inside or outside an active pitch.
It keeps the graph-only knowledge gate, mechanical escalation to full shape and a single approval gate.
A validated AGENTS.md import for CLAUDE.md was added during the build.

- outcome: Small tasks and rejections get a compressed framing step that escalates to full shape on hard triggers.
- docs: [shape-lite skill](.claude/skills/shape-lite/SKILL.md)
- decisions: [shape-lite is a gated escalating variant](.project/knowledge/decisions/shape-lite-is-a-gated-escalating-variant-of-shape.md)
- knowledge: [quadratic regex](.project/knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md), [gate must not trust its author](.project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md)
- code: [entry import](ai-framework/scripts/entry-import.mts), [entry import tests](ai-framework/scripts/entry-import.test.mts)
- verification: [audit and review chronology](.project/records/legacy-upgrades/shape-lite.md#audit-and-review-chronology)
- followups: [historical limits](.project/records/legacy-upgrades/shape-lite.md#historical-limits), [backlog](.project/pitches/_followups.md)
- archive: [source supplement](.project/records/legacy-upgrades/shape-lite.md)
```

## Validation and proof boundaries

All five original archives were fully verified earlier after receipt logging, with 149,200 bytes across 43 source files. Reviewer analysis used private verified copies. Every proposed section and file hash is the normalized body hash the apply tool derives from the archived bytes. No archive was reopened for projected validation or synthetic rehearsal.

Shared validator, outcome lint and supplement link checks in projected final locations:

```text
{"slug":"agent-model-sweep","coverage":1,"sections":14,"otherFiles":5,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1493,"recordCap":3000,"supplementBytes":13221,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"fix-instruction-conflicts","coverage":1,"sections":8,"otherFiles":4,"omissions":{},"acceptedGaps":[],"recordBytes":1583,"recordCap":3000,"supplementBytes":10887,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"orca-engines-range","coverage":1,"sections":9,"otherFiles":6,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1381,"recordCap":3000,"supplementBytes":7599,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"path-safety-hardening","coverage":1,"sections":12,"otherFiles":21,"omissions":{"process-noise":6},"acceptedGaps":[],"recordBytes":1534,"recordCap":3000,"supplementBytes":9743,"projectedValidation":"passed","supplementLinks":"passed"}
{"slug":"shape-lite","coverage":1,"sections":2,"otherFiles":6,"omissions":{"process-noise":1},"acceptedGaps":[],"recordBytes":1363,"recordCap":3000,"supplementBytes":6992,"projectedValidation":"passed","supplementLinks":"passed"}
{"newKnowledgeEntries":0,"sourceArchivesReopened":false}
```

Isolated real apply/replay rehearsal against synthetic archives reconstructed from the verified source copies (dry run leaves state legacy, real apply, v2 status, outcome lint, v1 byte retention, archive verify, archive bytes unchanged, replay, generated index row present and retired narrative heading absent, supplement docs-links):

```text
agent-model-sweep: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
fix-instruction-conflicts: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
orca-engines-range: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
path-safety-hardening: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
shape-lite: projected shared validator, outcome lint, apply, v1 byte retention, archive verify and replay PASS
Rehearsal: 5 generated index rows, 5 upgraded slugs, retired narratives absent; real bundle graph commands with fixture Graphify extraction; live archives not reopened
```

The fixture used a real Git commitment for v1 ledgers and their legacy destinations, the real knowledge tree for the graph validator, the real done-work narrative bound by each legacyEntryHash, and real bundle graph rebuild/check commands with a fixture Graphify supplying an empty extraction base. This proves transaction, validator, lint, v1 retention, archive integrity, narrative retirement and replay paths. Live one-hop graph reachability, root immutable-source snapshots and final live exits remain required after apply approval. No live ledger, index or record was touched.

Live status remains 31 legacy, zero partial and 15 upgraded (46 pitches in all). This gate does not approve shipping.

Boundary notes: no archive directory was opened, listed or searched, and no broad search over .project was run. Source claims in the reviews that the cached bodies do not support were dropped: the agent-model-sweep statement that the Claude Code no-model precondition "held" (the sources record a documented assumption and no test), the description of finding F1 as documentation accuracy (it was the contradictory warn text), and a named "shape-lite followups" section in the backlog (the sources say only that five followups were added). The path-safety-hardening review listed audit-cycle-1.md as an other file; the cache holds it as a section, so it is judged there and the 21 other files follow the cache. The fix-instruction-conflicts review text was cut off; the full cached SHIPPED, log, audit and validation bodies were read and the supplement was checked against them. The reviews contain no body hashes, so there was no reviewer hash comparison; hashes come from the tool function and the rehearsal validator.

## Metrics validation

Machine-readable proof: [preview evidence](2026-10-22-p2c-s3-batch5-preview-evidence.toon). Observed workflow events are recorded, while automatic primary Codex token/cost capture remains unavailable; no missing usage or historical duration is fabricated.

## Decision

Approve / Revise / Back / Stop. Approval publishes these five exact supplements and applies these five exact payloads, including receipt-gated archive reads for required verification.

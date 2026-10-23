# P2c-S3 batch 1 — apply preview

Prepared 2026-10-22 after the owner approved source review for these three named pitches. This is the live mutation gate. Original archives verified, then source review used bounded temporary copies; no live upgrade has run.

## Proposed actions

Publish the three reviewed source supplements under `.project/records/legacy-upgrades/`, then apply each exact proposed payload through `legacy-upgrade.mts`. Apply preserves each v1 ledger sibling, replaces its active ledger with validated v2 content, publishes its outcome record, regenerates the index, retires only its bound legacy narrative and rebuilds/checks the graph. Re-verify each named source archive with an approval receipt during apply. Keep all existing compact records and source archives unchanged.

Approve covers these three slugs and their required archive-verification reads only. Further pitches and historical destination conflicts keep their gates.

## Coverage and omissions

| Pitch | Required sections kept | Other files accounted | Omitted files | Outcome bytes / cap |
|---|---:|---:|---:|---:|
| bundle-sync-marker-fix | 11/11 (100%) | 7/7 | 1 process-noise | 932/3000 |
| fix-workflow-runner-env | 9/9 (100%) | 10/10 | 5 process-noise | 1044/3000 |
| readme-split | 8/8 (100%) | 7/7 | 1 process-noise | 964/3000 |

Every required section is retained as merged content with an original-body hash. There are no section omissions, no other omission reasons and no accepted gaps. No behavior or decision points to the generated index or an outcome record. No new knowledge entries are proposed.

Omitted other files:
- `bundle-sync-marker-fix/hill.md`: process-noise. Intermediate positions and the percentage legend are superseded by shipped closure evidence.
- `fix-workflow-runner-env/audit-1-code-prompt.txt`: process-noise. Generic role instructions and transient review mechanics add no independent evidence; material scope, review budgets and limitations are retained in the source supplement.
- `fix-workflow-runner-env/audit-1-conflicts-prompt.txt`: process-noise. Generic role instructions and transient review mechanics add no independent evidence; material scope, review budgets and limitations are retained in the source supplement.
- `fix-workflow-runner-env/audit-1-coverage-prompt.txt`: process-noise. Generic role instructions and transient review mechanics add no independent evidence; material scope, review budgets and limitations are retained in the source supplement.
- `fix-workflow-runner-env/audit-1-security-prompt.txt`: process-noise. Generic role instructions and transient review mechanics add no independent evidence; material scope, review budgets and limitations are retained in the source supplement.
- `fix-workflow-runner-env/hill.md`: process-noise. Intermediate positions and the percentage legend are superseded by shipped closure evidence.
- `readme-split/hill.md`: process-noise. Intermediate positions and the percentage legend are superseded by shipped closure evidence.

## Source-review corrections

- Bundle sync: retain the distinction between preserving a prior known base and leaving a never-known unverified base absent. Preserve the twelve-suite historical verification context and audit/recheck boundaries.
- Runner environment: supplement the inaccurate six-item compact summary without rewriting it. Retain operator-supplied evaluation as an original acknowledgment, separate old-Node uncertainty from that list, preserve child spawn options and fixture lessons, and record unresolved audit-model provenance and reviewer limits.
- README split: retain encoded-anchor/query-string and substring-reachability limits, reviewer verification exclusions, and documentation ownership/rationale. Remove the unrelated standing-decision link from the proposed outcome.

## Exact proposed outcome records

Each fenced sample below exceeds ten lines. Links are interpreted from the final project root by the outcome linter; these are complete proposed records, not newly executed historical verification.

### bundle-sync-marker-fix

Proposed payload · [Source supplement](../records/legacy-upgrades/bundle-sync-marker-fix.md)

```markdown
---
slug: bundle-sync-marker-fix
shipped: 2026-09-26
schemaVersion: 1
---
# bundle-sync-marker-fix

Bundle sync records the effective base for each file outcome.
The decision and code links below describe the current implementation.
Historical verification and closure evidence remain in the compact record.

- outcome: Bundle sync retains correct per-file bases across repeated comparisons.
- docs: [documentation](ai-framework/docs/versioning-and-sync.md)
- decisions: [decision](.project/knowledge/decisions/effective-sync-bases-and-bounded-font-discovery.md)
- knowledge: none
- code: [implementation](ai-framework/scripts/bundle-sync.mts)
- verification: [historical closure](.project/records/pitch-compression/bundle-sync-marker-fix.md)
- followups: none
- archive: [compact record](.project/records/pitch-compression/bundle-sync-marker-fix.md), [source supplement](.project/records/legacy-upgrades/bundle-sync-marker-fix.md)
```

### fix-workflow-runner-env

Proposed payload · [Source supplement](../records/legacy-upgrades/fix-workflow-runner-env.md)

```markdown
---
slug: fix-workflow-runner-env
shipped: 2026-10-08
schemaVersion: 1
---
# fix-workflow-runner-env

One runtime boundary selects the executable for workflow child processes.
The pattern and code links below describe runner precedence and failure behavior.
Historical verification and acknowledged followups remain in the compact record.

- outcome: Workflow child processes respect the selected runner and explicit child overrides.
- docs: [documentation](ai-framework/scripts/runtime/README.md)
- decisions: none
- knowledge: [pattern](.project/knowledge/patterns/one-boundary-selects-the-child-runner.md)
- code: [implementation](ai-framework/scripts/runtime/entry.mts)
- verification: [historical closure](.project/records/pitch-compression/fix-workflow-runner-env.md)
- followups: [source-review limits](.project/records/legacy-upgrades/fix-workflow-runner-env.md)
- archive: [compact record](.project/records/pitch-compression/fix-workflow-runner-env.md), [source supplement](.project/records/legacy-upgrades/fix-workflow-runner-env.md)
```

### readme-split

Proposed payload · [Source supplement](../records/legacy-upgrades/readme-split.md)

```markdown
---
slug: readme-split
shipped: 2026-10-08
schemaVersion: 1
---
# readme-split

The README links to workflow documentation under the bundle-owned directory.
The documentation and link-checker links below describe the current structure.
Historical verification and acknowledged limitations remain in the compact record.

- outcome: A short README links to portable workflow documentation checked by the bundle.
- docs: [documentation](README.md)
- decisions: [documentation ownership](.project/records/legacy-upgrades/readme-split.md#documentation-ownership)
- knowledge: none
- code: [implementation](ai-framework/scripts/docs-links.mts)
- verification: [historical closure](.project/records/pitch-compression/readme-split.md)
- followups: [source-review limits](.project/records/legacy-upgrades/readme-split.md)
- archive: [compact record](.project/records/pitch-compression/readme-split.md), [source supplement](.project/records/legacy-upgrades/readme-split.md)
```

## Validation evidence

- All three original archives passed full verify after per-slug receipts were fsynced; source sizes were 8,803 / 23,059 / 17,154 bytes.
- All 28 required section bodies and all 24 other-file hashes come from the verified original sources, not summaries.
- Read-only per-pitch reviewers compared every source file with retained destinations. Their concrete refinements were included and rebound into the proposals.
- The shared v2 validator and outcome linter passed for all three projected final trees, including new supplement targets and their knowledge dependencies.
- An isolated fixture committed the original v1 ledgers and unchanged destinations, reconstructed synthetic archives from the verified review cache, published the proposed supplements and ran real apply for all three. Each passed status upgraded, lint, v1 exact-byte retention, archive verify, and idempotent replay.
- Fixture index ended with three unique generated rows and none of those three legacy narratives. Actual bundle graph validation/rebuild commands ran; a fixture Graphify executable supplied an empty extraction base. This proves the transaction and knowledge overlay paths, not live one-hop graph navigation.
- Live one-hop graph navigation, root archive immutability checks and final per-slug live exits remain part of the authorized apply run.
- The live checkout remains 46 legacy, zero partial and zero upgraded. Historical destination conflicts in the other four tranche-A pitches remain unresolved.
- Full-suite state-fragment/dataset failures remain open; this gate does not approve shipping.

## Decision

Approve / Revise / Back / Stop. Approval publishes these exact supplements and applies these three exact payloads, including the receipt-gated archive verification required for each invocation.

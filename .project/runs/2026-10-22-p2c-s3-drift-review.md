# P2c-S3 destination-drift review (19 legacy pitches)

Read-only, Git-only (no archive access), prepared 2026-10-22 for the reviewed-drift gate (`acceptDestinationDrift`, v2.48.0). For each drifted destination: committed vs current content hash and whether any changed line mentions the pitch. Full per-entry data (36 entries, both hashes) is regenerated at each apply gate from the live files; a later edit to any of these living files invalidates its acceptance and stops the upgrade, so each batch is applied in one window.

## Summary

- 36 drift entries across 19 pitches (4 tier A, 15 B-small); 13 distinct files; no destination is missing on either side.
- `.project/pitches/_followups.md` drifts for 18 of 19 pitches, in three states (32, 220 and 311-319 changed lines depending on the introducing commit). The 32-line group covers: approval tags on other candidate pitches, two candidate pitches moved to their own pitch files, new candidate sections, and a new ship-verification entry. None of it edits the pitch's own followups entry; state-ai-authoring is mentioned once, inside the new ship-verification entry (a stale test reading its removed live-runs.md), not in its own section.
- Pitch-specific changes: `.project/knowledge/index.md` (generated catalog, 605 changed lines, mentions pitch-compaction in 6 and project-state-report in 9), project-state-report-design.md (12), reviewer-reports-contradicted-by-measurement.md (23), orca-vendors.md (111), testing.md (54), skills.md (42), add-skill SKILL.md (26), CHANGELOG.md (565, append-only history), three small knowledge edits (2-10 lines).

## Drift by file

| Drifted file | Pitches | Changed lines (vs. introducing commit) |
|---|---:|---|
| .project/pitches/_followups.md | 18 | 220, 311, 319, 32 |
| ai-framework/integrations/orca-vendors.md | 2 | 111 |
| .project/knowledge/issues/substring-hook-wiring-check-accepts-echoed-commands.md | 1 | 8 |
| .project/knowledge/issues/review-guard-hashes-ignored-secret-files.md | 1 | 10 |
| ai-framework/rules/testing.md | 1 | 54 |
| .project/knowledge/decisions/orca-auto-start-design.md | 1 | 2 |
| .project/knowledge/index.md | 4 | 605 |
| CHANGELOG.md | 3 | 565 |
| ai-framework/integrations/skills.md | 1 | 42 |
| .claude/skills/add-skill/SKILL.md | 1 | 26 |
| .project/knowledge/decisions/project-state-report-design.md | 1 | 12 |
| .project/knowledge/issues/reviewer-reports-contradicted-by-measurement.md | 1 | 23 |
| .project/knowledge/patterns/a-source-scanner-fails-closed-on-what-it-cannot-read.md | 1 | 2 |

## Per-pitch entries

| Pitch | Tier | Drifted file | Changed lines | Changed lines naming the pitch |
|---|---|---|---:|---:|
| codex-orca-coordinator-parity | A | .project/pitches/_followups.md | 220 | 0 |
| codex-orca-coordinator-parity | A | ai-framework/integrations/orca-vendors.md | 111 | 0 |
| codex-orca-coordinator-parity | A | .project/knowledge/issues/substring-hook-wiring-check-accepts-echoed-commands.md | 8 | 0 |
| codex-orca-coordinator-parity | A | .project/knowledge/issues/review-guard-hashes-ignored-secret-files.md | 10 | 0 |
| collector-robustness | B-small | .project/pitches/_followups.md | 311 | 0 |
| fix-orca-dispatch-resume-gate | B-small | .project/pitches/_followups.md | 220 | 0 |
| fix-orca-dispatch-resume-gate | B-small | ai-framework/integrations/orca-vendors.md | 111 | 0 |
| metrics-report-dimensions | B-small | .project/pitches/_followups.md | 319 | 0 |
| metrics-report-dimensions | B-small | ai-framework/rules/testing.md | 54 | 0 |
| orca-auto-start-all-phases | A | .project/knowledge/decisions/orca-auto-start-design.md | 2 | 0 |
| orca-auto-start-all-phases | A | .project/pitches/_followups.md | 220 | 0 |
| pitch-compaction | B-small | .project/pitches/_followups.md | 319 | 0 |
| pitch-compaction | B-small | .project/knowledge/index.md | 605 | 6 |
| portable-skill-defaults | B-small | .project/knowledge/index.md | 605 | 0 |
| portable-skill-defaults | B-small | CHANGELOG.md | 565 | 0 |
| portable-skill-installation | B-small | .project/knowledge/index.md | 605 | 0 |
| portable-skill-installation | B-small | .project/pitches/_followups.md | 319 | 0 |
| portable-skill-installation | B-small | CHANGELOG.md | 565 | 0 |
| portable-skill-installation | B-small | ai-framework/integrations/skills.md | 42 | 0 |
| portable-skill-installation | B-small | .claude/skills/add-skill/SKILL.md | 26 | 0 |
| project-state-report | B-small | .project/knowledge/decisions/project-state-report-design.md | 12 | 0 |
| project-state-report | B-small | .project/knowledge/index.md | 605 | 9 |
| project-state-report | B-small | .project/pitches/_followups.md | 319 | 0 |
| project-state-report | B-small | CHANGELOG.md | 565 | 0 |
| project-state-report | B-small | .project/knowledge/issues/reviewer-reports-contradicted-by-measurement.md | 23 | 0 |
| runner-aware-runtime-boundary-validator | A | .project/knowledge/patterns/a-source-scanner-fails-closed-on-what-it-cannot-read.md | 2 | 0 |
| runner-aware-runtime-boundary-validator | A | .project/pitches/_followups.md | 220 | 0 |
| state-ai-authoring | B-small | .project/pitches/_followups.md | 32 | 1 |
| state-deep-evidence | B-small | .project/pitches/_followups.md | 32 | 0 |
| state-fragment-sanitizer | B-small | .project/pitches/_followups.md | 32 | 0 |
| state-multipage-report | A | .project/pitches/_followups.md | 220 | 0 |
| state-report-redesign | B-small | .project/pitches/_followups.md | 32 | 0 |
| test-execution-performance | B-small | .project/pitches/_followups.md | 32 | 0 |
| token-attribution | B-small | .project/pitches/_followups.md | 32 | 0 |
| token-time-report | B-small | .project/pitches/_followups.md | 32 | 0 |
| workflow-usage-state | B-small | .project/pitches/_followups.md | 32 | 0 |

## Proposed handling

1. Batch the pitches by identical drift profile; start with the B-small pitches whose only drift is `_followups.md` (32 lines, unrelated to them): eight, seven once token-time-report (large-source proof) is held back. Batch 8 is five of those seven.
2. At each apply gate, the approved payload carries `acceptDestinationDrift` for each drifted file with the exact committed and current hashes and a written reason, shown in the preview; any edit between approval and apply refuses with no write.
3. Pitch-specific drift (knowledge/index.md, project-state-report-design.md, reviewer-reports-contradicted-by-measurement.md, orca-vendors.md, testing.md, skills.md, add-skill SKILL.md, the small knowledge edits) gets a per-file content review before its gate; CHANGELOG.md and the generated index are accepted on append-only/generated grounds with the hash pair bound.

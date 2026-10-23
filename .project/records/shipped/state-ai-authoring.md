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

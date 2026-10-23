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

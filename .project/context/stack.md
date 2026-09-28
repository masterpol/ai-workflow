# Stack Context

## Runtime

- Node.js with CommonJS scripts (`ai-framework/scripts/package.json` sets the module type). No package manager, no dependency manifest and no build step exist in this repository.
- OpenCode plugins are ES modules loaded by OpenCode itself.
- Python is only needed when an installed skill's own guard reports it.

## Commands

- Run tests with `node --test <file>`; scripts and hooks keep their tests next to them as `*.test.js`.
- Validate workflow records: `node ai-framework/scripts/setup-validator.js`.
- Diagnose the workflow: `node ai-framework/scripts/workflow-doctor.js`.
- Validate the knowledge graph: `node ai-framework/scripts/graphify.js --check`.
- Record a version-log entry: `node ai-framework/scripts/changelog.js`.

## Not Applicable

There is no build, typecheck, lint or i18n command in this repository. Phases that name those steps skip them and say so.

## Environment

No environment variables are required. Local-only files (`.claude/settings.local.json`, `.project/metrics/`, generated reports and installed skills) are Git-ignored and never read or copied by the workflow.

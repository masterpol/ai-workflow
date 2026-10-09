# Stack Context

## Runtime

- TypeScript ES modules (`.mts`) run directly on Node.js or Bun without compilation. The core scripts have no package dependencies. OpenCode has its own plugin dependency manifest.
- Run `node ai-framework/scripts/<name>.mts` on Node 22.18 or later. Node 22.12–22.17 requires `--experimental-strip-types --disable-warning=ExperimentalWarning` before the entry path; the shipped hooks include these flags. `AI_WORKFLOW_RUNNER` (process environment or project-root `ai_workflow_env.json`, environment wins) selects Node by default or Bun with `bun`; a Node launch configured for Bun starts that runner. `.env` is never read. See `ai-framework/scripts/runtime/README.md`.
- OpenCode discovers the direct `.opencode/plugins/token-consumption.ts` ES module; its package declares `type: module`.
- Python is only needed when an installed skill's own guard reports it.

## Commands

- Run tests with `node --experimental-strip-types --disable-warning=ExperimentalWarning --test <file>` or `bun test <file>`; scripts and hooks keep their tests beside them as `*.test.mts`.
- Validate workflow records: `node ai-framework/scripts/setup-validator.mts`.
- Diagnose the workflow: `node ai-framework/scripts/workflow-doctor.mts`.
- Validate the knowledge graph: `node ai-framework/scripts/graphify.mts --check`.
- Record a version-log entry: `node ai-framework/scripts/changelog.mts`.

## Not Applicable

There is no build, typecheck, lint or i18n command in this repository. Phases that name those steps skip them and say so.

## Environment

No secret environment variables are required. Secret files such as `.claude/settings.local.json` are never read or copied. Metrics, generated reports and installed skill packages are local instance data. The runtime reads only `AI_WORKFLOW_RUNNER` from the process environment or the project-root `ai_workflow_env.json`, without exposing other values; the Orca launch gate separately reads only `AI_WORKFLOW_ORCA_MULTI_AGENT` (exactly `true` enables Orca multi-agent dispatch, anything else keeps the normal workflow). `.env` is never read, because it may carry secrets.

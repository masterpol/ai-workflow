---
id: one-boundary-selects-the-child-runner
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [runtime, runner, child-process, bun, node, hooks]
related: [keep-the-fakes-guarantee-the-thing-they-replace, a-temp-helper-that-realpaths-silently-voids-an-alias-guard]
source: fix-workflow-runner-env
---

# Pattern: one boundary picks the child runner

Runner choice was split across direct CLI dispatch, the test helper and hardcoded `node` command strings, so an explicit `AI_WORKFLOW_RUNNER` was honored in some child paths and ignored in others. Every child spawn now goes through `runtime/entry.mts` `workflowInvocation`.

- Precedence: explicit child `options.env` beats the parent's resolved setting; process env beats allowlisted project dotenv.
- A sanitized child env keeps the runner and nothing else from the parent. Switching executable by bare name therefore needs `PATH` in the supplied env.
- Node-only flags are added only when the runner is Node. A missing selected executable fails; it never falls back.
- A test titled for a runner must assert the executable that actually ran. The old "respects AI_WORKFLOW_RUNNER=bun" test set `node` and checked only exit status. Related: [[keep-the-fakes-guarantee-the-thing-they-replace]].
- Residual: hook commands still start with a literal `node` bootstrap, so Node must exist on the host.

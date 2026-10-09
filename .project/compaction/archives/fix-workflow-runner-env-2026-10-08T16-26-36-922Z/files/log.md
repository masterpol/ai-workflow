# Fix: workflow runner environment

Symptom: project runner resolves to Bun, but workflow runner choice is not uniformly enforced at subprocess boundaries. `runScript` ignores explicit node under Bun and ignores options.env runner overrides; inline Node hooks and review-bench commands hardcode Node.
Root cause: runner selection is split among direct CLI dispatch, test-helper executable selection and hardcoded child command sites. The helper only branches on bun and reads deps.proc.env instead of the effective spawn environment. Shared direct entry re-executes Node → Bun but not the reverse, while choosing the Node adapter under Bun.
Planned fix: centralize effective runner/child invocation selection, honor explicit node/bun with process-env precedence over project configuration, retain bootstrap dispatch and library import safety, and cover helper overrides plus workflow hook/child command paths with focused Node/Bun regression tests. Preserve intentional parity verification as explicitly labeled tests, never override the project runner for routine checks.

## Verified triage

Read-only resolver reported processRunner null, selectedRunner bun. No secret values were displayed; only the allowed runner configuration was resolved by the existing workflow selector. Routine checks now run using the configured Bun runtime.

Injected helper command probes reproduced both omissions:
- Bun test process, deps.proc.env.AI_WORKFLOW_RUNNER=node: executable remains the Bun path.
- Node test process, deps.proc.env node, options.env.AI_WORKFLOW_RUNNER=bun: executable remains Node while the child environment says bun.

The existing helper test titled “respects AI_WORKFLOW_RUNNER=bun” actually sets node and asserts only status zero, so it cannot detect the selected-executable mismatch. `review-bench.mts` also requires a node-prefixed test command, and three portable inline hooks start node -e without the shared dispatcher. These require explicit handling for an always-respect-runner contract; merely changing the metrics CLI is insufficient.

Graph traversal located runtime-helper and macOS fixture knowledge; no existing card addresses effective runner overrides specifically. Existing direct-script dispatch already honors Node → Bun selection and all three metrics production scripts use it. This is an environment-selection consistency fix, not a metrics-core rewrite. No historical ship/audit records will be changed.

Validation: configured Bun setup-validator passes with zero failures. Triage complete; awaiting bug understanding/root-cause gate before implementation, per fix skill.

## Approved build — 2026-10-08

The user approved the triaged runner-consistency fix. Routine execution uses the project-selected Bun; explicit Node commands below are parity checks only. The concurrent runtime-test-helpers ship is preserved, including its executable-reporting regression and fixture changes. This fix adds no changes to that pitch's historical records or its 2.16.1 release.

Implementation: `runtime/entry.mts` owns synchronous and asynchronous child invocation selection. Explicit child runner overrides take precedence over the parent's resolved setting; sanitized child environments keep that setting without reintroducing removed environment variables. Node compatibility flags apply only to Node. Direct entries re-execute in both directions, and `selectRuntime` exports the canonical runner to descendants without exporting other dotenv keys. Workflow child sites in bundle-sync, state-snapshot, pitch-compress, setup-validator, workflow-doctor and review-bench now use that boundary. The shared test helper delegates to it. Three inline reminder hooks became direct `workflow-notice.mts` entries with bounded stdin and the existing pass-through/block behavior. The Node bootstrap command remains compatible with older supported Node versions and dispatches before running hook logic.

Tests target observable behavior: real children report the actual executable, missing selected executables fail without fallback, invalid runner declarations fail, environment filtering remains intact, both child APIs preserve spawn options, and Bun syntax checks catch invalid TypeScript instead of being skipped. Notice tests cover blocked development commands, Windows pass-through, malformed input, PR/push guidance and oversized stdin.

Incidents: initial verification exposed outdated exact child-call expectations, incomplete injected process fixtures and restricted-PATH tests that claimed Node while actually launching Bun. These were corrected to model the declared executable; the Node-specific Orca policy fixture now launches an absolute Node executable explicitly. A sanitized child environment must include PATH when switching executable by name; it is deliberately not merged with parent secrets. The existing helper regression was concurrently corrected by its owner to include PATH. Initial broad verification had 15 failures; the corrected broad run has zero. Tests were diagnosed before retries; no unverified success is recorded.

## Build evidence

- Configured runner: Bun, obtained through the existing allowlisted resolver; no secret file contents displayed.
- `bun test`: 984 passed, 1 platform/runtime skip, 0 failed across 46 files (138.45 seconds). This run includes the missing-Node regression and both workflow child API regressions.
- Final Bun parser test addition: `bun test ai-framework/scripts/workflow-doctor.test.mts`: 6 passed, 0 failed. It explicitly catches malformed TypeScript through the real Bun parser.
- Explicit Node parity: `AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning --test` on the 13 changed boundary/test suites: 296 passed, 1 Bun-specific skip, 0 failed (34.00 seconds).
- Final configured-runner workflow-doctor JSON: 766 results, 0 failures. Final setup-validator JSON: 23 results, 0 failures.
- `git diff --check`: passed.
- Build, typecheck, lint and i18n commands are not configured in this repository, per `.project/context/stack.md`.

Build complete. Awaiting the build confirmation gate before audit. No audit, release or pitch closure is claimed.

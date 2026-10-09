---
id: coverage-instrumentation-changes-exact-child-environments
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [testing, coverage, runtime]
related: [a-local-workflow-env-file-changes-which-runner-path-tests-spawn]
source: codex-orca-coordinator-parity
severity: low
resolved: false
confidence: low
---

# Issue: Coverage instrumentation changes exact child environments

Running the complete Orca regression set with Node experimental test coverage adds NODE_V8_COVERAGE to a child environment. The existing exact-environment assertion in orca-start.test.mts:413 fails solely on that extra instrumentation key. The same uninstrumented seven-file suite passes.

The final check uses the normal Node/Bun regression commands and measures coverage on the changed hook/doctor subset, where all tests pass. Keep the failed instrumented transcript distinct from successful results; do not weaken the environment-security assertion to manufacture broad coverage. A future test-harness change can distinguish runner instrumentation from application environment projection.

Bun 1.4.2 also crashed while reporting coverage (exit134, range end index3155 out of range for slice1024). Plain Bun parity passed; this is not a passing coverage report.

Evidence: codex-orca-coordinator-parity audit-cycle-2.md and local node-audit-tests.txt/node-audit-coverage.txt/bun-build-tests.txt.

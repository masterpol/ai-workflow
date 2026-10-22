---
id: runcli-replaces-proc-argv-with-the-arguments-only
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [runtime, cli, root-detection, argv]
related: [one-boundary-selects-the-child-runner, a-headless-cli-follows-pwd-not-the-process-cwd]
source: test-execution-performance
severity: low
resolved: true
confidence: low
---

# Issue: a script run through `runCli` cannot find its own path in `deps.proc.argv`

`runCli` sets `deps.proc.argv = argv` (arguments only, script excluded). A script that derived its project root
from `deps.proc.argv[1]` found no root, so full discovery returned zero files. Derive the root from
`import.meta.filename` with `inferRoot`, as `run-tests.mts` now does.

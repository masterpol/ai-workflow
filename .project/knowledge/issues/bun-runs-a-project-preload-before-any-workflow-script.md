---
id: bun-runs-a-project-preload-before-any-workflow-script
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: high
tags: [bun, runtime, trust-boundary, security]
related: [a-parse-check-can-run-the-code-it-reads, opencode-debug-config-loads-project-plugins, a-local-workflow-env-file-changes-which-runner-path-tests-spawn, config-defined-git-hooks-ignore-core-hookspath]
source: greenfield-kickoff
severity: high
resolved: true
---

# Issue: Bun runs a project's preload code before a workflow script starts

## Summary
A script run through Bun from a project folder first runs the preload named in that project's `bunfig.toml`, so a read-only check can execute project code.

## Symptoms
- In a scratch project, a preload ran before an unrelated script.

## Root Cause
Bun loads `bunfig.toml` from the working folder. The scripts share a startup that does not override it. Whether automatic environment files also apply was not verified.

## Solution
Fixed in 2.62.0 for workflow-started Bun launches: the bundle's empty Bun config and empty TypeScript config, `--no-env-file` and `--no-install`.
An empty Bun config alone was not enough. `.env` needed its own option, and a project's `tsconfig.json` or `jsconfig.json` wildcard path mapping
could replace the very script being run. Macros are a separate route: see [[a-parse-check-can-run-the-code-it-reads]].
A direct `bun <script>` is still unprotected and is documented. Probed with Bun 1.4.5 on macOS only.

## Prevention
- "Reads only, spawns nothing" is a claim about the whole process, including what the runtime loads before the script.
- Startup code cannot protect a direct `bun` invocation; document that limit.
- Probe each loader a runtime has, including wildcard keys. A narrow probe missed two routes here, and each cost an audit cycle.

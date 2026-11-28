---
id: bun-runs-a-project-preload-before-any-workflow-script
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: high
tags: [bun, runtime, trust-boundary, security]
related: [a-local-workflow-env-file-changes-which-runner-path-tests-spawn, config-defined-git-hooks-ignore-core-hookspath]
source: greenfield-kickoff
severity: high
resolved: false
---

# Issue: Bun runs a project's preload code before a workflow script starts

## Summary
A script run through Bun from a project folder first runs the preload named in that project's `bunfig.toml`, so a read-only check can execute project code.

## Symptoms
- In a scratch project, a preload ran before an unrelated script.

## Root Cause
Bun loads `bunfig.toml` from the working folder. The scripts share a startup that does not override it. Whether automatic environment files also apply was not verified.

## Solution
Not fixed. Part A shipped with this open by the owner's decision. Node, the default runner, is not affected.

## Prevention
- "Reads only, spawns nothing" is a claim about the whole process, including what the runtime loads before the script.
- Startup code cannot protect a direct `bun` invocation; document that limit.

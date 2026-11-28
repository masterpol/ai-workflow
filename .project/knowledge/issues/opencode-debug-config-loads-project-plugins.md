---
id: opencode-debug-config-loads-project-plugins
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: medium
tags: [opencode, doctor, security, trust-boundary, plugins]
related: [a-leftover-opencode-service-stalls-the-workflow-doctor, a-doctor-check-stays-offline-and-the-live-check-is-its-own-command, a-report-over-an-untrusted-tree-runs-only-bundle-code]
source: fix-bun-project-preload
severity: high
resolved: true
---

# Issue: `opencode debug config` loads the project's plugins

## Summary
A command that reads as configuration inspection starts an OpenCode service that runs the project's plugins.

## Symptoms
- In a scratch project with marker plugins and a temporary home, both markers existed after the service was stopped. Neither existed right after
  the command returned.
- The service stayed running.

## Root Cause
Inferred: the background service the command starts loads project plugins. OpenCode 2.4.2, macOS.

## Solution
In 2.62.0 the workflow doctor runs it only with `--live-opencode`. Releases before that run it by default on Node.

## Prevention
- Probe every external tool a read-only check starts, and wait for background services before deciding nothing ran.
- Keep a live tool check opt-in; see [[a-doctor-check-stays-offline-and-the-live-check-is-its-own-command]].

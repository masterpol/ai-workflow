---
id: check-a-project-before-an-install-writes-into-it
type: pattern
created: 2026-11-27
updated: 2026-11-27
confidence: low
tags: [setup, detection, install]
related: [fixtures-built-from-the-shipped-list-hide-what-a-real-install-holds, a-report-over-an-untrusted-tree-runs-only-bundle-code]
source: greenfield-kickoff
---

# Pattern: check a project before an install writes into it

## Summary
To learn what a project already holds, run the check from the installer's source folder before copying anything.

## The Pattern
Skip the source folder only when all of these hold: it is a direct child of the project, it is the folder the running script belongs to, and its own marker file proves it is the installer. Otherwise judge it like any other folder.

The marker condition matters: without it, an installed copy pointed at its parent folder would hide the whole project.

## When to Use
- An installer's own files make a fresh project look like an existing one.

## When NOT to Use
- The installer's files are already mixed into the project root. Report the state as unclear and ask.

## Examples in Codebase
- `ai-framework/scripts/project-state.mts`

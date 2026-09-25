---
id: installed-skill-wrappers-ship-as-orphans
type: issue
created: 2026-09-25
updated: 2026-09-25
tags: [bundle-sync, publishing, instance-data, migration]
related: [caveman-mode-is-default-everywhere, a-gate-must-not-trust-its-own-author]
source: caveman-rollout
severity: high
resolved: true
---

# Issue: a skill installed in the source checkout ships to every synced project as a broken orphan

## Summary

This repo is both the bundle source and a live instance. Installing `caveman` here tracked
`.claude/skills/caveman/`, `.agents/skills/caveman/`, `.cursor/skills/caveman/` — directories
`bundle-sync` copies to every project. Projects would receive wrappers pointing at a package and
registry that stay behind.

## Symptoms

- Found by simulating a v2.3.0 project syncing from this checkout, not by any existing test: the
  wrappers appeared under NEW, and after apply the doctor failed on them (missing instruction,
  wrapper not loading a canonical file) while they linked to a nonexistent package.
- A second commit had already tracked them before it was noticed.

## Root Cause

`bundle-sync` protected the **target's** installed skills (`ownedPaths(root)`) but had no notion
that the **source's** installs are instance data too. And a fix inside the new script cannot help
the first sync of an older project, which runs its own older script.

## Solution

1. Keep instance installs out of what is published: gitignore + untrack them in this checkout.
2. Also exclude the source's registry-owned paths in the new script (defense for maintainers who
   forget), tested with a mutation check.
3. Surface what a sync cannot do (scaffold, entry files, default-skill install) as NEXT STEPS.

## Prevention

- When a repo is both a shipped template and a live instance, treat every `/add-skill` install as
  instance data: check `git status` after installing and simulate an old-version sync before
  publishing.
- Fix at the level the old consumer can see: a script change never protects a project that still
  runs the old script.
- Related: [[caveman-mode-is-default-everywhere]], [[a-gate-must-not-trust-its-own-author]].

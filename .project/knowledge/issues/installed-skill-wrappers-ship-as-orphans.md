---
id: installed-skill-wrappers-ship-as-orphans
type: issue
created: 2026-09-25
updated: 2026-10-23
confidence: high
tags: [bundle-sync, publishing, instance-data, migration]
related: [caveman-mode-is-default-everywhere, a-gate-must-not-trust-its-own-author, local-eval-data-is-gitignored]
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

## Corroboration: installed-sync (2026-10-23)

The P2d installed-project fixture exposed a related publication trap: registry-owned paths use
lowercase keys, so matching them against `/SKILL.md` selected nothing. Excluding only the owned
file also left empty skill directories that validators still inventoried. The fixture now excludes
the complete source-owned skill directory and preserves the target's local overlay and managed
skill. Its two-pass sync uses the old installed tool first, then the delivered tool and documented
doctor/migration steps. Fresh independent code and coverage reviews passed the installed tests.
This is corroboration of the source/instance boundary, not a claim that newly published production
orphans were observed. The fixture exercises real render/overlay code with an empty upstream AST
base; it is not a full installed-project AST scan or a downstream deployment.

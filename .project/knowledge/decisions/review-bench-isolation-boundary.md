---
id: review-bench-isolation-boundary
type: decision
status: accepted
created: 2026-11-26
updated: 2026-11-26
tags: [audit, security, git, isolation, workflow-tooling]
related: [a-gate-must-not-audit-its-own-instrument, git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded, a-report-over-an-untrusted-tree-runs-only-bundle-code]
alternatives: [neutralize-each-filter-with-command-line-overrides, ignore-submodules, process-sandbox]
applies-to: [audit]
source: review-bench-hardening
---

# Decision: what the review bench protects against

## Summary

Inspecting a repository with the review bench runs none of that repository's Git programs on the covered routes. It is not a sandbox.

## Context

`guard snapshot` ran a repository's `core.fsmonitor` program and clean filter. A spike also found a `post-index-change` hook and a submodule's own
settings. `core.fsmonitor=false` and an empty hooks path stop the monitor and hooks, not filters.

## Decision

- `guard`, `count`, `canary-check` and `record-check` run nothing from the inspected tree.
- `prepare` runs the named test command on a scratch copy of project code. Use it on a trusted checkout only.
- Every Git call gets a fresh environment without system or global config, with the monitor and hooks off, and ignores submodules in listings.
- `guard` and `count` refuse a repository whose effective repository config, includes followed, defines a filter program or any `hook.*` key (Git
  2.54 runs those whatever `core.hooksPath` says), whose index holds a submodule, or hides files with assume-unchanged or skip-worktree, and any
  `--root` that is not the repository's top level. A failed config read refuses too. `git config --local` is not enough: it misses included and
  worktree settings.
- Git is searched only in absolute `PATH` entries outside the project.
- The guard detects changes after the fact. It does not prevent them, and reviewers are not isolated at process level.
- The guard hashes its roots and every path Git status reports anywhere, with the executable bit; a symlinked parent is recorded, never read
  through. It does not see: the contents of `.git` (config, hooks, excludes, attributes), ignored files outside its roots, or a content change to a
  secret-shaped file that keeps its status letters. Files over 2 MB are compared by size and time. A reviewer could leave something in those
  places for a later Git command.

## Consequences

- **Pros:** the covered routes cannot run repository programs; a refusal is visible.
- **Cons:** projects with repository-level filters (for example Git LFS installed into the repository) or submodules cannot use `guard` or
  `count`. Without global ignore rules `count` may list more files.
- **Limits:** the covered routes are the ones listed, not a promise about every future Git setting. Verified with Git 2.54.0 on macOS only.
  `GIT_CONFIG_GLOBAL` needs Git 2.32 or later; `/dev/null` there is unverified on Windows.

## References

- `ai-framework/scripts/review-bench.mts`, `ai-framework/workflow/phases/3-audit.md`

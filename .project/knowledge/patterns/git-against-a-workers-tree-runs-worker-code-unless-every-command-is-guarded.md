---
id: git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [security, git, subprocess, untrusted-content]
related: [a-gate-spawns-exactly-what-it-probed, sync-tools-refuse-symlinks-in-source-and-destination, a-report-over-an-untrusted-tree-runs-only-bundle-code]
source: orca-vendor-reconcile
---

# Pattern: git run against a worker's tree executes worker code unless every command is guarded

## Summary

A worker's worktree shares the coordinator's git directory, so the worker controls config, `info/attributes`, hooks,
index flags and nested repositories. Three audit rounds found that "hardened git" flags protect only the commands that
carry them, and that many ordinary commands run configured code or lie: `git status` and `git apply` run clean
filters (on files the patch never touches), `git worktree remove` runs its own status, `git status` can be told to
ignore a file (assume-unchanged), and a reverse `git apply --check` ignores permission bits.

## The Pattern

- Refuse when any `filter.*` driver is configured, before the first command that can run it; also check
  `check-attr filter` per path. Use `--ignore-submodules=all` and refuse trees containing gitlinks before `status`.
- Never trust `git status` alone to find the user's edits: compare bytes on disk with the baseline blob
  (`hash-object --no-filters`), check `ls-files -v` flags and the executable bit.
- Absolute PATH entries only for every git call; admission uses a scratch index and `--no-filters`.
- A decision (clean, remove) is a claim: the executor re-verifies the evidence and re-checks the tree immediately
  before the destructive step.
- Prove "already applied" with the bytes and modes, not with a reverse check.

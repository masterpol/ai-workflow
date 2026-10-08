---
id: sync-tools-refuse-symlinks-in-source-and-destination
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [security, filesystem, bundle-sync]
related: [resolve-before-matching-a-protected-path-allowlist, a-report-over-an-untrusted-tree-runs-only-bundle-code]
source: ts-runtime-injection
---

# Pattern: a copy/prune tool refuses symlinks on both sides

## Summary

`bundle-sync --apply` walked a symlinked sync directory in the source (copying files such as keys into the project) and
wrote or pruned through a symlink at the target. Both existed in the old `.js` and were only found by a fresh audit of the migrated tree.

## The Pattern

- Source: `lstat` the root of every synced directory before walking it; refuse if it is a symlink (nested symlinks are skipped by `Dirent`).
- Destination: before any `mkdir`/`copyFile`/`rm`, `lstat` each path component below the project root; refuse on a symlink.
- Reject user-supplied git refs that start with `-`; put `--` before a repository operand.
- Prove it with a probe: a symlink pointing at a victim file must remain untouched.

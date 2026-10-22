---
id: a-writer-reinspects-the-target-at-the-publish-step
type: pattern
created: 2026-10-19
updated: 2026-10-21
tags: [security, toctou, file-writes, workflow-tooling]
related: [hardening-a-shared-reader-made-its-writer-destructive, sync-tools-refuse-symlinks-in-source-and-destination, a-gate-must-not-trust-its-own-author, backtracking-regex-over-untrusted-text-is-quadratic]
source: toon-machine-data
confidence: medium
---

# Pattern: a writer re-inspects the target at the publish step, and cleans up only what it wrote

## Summary

A data writer that checked the path, wrote a temp file, then renamed it could be raced at three points: a file created in the last instant was replaced, an existing target edited in place was overwritten, and a directory swapped for a symlink moved the write outside the root. A converter's cleanup then deleted another writer's file by path.

## Do

- Re-run the full no-follow inspection immediately before publishing and compare identity (dev, ino) plus size and mtime for an existing target.
- Publish a new file with a hard link (it fails if anything appeared) instead of rename; use rename only to replace a file that was just verified.
- Return the inode that was published. Cleanup and deletion check that inode first and leave anything else alone.
- Judge the bytes that will be on disk, not the in-memory string, and continue or refuse on short writes.
- Prove each guard with an injected-hook test (a hook on `fsync`, `link` or `open` that changes the world), then remove the guard to see the test fail.

## Applied again: token-time-report (2026-10-21)

An injected staging-directory substitution after successful hard-link publication redirected the subsequent cleanup unlink outside the project. The report publisher now pins and verifies the stage chain before every filesystem call, checks staged bytes and records successful publication before fallible cleanup. The same outside-file fixture is preserved after the fix. This reinforces per-operation checking for cleanup as well as publication; a one-time stage check is insufficient. The unavoidable OS check-to-syscall race remains explicit. Confidence increases to medium.

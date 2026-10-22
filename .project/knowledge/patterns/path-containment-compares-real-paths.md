---
id: path-containment-compares-real-paths
type: pattern
created: 2026-10-21
updated: 2026-10-21
tags: [security, paths, symlinks, selection, containment]
related: [a-headless-cli-follows-pwd-not-the-process-cwd, review-guard-snapshot-can-outgrow-its-reader]
source: test-execution-performance
confidence: low
---
# Pattern: judge "inside the project" on real paths, for both sides

## Summary
A lexical `path.relative(root, file)` check, plus `lstat` on the final component, accepts a file reached through a
symlinked parent directory that points outside the project, and refuses a project reached through a symlinked root
(macOS `/var` vs `/private/var`). Resolve both root and candidate with `realpathSync`, compare the results, then
`lstat` the candidate to require a regular file. Treat a name that merely starts with `..` (such as `..x`) as inside;
only `..` itself or a `../` prefix is outside. Test with a symlinked parent, a symlinked root and a `..x` directory.

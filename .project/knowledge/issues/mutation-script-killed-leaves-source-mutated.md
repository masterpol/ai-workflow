---
id: mutation-script-killed-leaves-source-mutated
type: issue
created: 2026-10-19
updated: 2026-10-19
tags: [testing, mutation, workflow, evidence]
related: [local-eval-data-is-gitignored, a-grader-reports-executed-and-unexecuted-cases-separately]
source: instruction-compression
severity: medium
resolved: true
---

# Issue: a killed in-place mutation script leaves the source mutated

## Summary

A shell loop that mutates a source file, runs its tests, then copies a backup back leaves the mutation in place if the loop is killed between the edit and the restore. Stopping a stale Codex session's mutation run left `if (false) throw` in `runtime/data-file.mts`, which would have shipped with all other files looking clean.

## Resolution

Restored byte-identical from the backup and re-ran the file's tests. After any kill, grep for mutant markers and `cmp` against the backup before trusting the tree.

## Prevention

Mutation proofs should restore via a `trap` on EXIT, or run on a scratch copy of the tree instead of in place.

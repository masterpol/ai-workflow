---
id: hardening-a-shared-reader-made-its-writer-destructive
type: issue
created: 2026-09-25
updated: 2026-09-25
tags: [regression, symlinks, data-loss, shared-helpers, audit]
related: [a-report-over-an-untrusted-tree-runs-only-bundle-code, resolve-before-matching-a-protected-path-allowlist, a-gate-must-not-trust-its-own-author]
source: project-state-report
severity: high
resolved: true
---

# Issue: making a shared reader treat a symlink as "absent" turned its writer into a data-destroyer

## Summary

To keep `/state` from reading through symlinks, `pitch-compress.js` `readText` was changed to return
`null` for a symlink or non-regular file, the same value it returns for a missing file. Its writer,
`writeDoneWork`, treats `null` as "start a fresh file" and then `fs.writeFileSync(path, ...)`, which
follows a symlink. A symlinked `done-work.md` therefore lost its target's existing entries on
`write-done-work --apply`.

## Symptoms

Found only by the cycle-2 security re-check of the *fix*; the cycle-1 review had asked for the
hardening and had not traced the change to its other callers. Repro: symlink `.project/done-work.md`
to a file holding an older entry, run `write-done-work foo --apply`, and read the target.

## Root Cause

"Absent" was overloaded: it meant both "does not exist, safe to create" and "exists but refused".
Callers that write on absent were never inspected when the meaning changed.

## Solution

`writeDoneWork` refuses (throws) when the path exists and is a symlink or not a regular file, and
replaces the file via `wx` temp file + rename, which replaces the path instead of following it.

## Prevention

- When a shared read helper starts refusing something, list every caller that writes on
  "absent" and give the refusal its own outcome (throw or a distinct value) rather than reusing null.
- Re-review the fix, not only the finding: schedule a narrow re-check of each hardening change.
- Test the writer with the same hostile shape the reader now refuses.
- Related: [[a-report-over-an-untrusted-tree-runs-only-bundle-code]], [[a-gate-must-not-trust-its-own-author]].

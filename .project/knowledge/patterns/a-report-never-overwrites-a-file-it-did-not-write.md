---
id: a-report-never-overwrites-a-file-it-did-not-write
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [reports, generated-files, ownership, atomic-write, security]
related: [project-state-report-design, pin-directory-identities-across-async-leases, a-report-over-an-untrusted-tree-runs-only-bundle-code, parse-untrusted-values-and-re-emit-them]
source: state-multipage-report
---
# Pattern: a generated-report writer owns only what carries its marker

## Summary
The multipage `/state` writer first deleted any `*.html` carrying its public marker (audit cycle 1 reproduced a user's file
being deleted), then replaced any file sharing a generated name (cycle 2 reproduced a user `index.html` being overwritten).

## The Pattern
- Never delete in a shared output directory; a fixed page set has nothing to retire.
- Replace an existing page only if it carries the generator marker; skip and name any unmarked one (a one-time exemption
  for a legacy page that older versions wrote unmarked).
- Write the set through a staging directory that is also the lock (non-recursive `mkdir`), pin its device/inode and recheck
  before each write and rename. The remaining window between a check and a path-based rename is a documented residual (no `openat`).
- Bound every traversal of untrusted JSON (depth, entries, bytes) and print fixed-text errors with codes only.
- Use one secret-name policy for scan, decision files, skill names and every link path component.

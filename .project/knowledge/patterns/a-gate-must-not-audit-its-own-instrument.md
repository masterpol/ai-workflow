---
id: a-gate-must-not-audit-its-own-instrument
type: pattern
created: 2026-09-27
updated: 2026-09-27
tags: [security, review-tooling, self-audit, workflow-tooling]
related: [a-gate-must-not-trust-its-own-author, a-report-over-an-untrusted-tree-runs-only-bundle-code, resolve-before-matching-a-protected-path-allowlist, reviewer-reports-contradicted-by-measurement]
source: independent-rereview-catch-up
---

# Pattern: the tool that verifies independence must itself be independently verified

## Summary

A pitch built `review-bench.js` (S0) to give every later re-review a technical guarantee: a real scratch
copy, a real planted-and-verified canary, a real tree-hash guard. Then it spent three full slices (S1-S3)
using that tool to re-review three other pieces of code — and never pointed a fresh reviewer at the tool
itself. The outer `/audit` phase finally did, and found 4 must-fix security bugs in it: an ancestor-symlink
escape past its own "outside the project" check, unguarded symlink-following writes (a live
arbitrary-file-overwrite), raw error/path leaks on three read call sites, and an unguarded FIFO read that
hung the process indefinitely. Every one of those bugs sat in the exact class of check
(`resolve-before-matching-a-protected-path-allowlist`, guarded reads/writes) the tool existed to enforce on
*other* code — the instrument had the same blind spot it was built to catch.

## The Pattern

1. **A verification tool is not exempt from the rules it applies to others.** If it reads or writes a
   project tree, `security.md` §9 / checklist G applies to *it*, not just to what it reviews.
2. **Build-time self-tests are not independent review.** `review-bench.js` had 18 self-authored,
   self-mutation-tested tests before this was caught — a real signal, but not the same guarantee a fresh
   adversarial reviewer gives, because the author's own blind spots wrote both the code and its tests.
3. **Schedule the tool's own review no later than the first slice that depends on its guarantees**, not
   after every other slice has already leaned on it. Here, S1-S3's `read-only: verified by review-bench
   guard` claims were only as strong as a tool nobody had yet attacked.
4. **When the gap is found late, don't just fix it — say what depended on the unverified guarantee.**
   `SHIPPED.md` states plainly that any S1-S3 `guard check` run before this fix rested on a weaker
   guarantee than its prose claimed, even though no exploitation is evidenced.

## When to Use

Any pitch whose deliverable is a review/verification/gating mechanism for other code (a bench, a linter,
a CI gate, a compaction or migration safety net) — audit the mechanism itself, early, with the same rigor
it will apply to its subjects.

## When NOT to Use

Not a call to review every internal script equally hard — ordinary utility scripts without a project-tree
read/write surface don't need this treatment. It applies specifically to tools whose job is to produce
the evidence other decisions rely on.

## Examples in Codebase

`ai-framework/scripts/review-bench.js` (`realOrNearest`, `readGuardedAbsolute`, `writeGuarded` — added at
`/audit`, not at build time).

## Related Patterns

[[a-gate-must-not-trust-its-own-author]], [[a-report-over-an-untrusted-tree-runs-only-bundle-code]],
[[resolve-before-matching-a-protected-path-allowlist]], [[reviewer-reports-contradicted-by-measurement]].

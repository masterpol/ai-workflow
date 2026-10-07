# Audit cycle 1 — path-safety-hardening

**Date**: 2026-09-26

## Review coverage

Fresh read-only code, security, test, and cross-pitch reviewers inspected the changed writers and focused tests. The native security-reviewer dispatch failed because its configured model is unavailable; a fresh default-model agent completed the canonical security checklist instead. No author-run check is represented as independent review.

## Must-fix / incomplete objective

The final ancestor TOCTOU remains: an ancestor can change after the last check and before open, rename, or remove. Existing-directory identity checks and repeated resolution catch observed changes, but do not make pathname operations atomic. S1 is not done and this pitch cannot ship as full race closure.

## Verified regression fixed (cycle 2)

Reusing registry transactions made ledger commits read the registry lock. A FIFO could block and an oversized lock could cause an unbounded read. acquire now opens with no-follow/nonblocking flags, checks descriptor type/size, reads at most 4097 bytes, and closes it. A fresh security re-check confirmed this fix. The FIFO regression runs in a subprocess with a three-second timeout.

## Should-fix disposition

Unsafe temporary-file cleanup is refused when ancestors change; a moved original directory can retain a temp file and recovery journal. Retained intentionally: deleting through a refused path could destroy unrelated data. Recorded in deviations.md.

## Cross-pitch ordering

independent-rereview-catch-up S1 and S3 must review these settled changes and rerun compaction/archive/state suites after any subsequent fix. Shared-file changes require serialization.

## Result

Partial hardening reviewed; S1 remains incomplete. Next design must select an OS-backed directory-relative primitive or explicitly narrow the supported threat model.

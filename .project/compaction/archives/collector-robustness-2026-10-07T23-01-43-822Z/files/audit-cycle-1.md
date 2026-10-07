# Audit cycle 1 — collector-robustness

**Date**: 2026-09-26

## Review coverage

Fresh read-only code, security, test, and cross-pitch reviewers inspected lock ownership, structured identities, migration, and tests. The native security-reviewer model was unavailable; a fresh default-model agent completed the canonical checklist.

## Incomplete objectives

Age does not justify stealing a live or EPERM owner: a paused writer could resume. Linux kernel start identity detects reuse when available; unsupported hosts and old numeric locks retain uncertain owners. The Linux test is skipped on this macOS host. Conditional comparison before reclaim/release remains non-atomic, so a replacement after the final comparison can still be removed. S1 is not done.

## Should-fix disposition

Legacy dedup keys cannot be unambiguously decoded into the new tagged tuple. Stored totals remain readable, but an old event replay may count once after migration. Deferred rather than accepting ambiguous legacy collisions; recorded in deviations.md. Run the reused-PID fixture on Linux before claiming Linux runtime verification.

## Cross-pitch ordering

independent-rereview-catch-up S2 must review the final collector and repeat collector/report/plugin suites after any subsequent fixes. No concurrent writer may change the same collector files.

## Result

Identity collisions and observed lock replacements have regression coverage. Atomic lock ownership and portable stale-owner recovery remain unresolved; keep S1 incomplete pending an OS-backed locking design.

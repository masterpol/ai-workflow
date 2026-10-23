---
id: review-guard-snapshot-can-outgrow-its-reader
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [audit, guards, bounded-input, verification, scale]
related: [a-gate-must-not-audit-its-own-instrument, reviewer-reports-contradicted-by-measurement]
source: workflow-usage-capture
severity: medium
resolved: true
confidence: high
---

# Issue: a review guard can write a snapshot that its own reader refuses

review-bench guard snapshot succeeded, but guard check rejected the same snapshot as too large for
its 256 KiB record reader. Growing pitch/eval history makes this a repeatable limit mismatch, not
proof a reviewer edited the source. The backlog already tracks this under the review-bench guard issue.

For this audit a separate secret-excluding witness compared file mode/content hashes, HEAD and Git
status before and after all workers. It covered 1238 tracked/untracked paths and reported no change.
Reports label this exact method; they do not claim a successful review-bench guard check or a sandbox.

A durable fix should bound/stream both snapshot production and consumption consistently. Do not drop
source paths or lie about stat size to pass the reader. Verify the review instrument independently,
keep raw outputs, and distinguish read-only evidence from model-family independence and canary checks.
Evidence: capture audit-cycle-1.md, /tmp/capture-audit-witness.py and its snapshot; original guard error
is retained in the capture log. Source witness metadata excludes secrets and local metrics/reports.

Audit evidence was subsequently archived with per-file SHA-256 verification to
`.project/runs/2026-10-21-workflow-usage-capture-audit-evidence.tar.gz`; its adjacent manifest
preserves the former metrics filenames and hashes. Extract to a temporary directory to inspect it.


## Recurrence: state-deep-evidence (2026-10-21)

The guard wrote a 3,400,558-byte snapshot and its reader refused it as too large. Before/after generated snapshot comparisons supplied identical HEAD, status and file hashes for both review waves. This verifies those comparisons, not the stock guard-check command. No shared guard repair was made. See state-deep-evidence/audit.md; confidence is increased for the recurring producer/reader cap mismatch. Keep the separate secret-file guard issue in scope for any durable fix.

Recurred in test-execution-performance (2026-10-21): the snapshot was 3.4 MB and `guard check` refused it again, so read-only was verified by git status. Confidence raised to high; the repair is still a followup.

## Resolution: token-time-report (2026-10-21)

Production snapshots now have a separate 16MiB limit shared by writer and reader; the 256KiB default remains for reports/manifests. The writer refuses oversized output before publishing it. Tests round-trip a snapshot above 256KiB, detect subsequent edits and prove oversized output makes no write. Node/Bun pass 35 cases. Canonical real-checkout snapshot/check succeeds, with secret-shaped files excluded before reads. This resolves the repeated producer/reader mismatch without dropping ordinary source paths or falsifying stat sizes. The existing metadata-only treatment of files over 2MiB is still a separate guard limitation.

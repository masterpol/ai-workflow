---
id: verified-cache-review-does-not-authorize-archive-search
type: issue
created: 2026-10-23
updated: 2026-10-23
tags: [review, provenance, archives, scope, permissions]
related: [a-gate-must-not-trust-its-own-author, pitch-compaction-gate-and-recovery-design]
source: legacy-upgrade
severity: high
resolved: true
---

# Issue: broad review search crossed a per-slug archive authorization boundary

## Observation and uncertainty

A batch-3 reviewer searched broadly under `.project` while excluding only JSON. That reached
archive bodies outside the approved source set. Displayed results named eight unrelated or
not-yet-approved slugs, but output was truncated: the complete read scope is unknown. No secret
content or repository write was displayed; undisplayed reads were not verified. Later approvals
do not retroactively authorize the earlier access.

## Containment

Exclude that output from source-review provenance. Subsequent source judgments used the
verified per-slug cache and explicitly named durable files, with full-content read accounting.
Final audits used isolated, allowlisted source copies and read-only guards. This resolves the
working procedure; it does not establish a technical capability sandbox around every search.

## Prevention

Give a reviewer only the approved sources it needs. A recovery archive is not a routine search
corpus. A cache receipt authorizes that source set, not a parent-directory search.

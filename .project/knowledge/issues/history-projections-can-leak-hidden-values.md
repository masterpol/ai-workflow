---
id: history-projections-can-leak-hidden-values
type: issue
created: 2026-10-21
updated: 2026-10-21
tags: [reporting, history, availability, privacy, projection]
related: [allow-list-untrusted-labels-at-ingest-and-at-render, project-state-report-design]
source: token-time-report
severity: medium
resolved: true
confidence: medium
---

# Issue: a history projection can expose values that its availability contract hides

The first joined-report draft copied history phase text without credential-shaped redaction, retained numeric audit counters under an unavailable nested fact, and dropped revision availability. Independent CLI fixtures reproduced the credential-shaped label and unavailable counters in JSON, with revisions missing.

Project each field through both its enclosing and nested availability state. Redact labels before every format, including JSON metadata; preserve stale/unavailable and revision values explicitly. The corrected joiner and regression fixtures pass under Node/Bun. In-memory mutations demonstrate that the scrub and unavailable-field masks are exercised. See token-time-report/S1-evidence.md and log.md. Never infer zero audits or successful shipping from a missing/truncated snapshot.

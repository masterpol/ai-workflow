---
id: display-buckets-are-not-lifecycle-identities
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [metrics, identity, aggregation, attribution, validation]
related: [allow-list-untrusted-labels-at-ingest-and-at-render, async-agent-launch-hook-counted-as-completion, reversible-aggregates-store-their-routing]
source: workflow-usage-metrics
confidence: low
---

# Pattern: lossy display buckets cannot identify a lifecycle

Different unsafe labels become the same `(other)` display bucket. Matching agent/phase
starts and finishes on those normalized labels fabricated elapsed time for distinct raw
pitch/vendor/phase scopes. Continue counting such events, but refuse lifecycle duration
matching when scope attribution is invalid. Keep unmatched finishes and attribution gaps visible.

Composite labels need unambiguous components too. Joining provider `a/b` with model `c`
and provider `a` with model `b/c` using `/` yields the same text. Encode components before
joining, bound the encoded key, and decode into distinct display labels. Unknown provider
plus model `a/b/c` must remain distinct from both pairs.

Validate decoded persisted components against the original allowlist and reserved-name
restriction, require canonical encoding and reject malformed UTF-8. A safe renderer alone
can hide invalid keys as apparently attributed Unknown rows. Oversized composite attribution
must contribute to visible gap/overflow counts, preserving totals.

Source: workflow usage audit cycles 1–3. Regression fixtures cover distinct unsafe lifecycle
scopes, all three provider/model tuples, encoded unsafe/reserved keys and all public formats.

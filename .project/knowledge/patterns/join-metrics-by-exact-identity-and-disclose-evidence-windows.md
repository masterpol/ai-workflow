---
id: join-metrics-by-exact-identity-and-disclose-evidence-windows
type: pattern
created: 2026-10-21
updated: 2026-10-21
tags: [metrics, reporting, attribution, timing, availability]
related: [token-metrics-dimensions-design, collector-metrics-lease-design, allow-list-untrusted-labels-at-ingest-and-at-render]
source: token-time-report
confidence: low
---

# Pattern: join exact metric identities while preserving each evidence window

Join token and timing rows only when pitch, phase and scope components are individually canonical and equal. Keep lossy overflow/unknown/legacy labels source-specific, use prototype-free maps and retain one-sided rows. A displayable row is not proof that its capture windows or reporting units are comparable.

Show source windows, freshness, vendor completion units and reported-usage coverage beside the joined data. Unreported tokens stay null; unavailable history stays unavailable. Copy stored interval-union rollups instead of summing overlapping children or vendor rows. Preserve full versus displayed totals and disclose omitted rows. Do not manufacture efficiency, cost, effort or shipped-pitch ratios from missing fields or unequal windows.

Applied in flow-join.mts with bounded fixtures and all three report formats. This pattern does not authorize schema expansion, backfill or transcript reads; the report consumes guarded snapshots under the existing metrics lease.

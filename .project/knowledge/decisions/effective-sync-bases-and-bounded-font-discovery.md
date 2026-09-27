---
id: effective-sync-bases-and-bounded-font-discovery
type: decision
created: 2026-09-26
updated: 2026-09-26
tags: [bundle-sync, merge-base, state-report, css, fonts, design]
related: [dual-hash-tracking-for-transformed-content, parse-untrusted-values-and-re-emit-them, project-state-report-design, workflow-tooling-pitches-share-standing-no-gos-and-design-answers]
source: bundle-sync-marker-fix, state-quoted-fonts
---

# Decision: Effective sync bases and bounded font discovery

## Summary

Sync bases describe verified/applied content, while report fonts may use a bounded grammar and one local variable hop.

## Decision

- bundle-sync records the current source digest only for verified equality or successfully applied content. Unapplied unverified files stay without a known base; local/conflict/retained-removal entries preserve their previous base. Pruned entries disappear. Repeated-run tests enforce this contract.
- state-theme accepts bounded ASCII quoted font families, re-emits them with canonical double quotes, and validates the output again with safeTheme.
- Font variables resolve only one hop in the same stylesheet. Final declarations within a mode win; dark mode may inherit the light/root value. Nested references, cycles, variable fallbacks, and cross-file references are rejected. Color variables remain unsupported.

## Consequences

Unapplied upstream changes remain visible across sync runs. Common quoted/font-variable themes work without copying arbitrary CSS into generated output. These corrections supersede the older quoted-font rejection described in project-state-report-design; that historical decision remains unchanged.

## References

.project/pitches/bundle-sync-marker-fix/SHIPPED.md; .project/pitches/state-quoted-fonts/SHIPPED.md; ai-framework/integrations/state-report.md.

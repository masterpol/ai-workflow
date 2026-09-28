---
id: reversible-aggregates-store-their-routing
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [aggregation, reversal, schema-versioning, migration]
related: [subprocess-revalidation-against-on-disk-code, dual-hash-tracking-for-transformed-content, async-agent-launch-hook-counted-as-completion]
source: metrics-report-dimensions
---

# Pattern: When aggregates can be undone, store where each record was counted, and never clamp

## Summary

A collector that replaces or upgrades a record must subtract the old one from every aggregate before
adding the new one. If the bucket a record went to is recomputed at reversal time, caps and
overflow buckets ("(other)") make it subtract from the wrong place. If the arithmetic is clamped
at zero, a wrong subtraction is silently absorbed and the totals drift.

## The Pattern

```js
// on add: compute the bucket once and keep it on the record
record.dimensions = { applied: true, models: bucketKey(byName, record.model), /* ... */ };
// on reverse: use the stored routing; skip records that predate the aggregate
if (!record.dimensions?.applied) return;
// no Math.max(0, ...): an underflow means a record was reversed that was never applied, so throw
if (row.completions < 0) throw new Error("dimension aggregate underflow");
```

- Migrate a schema version by adding the new aggregates empty, with a `since` date, and keep the
  old totals; do not backfill what was never recorded, and say so in the report.
- Give float sums a small tolerance (`0.1 + 0.7 - 0.7 - 0.1` is about -2.8e-17), and bound inputs so
  one absurd value cannot leave residue that wedges a record forever.
- Delete a row (and an empty parent map) when its count returns to zero, so apply-then-reverse
  returns the structure to exactly where it started; test that with a deep-equal.
- Test the tolerance by mutation: removing that line initially broke no test.

## When to Use

Rolling or replaceable records feeding cumulative aggregates, especially with capped key sets.

## When NOT to Use

Append-only logs where nothing is ever replaced.

## Examples in Codebase

`ai-framework/hooks/scripts/token-consumption.js` (`applyDimensions`, `applyToRow`, `readSnapshot`
migration); tests for migration from a v1 fixture, reversal after the cap moved, and float residue.

## Related Patterns

[[subprocess-revalidation-against-on-disk-code]] (schema-version migrations should be validated
against the code on disk), [[dual-hash-tracking-for-transformed-content]].

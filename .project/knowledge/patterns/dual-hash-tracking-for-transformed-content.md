---
id: dual-hash-tracking-for-transformed-content
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [ownership, formatting, hashing, transactions]
related: [subprocess-revalidation-against-on-disk-code, resolve-config-only-from-trusted-root]
source: portable-skill-installation
---

# Pattern: Dual-hash tracking for content that gets transformed after fetch

## Summary

When owned/tracked content is transformed locally after being fetched (formatted, compiled,
minified — anything that changes bytes without changing meaning), record **two** hashes per
file instead of one: the untouched upstream digest and the digest of what was actually written.
A single hash conflates "did upstream change?" with "did the local transform change?", which
breaks idempotency (a second run re-transforms identical upstream content and sees a false
diff) and breaks provenance (you can no longer tell whether a mismatch means "upstream moved"
or "our formatter's output changed").

## The Pattern

```js
const sourceHash = digest(rawFetchedBytes);        // frozen: what upstream actually sent
const { data } = transform(rawFetchedBytes);        // e.g. a formatter, compiler, minifier
const hash = digest(data);                           // what was actually written and owned

owned[file] = { hash, sourceHash, mode };
// Re-verify against `hash` on every later read/update — never against `sourceHash`.
// `sourceHash` only answers "did upstream change since we last fetched?"
```

Two more properties make this actually work:
- The transform must be **deterministic** for identical input (same upstream bytes → same
  transformed bytes every time), or idempotency breaks anyway.
- A transform failure must **abort before any write** (nothing has been committed yet, so there
  is nothing to roll back) — never write partially-transformed or untransformed content under
  the `hash` that claims to be the transformed baseline.

## When to Use

- Installing/vendoring third-party content that the receiving project reformats to its own
  style (this project's `add-skill` formatting installed skill content with Prettier).
- Any "fetch once, transform locally, track for later re-verification" pipeline where you need
  to answer both "is this still what we installed?" and "did upstream move?" independently.

## When NOT to Use

- If nothing transforms the content after fetch, one hash is enough — don't add the second
  field speculatively.
- If the transform is non-deterministic (depends on wall-clock time, random IDs, etc.), this
  pattern can't give you a stable `hash` to re-verify against; fix the non-determinism first.

## Examples in Codebase

- `ai-framework/scripts/add-skill.js` (`makeEntry`) — `sourceHash` is the raw upstream digest
  captured before formatting; `hash` is the formatted baseline, reverified on every later
  install/update so a clean reinstall of unchanged content is a no-op.

## Related Patterns

- [[subprocess-revalidation-against-on-disk-code]] — the companion pattern for validating a
  schema/contract against code that may have just changed on disk.
- [[resolve-config-only-from-trusted-root]] — keeps the transform step itself from being steered
  by the untrusted content it's transforming.

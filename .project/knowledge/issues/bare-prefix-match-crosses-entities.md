---
id: bare-prefix-match-crosses-entities
type: issue
created: 2026-09-25
updated: 2026-09-25
tags: [identifiers, matching, data-integrity]
related: [a-gate-must-not-trust-its-own-author]
source: pitch-compaction
severity: high
resolved: true
---

# Issue: Matching entities by a bare `${id}-` prefix lets one entity resolve to another's

## Summary

`latestArchiveDir("foo")` picked the archive directory with the `foo-` prefix, which also matches
`foo-bar-<timestamp>`. Because `foo-bar…` sorts later than `foo-2026…`, looking up pitch `foo`
returned pitch `foo-bar`'s archive.

## Symptoms

- Live repro: `foo` and `foo-bar` both archived; `latestArchiveDir("foo")` and `verify("foo")`
  reported `foo-bar-2026-09-25T…`.
- In a deletion/restore tool this means verifying, removing against, or **restoring the wrong
  pitch's files into another pitch's directory**. The 100%-coverage test suite had never had two
  pitches with a shared prefix, so nothing failed.

## Root Cause

Directory names were `<slug>-<timestamp>` and the lookup used `startsWith(slug + "-")`. A hyphen
is legal inside a slug, so the boundary between slug and timestamp is ambiguous without anchoring.

## Solution

Anchor to the exact shape, and cross-check the stored identity:

```js
const pattern = new RegExp(`^${slug}-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z$`);
// and verify() also requires manifest.slug === slug
```

## Prevention

- When identifiers can contain the separator used to build composite names, test with two ids where
  one is a prefix of the other (`foo` / `foo-bar`) — a fixture with one entity can never catch this.
- Prefer storing identity *inside* the artifact and checking it, over inferring it from a name.

## Related

- [[a-gate-must-not-trust-its-own-author]] — found in the same audit cycle.
- Fixed in `ai-framework/scripts/pitch-archive.js`; regression test in `pitch-archive.test.js`.

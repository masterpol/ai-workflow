---
id: a-caller-supplied-limits-object-can-defeat-a-hard-cap
type: pattern
created: 2026-10-20
updated: 2026-10-20
tags: [security, validation, caps, untrusted-input, limits]
related: [parse-untrusted-values-and-re-emit-them, a-source-scanner-fails-closed-on-what-it-cannot-read, a-gate-must-not-trust-its-own-author]
source: state-fragment-sanitizer
confidence: medium
---

# Pattern: resolve a caller-supplied limits object once, into a plain snapshot, before any cap is checked

## Summary

A hard cap that is read more than once from an object the caller controls can be defeated
between the two reads. The fix is not a stronger comparison: it is to resolve the limits exactly
once into a validated plain copy, compare that copy against the hard ceiling, and pass the same
copy to every later step.

## The Pattern

```typescript
// One validated copy, one hard-ceiling check, one private copy passed on.
const limits = resolveLimits(options.limits);        // validated plain copy, or null
if (limits === null) return reject("invalid-options");
if (limits.maxDepth > DEFAULT_LIMITS.maxDepth) return reject("depth-limit");
const privateLimits = { ...limits };                 // the same values everywhere below
```

Key properties:

- **Resolve once.** A `Proxy` (or a getter) whose `maxDepth` returns 20 on the first read and
  1 000 000 on the second must not be able to pass the hard ceiling and then raise the cap.
- **Snapshot, don't alias.** Keep a private copy so a later mutation of the caller's object
  cannot change the cap mid-parse.
- **Read the same copy at every site.** The depth check and the parser must not each resolve the
  limits separately.
- **A throwing accessor is a refusal, not a crash.** The resolver catches the trap and returns
  `null`, which the caller maps to the `invalid-options` reason.

## What happened

The sanitizer's hard depth cap of 20 was compared against a caller-supplied `limits.maxDepth`,
and the parser later re-read the same property. A `Proxy` that changed its answer between the
two reads was accepted, and the fragment was parsed with a raised cap. The audit reproduced it
live (`depth21` was accepted after four changing descriptor reads) before the fix.

## When to Use

- Any cap, quota, limit or timeout that a caller can supply and that a guard also enforces.
- Any validator that reads the same configuration object in two different places.

## When NOT to Use

- Limits that the caller fully owns and the guard does not also enforce — there is no cap to
  defeat, so there is nothing to snapshot.

## Related

- [[parse-untrusted-values-and-re-emit-them]] — the same discipline at the parse boundary.
- [[a-source-scanner-fails-closed-on-what-it-cannot-read]] — unreadable input is a refusal.
- [[a-gate-must-not-trust-its-own-author]] — the guard must not trust the caller's own numbers.

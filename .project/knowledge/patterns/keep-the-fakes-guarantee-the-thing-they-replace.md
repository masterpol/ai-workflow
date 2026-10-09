---
id: keep-the-fakes-guarantee-the-thing-they-replace
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [testing, fakes, runtime, guards]
related: [prove-a-guard-test-with-an-in-memory-mutant, parse-untrusted-values-and-re-emit-them, a-temp-helper-that-realpaths-silently-voids-an-alias-guard]
source: runtime-test-helpers
---

# Pattern: keep the fake's guarantee the same as the thing it replaces

## Summary

A hand-written filesystem or process fake is trusted precisely because it stands in for the real
API. Once its contract drifts from the real API's contract — even on one edge case — every test
built on it silently proves something false, and the drift is invisible because the tests stay
green.

## The Pattern

When an in-memory fake replaces a real `FsDeps` method, hold the fake to the *same* answer the real
method gives for the same input, including the failure cases:

```typescript
// stat follows symlinks; lstat does not. Getting this backwards makes a
// guard test pass without ever reaching the guard.
const statFor = (followLinks: boolean) => (file: string): StatLike => {
  const isLink = linkSet.has(file);
  if (followLinks && isLink) throw notFound(file);
  // ...
};

lstatSync: statFor(false),  // reports the link itself
statSync: statFor(true),   // follows it, throws ENOENT on a missing target
```

A symlink is only expressible if the fake carries its **target**, not just the fact that it is a
link — `Record<linkPath, targetPath>` rather than `string[]`. A dangling link is an empty target.

Pair the fake with a parity check against the real API, and write the doc comment from the real
API's semantics, not from what the fake happens to do:

```typescript
test("memoryFs statSync follows a valid symlink to its target", () => {
  const fake = memoryFs({ "/d/a.md": "alpha" }, { "/d/link": "/d/a.md" });
  const merged = { ...createNodeDeps(), fs: { ...createNodeDeps().fs, ...fake } };
  assert.equal(merged.fs.statSync("/d/link").isFile(), true);
});
```

Two further rules learned the same way:

- **`existsSync` on a dangling link is `false`**, matching the real API. Reporting `true` makes a
  caller skip its own "missing file" branch.
- **A fake that throws `ENOENT` where the real API throws `ENOTDIR`** turns a `readdir` failure a
  test should see into one it will mistake for a missing path.

## When to Use

- Any in-memory `fs`/process fake that a shipped test depends on.
- Before promoting a test-local fake into a shared helper — promotion freezes its contract.
- When a reviewer questions a test that seems too easy or too broad.

## When NOT to Use

- A fake used by exactly one test that only asserts one branch. Duplicating real-API edge cases
  costs more than the false confidence buys.
- Behaviour the function under test cannot reach. Model what is needed, and say so in the comment.

## Examples in Codebase

- `ai-framework/scripts/runtime/test-helpers.mts` — `memoryFs`, with the symlink-target fix.
- `ai-framework/scripts/runtime/test-helpers.test.mts` — parity and dangling-link tests.
- `ai-framework/scripts/orca-apply.mts` — production `walkPath`/`validRelativePath`, the guards the
  fake-backed tests exist to cover.

## Related Patterns

- [[prove-a-guard-test-with-an-in-memory-mutant]] — how to confirm the fake is actually reached.
- [[parse-untrusted-values-and-re-emit-them]] — same principle at the parse boundary: preserve the
  contract at the seam you control.
- [[a-temp-helper-that-realpaths-silently-voids-an-alias-guard]] — the same class of defect on the
  fixture side, where a helper normalised an input a guard needed.
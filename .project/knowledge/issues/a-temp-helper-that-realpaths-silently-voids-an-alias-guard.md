---
id: a-temp-helper-that-realpaths-silently-voids-an-alias-guard
type: issue
created: 2026-10-08
updated: 2026-10-08
tags: [testing, macos, filesystem, helpers, runtime]
related: [macos-tmpdir-realpath-alias-breaks-path-assertions, prove-a-guard-test-with-an-in-memory-mutant, sync-tools-refuse-symlinks-in-source-and-destination]
source: runtime-test-helpers
severity: medium
resolved: true
---

# Issue: a temp-fixture helper that realpaths its result silently voids a macOS alias guard

## Summary

A shared `tempFixture(deps, files)` helper that always returned `fs.realpathSync(mkdtempSync(...))`
made a caller's `real = false` / "give me the un-resolved path" branch return the *resolved* path
anyway, so a test written to exercise the macOS `/var` vs `/private/var` alias passed for the wrong
reason and no longer caught the regression it existed to catch.

## Symptoms

- `orca-apply.test.mts` test *"a root given through the macOS /var alias still matches the dirty
  set and refuses overlap"* stayed green after the production realpath was deleted.
- No error, no warning — the guard was simply inert. Verified by printing:
  `aliased === real ? true` on macOS, where `mkdtempSync(join(tmpdir(), ...))` returns
  `/var/folders/...` and `realpathSync` returns `/private/var/folders/...`.

## Root Cause

The helper had one output form and normalised its result as a side effect of a *different* purpose:
resolving the fixture root so callers could build comparison paths
(see [[macos-tmpdir-realpath-alias-breaks-path-assertions]]). The caller then asked for the opposite
of what the helper returned, and the helper had no way to say so:

```typescript
// helper: one shape, always resolved
const root = deps.fs.realpathSync(deps.fs.mkdtempSync(...));
return root;

// caller: "give me the un-resolved form"
function tmp(t, real = true) { return real ? deps.fs.realpathSync(dir) : dir; }
// → `dir` is already resolved, so `real = false` is indistinguishable from `real = true`
```

The test still exercised *a* path assertion, so it looked healthy. Only an in-memory mutant
([[prove-a-guard-test-with-an-in-memory-mutant]]) exposed it: removing
`root = deps.fs.realpathSync(options.root)` from `orca-apply.mts` left all 20 tests passing.

## Solution

Give the helper an explicit opt-out and make the caller pass it through:

```typescript
export function tempFixture(
  deps: RuntimeDeps,
  files: Record<string, string | FixtureFile>,
  options?: { resolve?: boolean },
): string {
  const resolve = options?.resolve !== false;
  const tmp = deps.fs.mkdtempSync(`${deps.os.tmpdir()}/test-helper-`);
  const root = resolve ? deps.fs.realpathSync(tmp) : tmp;
  // ...
  return root;
}

// caller
function tmp(t: TestContext, real = true): string {
  return tempFixture(deps, {}, { resolve: real });
}
```

Re-proved after the fix: the mutant at `orca-apply.mts:438` now fails the alias test.

## Prevention

- When extracting a fixture helper out of one test, check for **behaviour the old inline helper
  did not have** — a normalisation the helper now performs by default can delete the input a
  downstream branch depends on.
- A helper that silently changes a value's form is a behaviour change for every caller. Make the
  form part of the signature (`{ resolve }`), not a hidden default.
- When a test's whole purpose is a specific input shape (an aliased path, an un-normalised string,
  a non-executable bit), assert that shape at the top of the test so a helper cannot quietly
  substitute a different one. Mutate the production code the guard protects before calling a guard
  proven.

## Related

- [[macos-tmpdir-realpath-alias-breaks-path-assertions]] — the alias behaviour this guard was
  protecting against in the first place.
- [[prove-a-guard-test-with-an-in-memory-mutant]] — the technique that found the inert guard.
- `ai-framework/scripts/orca-apply.test.mts` — the affected test.
- `ai-framework/scripts/runtime/test-helpers.mts` — the helper.
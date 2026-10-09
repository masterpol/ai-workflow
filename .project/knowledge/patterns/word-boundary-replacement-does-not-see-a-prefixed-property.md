---
id: word-boundary-replacement-does-not-see-a-prefixed-property
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [tooling, refactor, shell, reviews]
related: [reusing-a-transaction-exposes-its-lock-reader-to-new-callers, guard-tests-can-fail-for-the-wrong-reason, keep-the-fakes-guarantee-the-thing-they-replace]
source: runtime-test-helpers
---

# Pattern: a word-boundary search-and-replace still matches inside a longer identifier

## Summary

`sed 's|\bfs\.|deps.fs.|g'` converts every `fs.` — including the one already inside `deps.fs.` —
because `\b` matches at the `f` even though the preceding character is a `.`. A bulk refactor then
produces `deps.deps.fs.`, which is a syntax error or, worse, a silently different call.

## The Pattern

If the tool cannot express a negative lookbehind, protect what you already rewrote with a
placeholder, then restore it:

```sh
# 1. park the already-correct occurrences (macOS sed needs '' after -i)
sed -i '' 's|deps\.fs\.|__PFS__|g; s|deps\.path\.|__PP__|g' file.mts

# 2. rewrite the bare ones (no placeholder text can match here)
sed -i '' 's|\bfs\.|deps.fs.|g; s|\bpath\.|deps.path.|g' file.mts

# 3. restore
sed -i '' 's|__PFS__|deps.fs.|g; s|__PP__|deps.path.|g' file.mts
```

When the target language is available, prefer it over `sed` and let the parser bound the
identifier. If a bad pass already landed, the recovery is a second pass:

```sh
sed -i '' 's|deps\.deps\.|deps.|g' file.mts
```

Run the file's tests immediately after — that is what catches the second-order damage from a
mechanical rewrite (here, a `statSync`/`lstatSync` argument-count error and a Buffer-vs-Uint8Array
assertion failure, both of which type stripping never checked because the repo has no `tsc`).

## When to Use

- Bulk renaming a property or method across a file that already contains the new name.
- Any `sed`/`perl -pi` pass over source code rather than plain text or config.

## When NOT to Use

- When the language server or the file's own tooling can do the rename. `sed` is the fallback.

## Examples in Codebase

- `ai-framework/scripts/orca-apply.test.mts` — the `fs.`/`path.` → `deps.fs.`/`deps.path.` sweep
  that produced `deps.deps.fs.` and needed the recovery pass.
- `.project/pitches/runtime-test-helpers/log.md` — incident record.

## Related Patterns

- [[reusing-a-transaction-exposes-its-lock-reader-to-new-callers]] — a mechanical change that
  looked right locally and only surfaced under a second caller.
- [[guard-tests-can-fail-for-the-wrong-reason]] — the same session's lesson for edits whose
  failure mode is silent.
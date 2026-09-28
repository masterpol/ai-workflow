---
id: resolve-before-matching-a-protected-path-allowlist
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [security, filesystem, symlinks, case-sensitivity]
related: [resolve-config-only-from-trusted-root, prose-instructions-must-specify-how-to-extract-from-free-form-arguments]
source: portable-skill-defaults
---

# Pattern: Resolve the real path before matching it against a protected-directory list

## Summary

A guard whose whole job is "refuse to touch anything under these protected directories" is only
as strong as the path comparison it does the refusing with. Matching the **lexical** path string
(as written, or even after `path.join`/`path.relative`) against a protected-prefix list has two
independent, non-obvious bypasses that both slipped past code review and were only caught by a
dedicated security pass with live proof-of-concept scripts:

1. **Symlink bypass**: a symlink at an *allowed* location pointing at a file *inside* a protected
   directory lexically resolves to the allowed path, not the protected one — the check never
   sees where the data actually lives.
2. **Case-folding bypass**: on the default filesystem of the two most common desktop OSes
   (macOS/APFS, Windows/NTFS — both case-insensitive by default), `.PROJECT/PITCHES/x` and
   `.project/pitches/x` are the same on-disk file, but a case-sensitive string comparison treats
   them as unrelated. Linux's usual case-sensitive filesystem is the odd one out here, which is
   easy to forget when developing/testing primarily on macOS.

## The Pattern

```js
function isProtected(root, targetPath) {
  const realRoot = fs.realpathSync(root);
  const real = resolveReal(root, targetPath); // realpath as much of the path as exists;
                                                // append the non-existent suffix, if any
  const relative = path.relative(realRoot, real);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return "outside-root"; // don't just allow it silently
  const normalized = relative.split(path.sep).join("/").toLowerCase(); // safe both directions:
                                                                         // never turns a real
                                                                         // bypass into a false
                                                                         // negative, at worst
                                                                         // over-protects on a
                                                                         // case-sensitive FS
  return PROTECTED_PREFIXES.some((dir) => normalized === dir || normalized.startsWith(`${dir}/`));
}
```

Both fixes are cheap (a `realpathSync` call and a `.toLowerCase()`) and neither weakens the
check on a filesystem where the bypass doesn't apply — always resolving and lowercasing is
strictly safe in both directions.

## When to Use

- Any allowlist/denylist that gates a write, delete, or "hand this path to a less-trusted tool"
  decision based on directory prefix matching — not just this project's own historical-record
  guard.
- Especially when the checked-against list is a small, fixed set of "never touch this" paths
  (config directories, secrets locations, historical records) rather than a large dynamic
  filesystem walk (where a different, heavier approach may be warranted).

## When NOT to Use

- If the guard only ever receives paths already known to come from a trusted, non-symlink-
  capable source (e.g. a value your own code generated, never a caller-supplied string), the
  extra `realpathSync` call is unnecessary overhead — but verify that assumption holds for every
  call site, not just the ones you wrote first.

## Examples in Codebase

- `ai-framework/scripts/skill-compress-guard.js` (`canCompress`/`resolveReal`) — found and fixed
  during `portable-skill-defaults`' audit cycle 1; both bypasses were independently reproduced
  with live PoC scripts before and after the fix (not accepted on a subagent's description
  alone). See `.project/compaction/archives/portable-skill-defaults-2026-09-25T13-39-03-844Z/files/audit-cycle-1.md`.
- `ai-framework/scripts/skill-defaults.js` (`loadModes`) and
  `ai-framework/hooks/scripts/token-consumption.js` (`currentCavemanMode`) — a sibling issue
  (symlinked *ancestor directory*, not the checked leaf file, bypassing a "must not be a
  symlink" check) fixed the same way: resolve-and-compare-against-root rather than `lstat`-ing
  only the one path you were handed.

## Related Patterns

- [[resolve-config-only-from-trusted-root]] — the companion principle for the other direction:
  pinning what a subprocess reads config from, rather than what your own code is willing to
  touch.

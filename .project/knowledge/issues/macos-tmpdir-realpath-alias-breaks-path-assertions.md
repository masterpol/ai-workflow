---
id: macos-tmpdir-realpath-alias-breaks-path-assertions
type: issue
created: 2026-09-25
updated: 2026-09-25
tags: [testing, macos, filesystem, node]
related: []
source: portable-skill-installation
severity: low
resolved: true
---

# Issue: macOS resolves `os.tmpdir()` through a `/private/var` alias, breaking exact-path assertions in tests

## Summary

A Node test that builds a fixture under `os.tmpdir()` and later compares a path string returned
by the code under test (not a `fs.realpathSync`-resolved one) against `path.join(tmpFixtureDir,
...)` can fail on macOS even though the underlying file is correct — the two strings resolve to
the same inode but aren't byte-identical.

## Symptoms

- `AssertionError`: `/private/var/folders/.../T/xyz/target/file` vs
  `/var/folders/.../T/xyz/target/file` — same file, different string.
- Happened independently twice in the same pitch (`portable-skill-installation`): once during
  S1 (`add-skill.test.js`, a symlink-target assertion) and again during S3
  (`bundle-sync.test.js`, a `removed` entry's `targetPath` field), by two different
  implementers who hadn't seen the other occurrence yet — a strong signal this is a general
  footgun for any test that builds fixtures under `os.tmpdir()` on macOS, not a one-off.

## Root Cause

On macOS, `/tmp` (and therefore `os.tmpdir()`, which resolves to `/var/folders/...` by default)
is itself a symlink into `/private/var/...`. `fs.mkdtempSync(path.join(os.tmpdir(), ...))`
returns the un-resolved `/var/...` form. Code under test that constructs its own path strings
from a project root passed in as `process.cwd()`/`--root` may internally call
`fs.realpathSync()` on that root (common, and often correct — see `context()` in
`skill-registry.js`, which does this deliberately to canonicalize the project root before any
path safety check). The realpath'd root then produces `/private/var/...`-prefixed paths, while
the test's own un-resolved fixture path is still `/var/...` — an exact string comparison
between the two fails despite pointing at the identical file.

## Solution

Compare canonical real paths, not raw strings, whenever a path crossed a `realpathSync`
boundary on either side:

```js
assert.equal(fs.realpathSync(actualPath), fs.realpathSync(expectedPath));
```

Do this specifically for any assertion comparing a path the code under test constructed
(especially one built from a realpath'd root) against a path the test built directly from
`os.tmpdir()`/`fs.mkdtempSync()`. Don't blanket-realpath everything (a path to a file that
doesn't exist yet, e.g. one that's about to be created, can't be realpath'd) — only apply this
at the specific assertions that compare full path strings.

## Prevention

- When a fixture helper is created under `os.tmpdir()` for path-string tests (not just content
  tests), realpath the fixture root once immediately after creating it, and build all expected
  comparison paths from that realpath'd root — avoids the mismatch at its source instead of
  patching every assertion.
- When reviewing a new test file's path assertions, check whether any of them do exact string
  equality on a full filesystem path rather than a relative path or a realpath'd comparison.

## Related

- `ai-framework/scripts/add-skill.test.js` — original occurrence (S1 build incident,
  `.project/compaction/archives/portable-skill-installation-2026-09-25T13-27-02-414Z/files/log.md`).
- `ai-framework/scripts/bundle-sync.test.js` — second, independent occurrence (S3 build).

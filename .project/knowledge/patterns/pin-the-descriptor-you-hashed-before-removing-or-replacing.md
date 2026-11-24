---
id: pin-the-descriptor-you-hashed-before-removing-or-replacing
type: pattern
created: 2026-11-24
updated: 2026-11-24
tags: [reports, ownership, toctou, atomic-write, security]
related: [a-report-never-overwrites-a-file-it-did-not-write, sync-tools-refuse-symlinks-in-source-and-destination, staging-substitution-can-redirect-cleanup, pin-directory-identities-across-async-leases]
source: state-project-depth
---

# Pattern: prove ownership on the bytes you hashed, then act only on that same file

## Summary

`bundle-sync` removes the last `/state` delivery, and `facts-gather` replaces its own draft, only when a hash proves the file is theirs.
Three audit cycles each found a gap between "proved" and "acted on":

1. The hash was checked, then the file was unlinked by path. A file renamed over it in between was deleted.
2. The fix pinned identity with an `lstat` taken *after* the hashed read. A swap in that gap was pinned and then deleted.
3. A marker path that could not be read (`EACCES`) was treated as absent and overwritten.

## The pattern

- **The identity of what was hashed comes from the hashed descriptor.** Open with `O_NOFOLLOW|O_NONBLOCK`, `fstat`, compare with the
  `lstat` taken before opening, read at most `limit+1`, hash, and return `dev` and `ino` from that `fstat`. Immediately before
  `unlink` or `rename`, `lstat` the path and compare it with the pinned identity. Refuse on any difference.
- **Publish a new file with a hard link**, not a rename. `link` fails with `EEXIST` when something appeared meanwhile. Only `EEXIST` means
  "not ours". On a filesystem without links, re-check absence and fall back to a rename (a documented, narrower window).
- **Replace an owned file only after re-checking identity and bytes** just before the rename.
- **Only `ENOENT` is absence.** Any other error while inspecting a path you are about to overwrite means leave it alone.
- **Pin the containing directory too** (`dev`/`ino`), and re-check it before each removal.
- **Test each half with an injected swap at the exact gap**, for example in `closeSync` of the hashed descriptor, and keep a mutant that removes the
  check, to prove the test is not redundant. In this pitch, the byte comparison hid a missing identity check until a same-bytes, new-inode test was added.

## Residual

Path-based `unlink` and `rename` after the final check still leave a small window, because there is no `openat` or `unlinkat` in the runtime. Document it.

See [[a-report-never-overwrites-a-file-it-did-not-write]] and [[sync-tools-refuse-symlinks-in-source-and-destination]].

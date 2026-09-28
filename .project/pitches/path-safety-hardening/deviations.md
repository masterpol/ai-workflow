# Build deviations

## D1 — Portable filesystem limitation — 2026-09-26

Repeated symlink checks and retained ancestor device/inode identities reject observed swaps before temporary-file creation and rename. They do not make pathname operations atomic: an adversarial actor can replace an ancestor after the final check. Node's dependency-free portable filesystem API does not expose openat/renameat directory-relative writes. S1 remains incomplete; full race closure requires a platform/native descriptor contract or a documented trusted-directory threat model approved at the plan gate.

Ledger commits reuse skill-registry transactions for symlink refusal and atomic replacement. This intentionally also creates and releases the registry lock/journal under .project/skills; a pending registry transaction blocks ledger commits safely.

Unsafe cleanup is refused and can retain a temporary file in a moved original directory. Recovery also refuses a swapped path rather than following it.

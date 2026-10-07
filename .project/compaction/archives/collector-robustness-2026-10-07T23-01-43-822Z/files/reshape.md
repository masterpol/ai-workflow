# Re-shape addendum — 2026-09-26

The original pitch and implemented identity fixes remain intact. The original age-based live-owner reclaim proposal is unsafe when a paused owner resumes.

## Proposed next step

Bet native-safety-feasibility first. Prove an OS-backed lock held across the entire read/modify/publish critical section. Keep one stable lock inode and release by descriptor closure rather than pathname deletion. Test process termination, paused writers, timeout and replacement attempts in scratch fixtures.

## Pending contract decisions

- How every writer, including older collector copies, participates in the same locking protocol.
- Required helper runtime and supported-platform fallback policy.
- Distinguish real live ownership from orphaned metadata; never steal a kernel-held lock solely because it is old.
- Explicit legacy dedup replay limitation and migration policy.

S1 remains downhill 75%. Linux process-start support is still unverified on this macOS host. Existing collector changes remain stable for independent re-review.

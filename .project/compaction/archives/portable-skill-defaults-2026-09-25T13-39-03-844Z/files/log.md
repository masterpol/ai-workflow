# Build incidents

## Audit cycle 1 — 2026-09-25

- code-reviewer, security-reviewer, test-coverage-checker, cross-pitch-conflict-checker
  dispatched in parallel. 3 must-fix (2 security path-guard bypasses, 1 missing test), 2
  should-fix (ancestor-symlink bypass in mode-file loading, missing subprocess timeout) — all
  fixed and re-verified. Zero findings remain. 44/44 tests pass after fixes (was 39; +5).
- Independently reproduced every security finding with a live PoC (`node -e`) against the
  actual exported functions before treating it as confirmed, and again after the fix to prove
  closure — not just re-reading the subagent's own description.

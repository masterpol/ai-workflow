# Shipped: shape-lite (2026-10-07, v2.9.1)

| Scope | Status | Evidence |
|---|---|---|
| S1 skill + 3 mirrors | done | doctor exit 0; cursor copy identical; mirrors in sync |
| S2 docs | done | setup-validator exit 0; 4 files mention shape-lite |
| S3 version | done | VERSION 2.9.1, changelog --check exit 0 |
| S4 (added) `@AGENTS.md` import validation | done | entry-import.js + 10 tests; wired into setup-validator, bundle-sync; SETUP.md and setup skill |

No-gos honored: full `/shape` unchanged; no critique fan-out or new agents in lite; single gate; no auto-advance. Rabbit holes: all resolved here or by plan (doctor is dynamic, no code change).
Audit: 2 cycles, 2 must-fix (quadratic regex, raw-line directive) fixed; canary caught both cycles; see audit.md. Deviations: deviations.md.
Verify: no build/lint/typecheck command in this repo (skipped). Tests 318/319; the failure (live caveman state) predates this pitch. Final git diff: no secrets or debug output.
Knowledge: decisions/shape-lite-is-a-gated-escalating-variant-of-shape, issues/backtracking-regex-over-untrusted-text-is-quadratic.
Followups: see _followups.md (5 added).

# Run: fix-instruction-conflicts (2026-10-17 → 2026-10-18)

Bug fix, shipped as 2.31.1–2.31.4 on `feat/unified-toon-config` (`57025b1` fix + concurrent Codex validation I–M,
`e5f68bb` audit cycle 1, ship commit). Records: `.project/pitches/fix-instruction-conflicts/` (log, validation, audit,
SHIPPED).

- Triage: owner-supplied static analysis; all eight findings A–H confirmed, four broader than reported (exit 3 also
  returned by a disabled switch; reviewer already read-only on OpenCode/Codex; build gate start vs end; d31 mode note).
- Build: owners named and every mention made to point at them; regression tests failed first (7/8), then passed.
  A concurrent Codex session added contracts I–M and 2.31.2/2.31.3; reviewed and included.
- Audit: Orca Run `run_69e8aec6acd0`, 6 attempts (codex ×4, opencode ×2), canary caught by all, guard clean;
  9 residuals fixed with contract N and mutant proofs; cross-pitch overlap resolved by sequencing
  `instruction-compression` after this ship; eval review not-completed (no golden prompt cases) — owner accepted the
  residual risk.
- Final verify: Node 1689 pass / 2 fail / 2 skip and Bun 1686 pass / 2 fail / 2 skip, both failures the stale graph
  (knowledge entries added before the rebuild); after `graphify.mts`, both tests pass on Node and Bun, doctor and
  setup-validator READY on both runners, contracts 14/14, Cursor copies 44 current, docs-links 26 files 0 broken, diff
  has no secret files or debug output. No build/typecheck/lint/i18n command exists.
- Knowledge: pattern `one-owner-per-instruction-topic-guarded-by-contract-tests`; issue
  `instruction-copies-drift-into-contradictions`.

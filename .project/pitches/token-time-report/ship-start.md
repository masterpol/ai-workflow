# Ship startup: token-time-report

Owner approved audit end (“Approve”), 2026-10-21. Ship startup returned ready for Codex. The mandatory pre-ship wrapper exited 1 because this package-less bundle has neither a root package.json nor the Muro verifier. No fallback or closure is inferred; explicit direct-check approval is pending. VERSION/CHANGELOG and shipped status remain unchanged.

A concrete direct-check and v2.41.0 closeout proposal is prepared at `.project/metrics/token-time-report-ship/ship-proposal.md`; live command outputs are adjacent. The exact wrapper failure is preserved in `pre-ship-verify.log`. Full Node diagnostics pass 2472 with 3 existing skips. Doctor exits 0 with its pre-existing state-graph.test.mts boundary warning; validator/graph checks pass. Bun results are recorded separately when the diagnostic run finishes.

Direct diagnostic Bun selection finished: 257 pass, 0 fail across six files. Diff sanity checks include tracked and untracked paths; no sensitive changes or production debug statements. No package-less fallback has been approved yet.

## Fallback approved

Owner replied “Approve” to the concrete direct-check fallback. The recorded wrapper failure is superseded only as the chosen verification route; it is not erased or called a pass. The actual Node/Bun/doctor/validator/graph/diff results form the ship gauntlet. Release preparation may proceed; final ship/hold gate remains.

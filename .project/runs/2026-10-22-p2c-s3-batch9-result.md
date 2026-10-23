# P2c-S3/S4 batch 9 — applied and verified

Owner approved the [exact five-pitch preview](2026-10-22-p2c-s3-batch9-preview.md). All approved payload, supplement and existing destination hashes matched before publication. Five supplements published in one guarded compaction transaction; five upgrades applied sequentially with per-slug source-read receipts and seven exact reviewed-drift acceptances.

Upgraded: orca-auto-start-all-phases, runner-aware-runtime-boundary-validator, token-attribution, token-time-report, workflow-usage-state.

Current status: **37 upgraded, 9 legacy, 0 partial, 0 problems**. Nine legacy narratives remain. Every original v1 sibling is byte-identical to HEAD and its approved ledger hash. All five archives verify valid, their manifest hashes match reviewed cache proof, approved payload hashes match committed v2 ledgers, outcomes lint clean and published supplements/bound destinations retain approved hashes. Read-only replay preflight succeeds for each.

Current checks: setup READY (25 checks; 46 valid ledgers, 37 valid outcomes, 175 TypeScript entries); graph CLEAN (119 knowledge entries, 336 knowledge links); relations 0 problems; supplements 37 files / 0 broken links. Live graph confirms each of the five outcome slug nodes has direct links to its durable supplement and backlog. token-time-report explain exits 0.

No production code changed; full suite was not rerun. Missing historical live-evidence path remains a separate repair; no failed historical claim is relabelled. No commit, push or shipping action performed.

Machine proof: [apply evidence](2026-10-22-p2c-s3-batch9-apply-evidence.toon). Next: [batch-10 source request](2026-10-22-p2c-s3-batch10-source-request.md), approved by owner after batch-9 verification.

# P2c-S3 batch 3 — applied and verified

The owner approved the exact five-pitch preview ([preview](2026-10-22-p2c-s3-batch3-preview.md)). Supplements were published in one compaction transaction, then each pitch was applied through the legacy-upgrade CLI with a named archive-read approval. No code changed; VERSION unchanged.

| Pitch | State | Outcome bytes (cap 3000) |
|---|---|---:|
| independent-rereview-catch-up | upgraded | 1424 |
| native-safety-feasibility | upgraded | 1013 |
| orca-vendor-foundation | upgraded | 1371 |
| orca-vendor-reconcile-integration | upgraded | 1467 |
| runtime-test-helpers | upgraded | 1208 |

Counts: 33 legacy, zero partial, 13 upgraded; tier A is 13/19. Status reports zero problems.

Verification (all exit 0 or valid): `pitch-archive verify` valid for all five; all five `.v1.json` siblings are byte-identical to the HEAD ledgers; graphify rebuild then `--check` CLEAN (119 entries / 336 links); relations 0 problems; setup-validator READY (25 checks); docs-links on records/legacy-upgrades 13 files, 0 broken; `graphify explain` exits 0 for each new outcome record.

Not re-run: the full test suite (18 prior state-fragment/dataset failures remain open and unwaived) and batch-2's per-target one-hop assertions. Four historical destination conflicts and the token-time-report large-source proof remain open. Per-slug hashes: [apply evidence](2026-10-22-p2c-s3-batch3-apply-evidence.toon).

Metrics: activity codex-observed-p2c-s3-20261022-01 resumed then paused (seventh pause); the resume was recorded after the work, so active time is undercounted.

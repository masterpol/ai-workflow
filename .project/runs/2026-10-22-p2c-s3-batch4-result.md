# P2c-S3 batch 4 — applied and verified

The owner approved the exact two-pitch preview ([preview](2026-10-22-p2c-s3-batch4-preview.md)). Supplements were published in one compaction transaction, then each pitch was applied through the legacy-upgrade CLI with a named archive-read approval. No code changed; VERSION unchanged.

| Pitch | State | Outcome bytes (cap 3000) |
|---|---|---:|
| state-quoted-fonts | upgraded | 1121 |
| workflow-usage-metrics | upgraded | 1614 |

Counts: 31 legacy, zero partial, 15 upgraded; tier A is 15/19. Status reports zero problems.

Verification (all exit 0 or valid): `pitch-archive verify` valid for both; both `.v1.json` siblings are byte-identical to the HEAD ledgers; graphify rebuild then `--check` CLEAN (119 entries / 336 links); relations 0 problems; setup-validator READY (25 checks); docs-links on records/legacy-upgrades 15 files, 0 broken; `graphify explain` exits 0 for both new outcome records.

Not re-run: the full test suite (18 prior state-fragment/dataset failures remain open and unwaived) and batch-2's per-target one-hop assertions. The four historical destination conflicts (codex-orca-coordinator-parity, orca-auto-start-all-phases, runner-aware-runtime-boundary-validator, state-multipage-report) and the token-time-report large-source proof remain open. Hashes: [apply evidence](2026-10-22-p2c-s3-batch4-apply-evidence.toon).

# P2c-S3 batch 6 — applied and verified

The owner approved the exact five-pitch preview ([preview](2026-10-22-p2c-s3-batch6-preview.md)). Supplements were published in one compaction transaction, then each pitch was applied through the legacy-upgrade CLI (v2.48.1) with a named archive-read approval. All five applied on the first attempt; the retirement fix from batch 5 held.

| Pitch | State | Outcome bytes (cap 3000) |
|---|---|---:|
| toon-machine-data | upgraded | 1731 |
| vendor-model-toon | upgraded | 1546 |
| workflow-usage-capture | upgraded | 1992 |
| orca-role-pools | upgraded | 1746 |
| upstream-project-drift | upgraded | 1543 |

Counts: 21 legacy, zero partial, 25 upgraded. Status reports zero problems; 21 legacy narratives remain in done-work.md, matching the legacy count.

Verification (all valid or exit 0): `pitch-archive verify` valid for all five; all five `.v1.json` siblings byte-identical to the HEAD ledgers; no `## <slug> — shipped` narrative remains for any of them; graphify rebuild then `--check` CLEAN (119 entries / 336 links); relations 0 problems; setup-validator READY (25 checks); docs-links on records/legacy-upgrades 25 files, 0 broken; `graphify explain` exits 0 for each new outcome record.

Not re-run: the full test suite (18 prior state-fragment/dataset failures remain open and unwaived). Hashes: [apply evidence](2026-10-22-p2c-s3-batch6-apply-evidence.toon).

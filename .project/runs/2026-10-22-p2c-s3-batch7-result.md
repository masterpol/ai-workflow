# P2c-S3 batch 7 — applied and verified

The owner approved the exact two-pitch preview ([preview](2026-10-22-p2c-s3-batch7-preview.md)). Supplements were published in one compaction transaction, then each pitch was applied through the legacy-upgrade CLI (v2.48.1) with a named archive-read approval. Both are tier B-large; every clean pitch is now upgraded.

| Pitch | State | Outcome bytes (cap 3000) |
|---|---|---:|
| instruction-compression | upgraded | 1920 |
| unified-toon-config | upgraded | 1844 |

Counts: 19 legacy, zero partial, 27 upgraded. Status reports zero problems; the 19 legacy narratives remaining in done-work.md match the legacy count. All 19 remaining pitches are destination-drift cases (4 tier A, 15 B-small) and need `acceptDestinationDrift`.

Verification (all valid or exit 0): `pitch-archive verify` valid for both; both `.v1.json` siblings byte-identical to the HEAD ledgers; neither `## <slug> — shipped` narrative remains; graphify rebuild then `--check` CLEAN; relations 0 problems; setup-validator READY (25 checks); docs-links on records/legacy-upgrades 27 files; `graphify explain` exits 0 for both new outcome records. Not re-run: the full test suite (18 prior failures open and unwaived). Hashes: [apply evidence](2026-10-22-p2c-s3-batch7-apply-evidence.toon).

# P2c-S3 batch 8 — applied and verified (first reviewed-drift batch)

The owner approved the exact five-pitch preview ([preview](2026-10-22-p2c-s3-batch8-preview.md)). Before publishing I re-checked that `.project/pitches/_followups.md` still hashed to the accepted current value; supplements were then published in one compaction transaction and each pitch applied through the legacy-upgrade CLI (v2.48.1) with `acceptDestinationDrift` bound to the committed `sha256:b5b29119…ec10` and current `sha256:d0404fd9…95f5` hashes of `_followups.md` and a written reason. The accepted approval hash is recorded in each upgraded ledger (`legacyUpgrade`).

| Pitch | State | Outcome bytes (cap 3000) |
|---|---|---:|
| state-ai-authoring | upgraded | 2027 |
| state-deep-evidence | upgraded | 1894 |
| state-fragment-sanitizer | upgraded | 1885 |
| state-report-redesign | upgraded | 1822 |
| test-execution-performance | upgraded | 1784 |

Counts: 14 legacy, zero partial, 32 upgraded. Status reports zero problems; the 14 legacy narratives remaining in done-work.md match the legacy count. `_followups.md` was not edited during the apply window (hash unchanged afterwards).

Verification (all valid or exit 0): `pitch-archive verify` valid for all five; all five `.v1.json` siblings byte-identical to the HEAD ledgers; no `## <slug> — shipped` narrative remains for any of them; graphify rebuild then `--check` CLEAN (119 entries / 336 links); relations 0 problems; setup-validator READY (25 checks); docs-links on records/legacy-upgrades 32 files, 0 broken; `graphify explain` exits 0 for each new outcome record.

Open: the `live-runs.md` / `state-fragment-dataset.test.mts` ENOENT failure (owner decision pending; options in the preview) and the other 17 of the 18 prior full-suite failures; the full suite was not re-run. Hashes: [apply evidence](2026-10-22-p2c-s3-batch8-apply-evidence.toon).

# P2c-S3 batch 5 — applied and verified

The owner approved the exact five-pitch preview ([preview](2026-10-22-p2c-s3-batch5-preview.md)). Supplements were published in one compaction transaction, then each pitch was applied through the legacy-upgrade CLI with a named archive-read approval. These are the first tier-B pitches: each done-work narrative is retired and its supplement is the sole durable home.

| Pitch | State | Outcome bytes (cap 3000) |
|---|---|---:|
| agent-model-sweep | upgraded | 1493 |
| fix-instruction-conflicts | upgraded | 1583 |
| orca-engines-range | upgraded | 1381 |
| path-safety-hardening | upgraded | 1534 |
| shape-lite | upgraded | 1363 |

Counts: 26 legacy, zero partial, 20 upgraded. Status reports zero problems.

**Incident and fix.** The second apply (fix-instruction-conflicts) stopped with "Legacy narrative binding conflict" after agent-model-sweep was retired. Cause: removing an entry left an extra blank line that changed the previous entry's content hash. Nothing was written by the failed call. The tool was fixed (version 2.48.1: retirement also removes the entry's separator newline; tests for last and middle entries; two mutants caught; 48/48 on Node and Bun), the one extra blank line in `.project/done-work.md` was removed (restoring bytes whose hash equals the approved hash), and the remaining four applied. Earlier batches' retired entries had left the same blank line; no pending entry besides this one was affected.

Verification (all valid or exit 0): `pitch-archive verify` valid for all five; all five `.v1.json` siblings are byte-identical to the HEAD ledgers; no `## <slug> — shipped` narrative remains for any of them; graphify rebuild then `--check` CLEAN (119 entries / 336 links); relations 0 problems; setup-validator READY (25 checks); docs-links on records/legacy-upgrades 20 files, 0 broken; `graphify explain` exits 0 for each new outcome record.

Not re-run: the full test suite (18 prior state-fragment/dataset failures remain open and unwaived). Hashes: [apply evidence](2026-10-22-p2c-s3-batch5-apply-evidence.toon).

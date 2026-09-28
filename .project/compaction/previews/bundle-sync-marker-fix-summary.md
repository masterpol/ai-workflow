S1 shipped per-entry effective sync bases. Verified equality and applied files advance to the source digest; unapplied local/conflict/retained-removal entries preserve their base, unverified entries without a base stay absent, and pruned entries disappear. Repeated-run tests keep pending upstream changes visible.

Knowledge: [[effective-sync-bases-and-bounded-font-discovery]]. Closure evidence and constraints: `.project/records/pitch-compression/bundle-sync-marker-fix.md`. Ship-time log: `.project/runs/2026-09-26-bundle-sync-marker-fix.md`. No Git commit or external publication occurred. Production safety pitches remain incomplete.

Recovery archive (byte-for-byte, checksummed): `.project/compaction/archives/bundle-sync-marker-fix-2026-09-27T01-27-20-241Z/`. Restore: `node ai-framework/scripts/pitch-archive.js restore bundle-sync-marker-fix --apply`. Coverage ledger: `.project/compaction/ledgers/bundle-sync-marker-fix.json` (100% extracted, zero gaps).

---
id: live-test-evidence-outlived-its-pitch-path
type: issue
created: 2026-10-23
updated: 2026-10-23
tags: [compaction, testing, evidence, retention, migration]
related: [pitch-compaction-gate-and-recovery-design, a-missing-tracked-file-is-not-an-undeleted-deletion, a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version]
source: fix-retired-live-evidence-path
severity: medium
resolved: true
---

# Issue: a live evidence consumer outlived its retired pitch path

## Summary

Pitch compaction removed state-ai-authoring/live-runs.md while the dataset regression still opened that path. Retaining a narrative summary did not preserve the complete machine-readable matrix required by the consumer.

## Symptoms and cause

The historical-record test failed ENOENT. Its input was a removable pitch file rather than a durable evidence owner. The recorded evidence includes 72 runs, 12 seeded bad rows and a Cursor not-run row; the computed historical claim is blocked. A summary, skipped assertion or newly invented successful run would not replace that input.

## Resolution

Restore the exact 36,920 original UTF-8 bytes from the already approval-gated, verified source cache to .project/records/legacy-upgrades/state-ai-authoring-live-runs.md. Repoint only LIVE_RECORD in state-fragment-dataset.test.mts. Raw SHA-256 868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a and original normalized source hash match approved proof. Existing consumer assertions remain unchanged and validate Claim: blocked; this is preservation of old evidence, not a new live-model result.

## Prevention

Before retiring a pitch directory, inventory test and tool consumers of its source paths as well as prose links. Move required full assets to durable ownership, prove complete bytes against an approved original, update the consumer, and run its unchanged regression. Do not make ordinary tests read recovery archives. Check recorded deletion intent before restoring any old path.

The final-verification child failure during this repair remains an independent, unconfirmed incident; later passing runs do not establish its cause. Bounded parent diagnostics are tracked as FRLE-D1, and existing timing-under-load work retains its own owner.

---
id: pitch-folders-accumulate-staging-nothing-consumes
type: issue
created: 2026-10-23
updated: 2026-10-23
tags: [compaction, ledger, retention, campaign, workflow]
related: [live-test-evidence-outlived-its-pitch-path, pitch-compaction-gate-and-recovery-design, a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash]
source: connected-memory-consolidation
severity: medium
resolved: true
---

# Issue: a pitch folder accumulated files nothing consumes and could not be compacted

## Summary

The connected-memory-consolidation pitch held 242 files (6.1 MB of staging, prompts and copies). `commit-ledger` refuses more than 200 files outside the covered sections, and 74 links pointed into the folder, so the pitch that built the compaction flow could not use it.

## Symptoms and cause

About 185 of the files were per-pitch campaign staging: an unresolved draft that `prepare` regenerates, a proposal, an approved input that is the proposal unwrapped, and a supplement byte-identical to its published copy (46 of 47). A further 27 were reviewer prompts and results. The full 95 KB log was also copied into five run files, and each of eleven batches left four to six run files. No step consumed, merged or deleted any of it, and the ledger had no way to account for a folder as a unit.

## Resolution

Version 2.49.0 added group entries (a folder prefix bound by a count and tree hash) and a 2000-file bound. The pitch-compress and ship playbooks now say what to keep, where to stage and to snapshot a shared log once.

## Prevention

Treat every file a flow writes into a pitch folder as either durable, derivable or disposable at the moment it is created. Derivable and disposable files belong in a staging path that the batch result deletes. See [[a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash]].

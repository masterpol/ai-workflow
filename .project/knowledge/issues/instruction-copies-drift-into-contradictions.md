---
id: instruction-copies-drift-into-contradictions
type: issue
created: 2026-10-18
updated: 2026-10-18
tags: [instructions, prompts, drift, gates, orca, mirrors]
related: [one-owner-per-instruction-topic-guarded-by-contract-tests, reviewer-reports-contradicted-by-measurement]
source: fix-instruction-conflicts
severity: medium
resolved: true
---
# Issue: copied instructions drifted into contradictions that changed agent behavior

## Symptom

The same rules lived in phase specs, skills, agent prompts, entry files and Cursor copies, each edited separately.
They came to disagree: the audit and ship phase specs let an Orca exit 3 continue on the normal path while the skills
said stop; the build skill gated at build *start* while its spec gated at the *end*; the security reviewer could edit
on Claude/Cursor but was read-only on OpenCode/Codex; three different file-size limits; a migrator note and the
entry files pointing at a mode file the resolver ignores.

## Root cause

No topic had a declared owner, so every copy was authoritative to whichever agent read it, and no test compared them.
Several conflicts dated from the initial commit; the conflicting copies were never reconciled.

## Fix

One owner per topic, pointers elsewhere, and `workflow-contracts.test.mts` (see
[[one-owner-per-instruction-topic-guarded-by-contract-tests]]). Reconciliation kept the union of gates so no
behavior was weakened. A canary-backed audit then found nine residual mentions the first pass missed — expect that a
grep-driven fix misses phrasings, and let reviewers and the new tests sweep for them.

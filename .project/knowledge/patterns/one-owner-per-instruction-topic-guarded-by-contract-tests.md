---
id: one-owner-per-instruction-topic-guarded-by-contract-tests
type: pattern
created: 2026-10-18
updated: 2026-10-18
tags: [instructions, prompts, consistency, contract-tests, mirrors]
confidence: low
related: [instruction-copies-drift-into-contradictions, a-gate-must-not-trust-its-own-author, test-skip-is-a-follow-up-not-a-finish]
source: fix-instruction-conflicts
---
# Pattern: give each instruction topic one owner, make every other mention point at it, and guard the agreement with a contract test

## Summary

When the same rule appears in a phase spec, a skill, an agent prompt and a mirror, pick one owner file for the topic,
reduce every other mention to a pointer that says when to load the owner and which section applies, and add a
contract test that fails when any mention disagrees with the owner.

## How to apply

1. **Name the owner** (e.g. gate matrix → `workflow/overview.md`; size limits → `rules/component-architecture.md`;
   Orca outcome semantics → `integrations/orca-vendors.md`; mode precedence → `integrations/skill-defaults.md`).
2. **Reconcile by union, never by deletion**: when sources disagree, keep every gate or requirement any source had
   (the `/build end` row was the union of three tables), then let the others defer.
3. **Write the regression test first**, against the conflicting wording, and confirm it fails before the edit.
4. **Prove each assertion with a mutant**: restore the pre-fix wording in memory and confirm the test fails; an
   assertion that passes on an empty extracted section or a skipped missing file is vacuous.
5. **Refresh byte-copy mirrors in the same change** (Cursor copies) and assert their presence, not only their
   equality when present.
6. **Audit with a planted canary** in the reviewers' scratch copy (here: the old exit-3 fallback); every reviewer that
   catches it has shown it read the guarded text.

## Evidence

`fix-instruction-conflicts` (2026-10-17/18): 8 owner conflicts fixed, 9 more residuals found by canary-backed review
(all six reviewer attempts caught the canary), one more found by the new test itself; 14 contract tests, 19 mutant
proofs, all killed. See `ai-framework/scripts/workflow-contracts.test.mts`.

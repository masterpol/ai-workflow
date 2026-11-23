---
id: a-contract-claim-of-same-families-needs-a-test-per-member
type: pattern
created: 2026-11-23
updated: 2026-11-23
tags: [testing, mutation, redaction, contracts]
related: [prove-a-guard-test-with-an-in-memory-mutant, a-golden-dataset-case-counts-only-when-a-named-test-passes, archify-renders-the-state-report]
source: archify-replaces-state
confidence: low
---

# Pattern: when a doc says "same as before", test every member of the set

## Summary

A rewrite copied about half of the old redaction patterns while its comment and contract said "same families as the old snapshot". The tests asserted only the two families the author thought of; deleting any other family left the suite green.

## How to apply
- Make the claimed set a table in the test (one sample per member) so removing a member fails exactly one assertion; here 21 samples cover 20 families.
- Run an in-memory mutant per member ([[prove-a-guard-test-with-an-in-memory-mutant]]); a survivor is either a missing assertion or an unreachable member.
- Compare the new list with the old list mechanically when claiming parity, not by memory.

## Evidence
The test-coverage reviewer found it by mutation (AKIA, URL credentials and Bearer survived); after the table test, 10 mutants of the file were all killed.

---
id: a-grader-reports-executed-and-unexecuted-cases-separately
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [evals, grader, testing, honesty]
related: [prove-a-guard-test-with-an-in-memory-mutant, keep-the-fakes-guarantee-the-thing-they-replace]
source: orca-vendor-reconcile-integration
---

# Pattern: a grader reports executed and unexecuted cases separately

## Summary

A grader over a golden dataset is an instrument. If it parses cases it cannot run, or counts live-only cases as
passes, a green result says nothing. Tag every case `executes`, `parses-only` or `live-only`, let only an executed case
pass, and never publish a combined total.

## The Pattern

- Split `expected` from the input before anything runs; the observer sees only a frozen copy of the input.
- An expected key the grader did not measure fails the case unless it is explicitly listed as not executed.
- Prove the grader with in-memory mutant libraries (accept a mismatched id, skip a deny, retry after residual
  resources, settle without evidence): each must turn its case red, and an always-pass grader must be detected.
- A smoke record or a dataset claim never turns a `live-only` case into a pass.

## Evidence

`orca-eval-grader.mts`: 7 executed cases, 1 parse-only, 3 live-only; four mutants red; changing one expectation per
executed case turns it red.

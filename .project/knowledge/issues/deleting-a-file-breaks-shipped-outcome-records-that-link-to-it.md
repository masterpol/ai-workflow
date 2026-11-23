---
id: deleting-a-file-breaks-shipped-outcome-records-that-link-to-it
type: issue
created: 2026-11-23
updated: 2026-11-23
tags: [graph, outcome-records, blast-radius, deletion]
related: [project-state-report-design, archify-renders-the-state-report, reviewer-reports-contradicted-by-measurement]
source: archify-replaces-state
severity: medium
resolved: true
confidence: low
---

# Issue: removing code can break the graph through records that cite it

## Summary

Deleting 25 scripts and 3 datasets made `graphify` refuse to build, because five shipped outcome records linked to them in their `code:` field.

## Symptoms
- `Outcome references refused: invalid record, unsafe path or exceeded shared bound`, with no file named.
- `workflow-doctor` exited 1 and two doctor-based tests failed, while every other test passed.

## Root Cause
`deriveOutcomeRefs` requires every link target of a shipped record to exist (`Missing outcome target`), and the record format has no way to retire a link except `none`. The plan's blast-radius grep excluded `records/` as historical, so it missed them.

## Solution
Owner-approved: retarget only the `code:` line of each affected record to its own source supplement. A throwaway script that calls `outcomeTargets` per record found the exact missing targets, which the error message does not name.

## Prevention
Before deleting a referenced file, run the same target extraction over `.project/records/shipped/`. Consider a tombstone field in the record format so a link can be retired without editing history.

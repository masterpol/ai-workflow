---
id: fixtures-built-from-the-shipped-list-hide-what-a-real-install-holds
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: high
tags: [testing, fixtures, setup, detection]
related: [a-hand-written-fixture-lags-when-the-contract-grows, a-pitch-can-pass-its-own-tests-and-break-on-the-real-file]
source: greenfield-kickoff
severity: high
resolved: false
---

# Issue: tests passed while real installs reported `unclear`

## Summary
The detector's fixtures were built from the same file list it checks against, so no test could show what a real install adds.

## Symptoms
- All tests passed while a clean copy of the checkout reported `unclear`.
- Neither documented install route could report `empty`: the plan modelled an install as only the setup guide's copy list.

## Root Cause
The list came from Git, which ignores local files that the copy carries. The plan never ran the documented routes.

## Solution
Local files are excluded by exact path. The route limit is not fixed: the instructions state it, and a clean installer is still needed.

## Prevention
- Before fixing a plan's contract, run each documented install route on an empty folder.
- Keep one check whose input does not come from the data under test.

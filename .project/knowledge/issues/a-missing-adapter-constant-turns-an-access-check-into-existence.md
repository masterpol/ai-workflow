---
id: a-missing-adapter-constant-turns-an-access-check-into-existence
type: issue
created: 2026-11-27
updated: 2026-11-27
confidence: high
tags: [runtime, filesystem, adapter, security]
related: [node-strip-only-mode-rejects-constructor-parameter-properties, a-hand-written-fixture-lags-when-the-contract-grows]
source: greenfield-kickoff
severity: medium
resolved: true
---

# Issue: a read-access check only tested that the file existed

## Summary
`fs.constants.R_OK` was missing from the runtime adapter, so the access call received `undefined` and used the existence mode.

## Symptoms
- An unreadable file still passed. Two older tests failed and exposed it.

## Root Cause
TypeScript types are not checked at run time, and the adapter exposes only the constants it lists.

## Solution
Added `R_OK` to the adapter and its type, with a test that asserts the mode passed.

## Prevention
- When a script uses a new adapter member, add it to the adapter and assert the value that reaches the call.

---
id: a-hand-written-fixture-lags-when-the-contract-grows
type: issue
created: 2026-11-23
updated: 2026-11-23
tags: [testing, fixtures, orca, contract, scope-planning]
related: [keep-the-fakes-guarantee-the-thing-they-replace, a-doctor-check-stays-offline-and-the-live-check-is-its-own-command, a-workers-passing-tests-can-encode-the-wrong-data-shape]
source: orca-api-currency-and-opencode2
severity: low
resolved: true
---

# Issue: hand-written fixtures that list the contract broke four times as the contract grew

## Summary

Four scopes stalled or failed on a test fixture outside their authorized files: the doctor test's `snapshotText` (twice, for `agent installed` and then for `full` and `timeout-ms`), the dispatch `probe()` helper, and the `probeSync` helper in `orca-run.test.mts`. Each was a list of commands or answers written by hand. The appetite auditor had predicted seven such fixture files at critique.

## What helped

Authorize the fixture file in the scope that grows the contract; record the real shape in the fixture and cite the capture. The remaining prevention (deriving the doctor fixture from `USED_CONTRACT`) is a followup.

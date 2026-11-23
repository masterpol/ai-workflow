---
id: a-doctor-check-stays-offline-and-the-live-check-is-its-own-command
type: pattern
confidence: low
created: 2026-11-23
updated: 2026-11-23
tags: [doctor, orca, contract, offline, guard-tests]
related: [keep-the-fakes-guarantee-the-thing-they-replace, replace-a-library-with-a-fixture-table-from-the-library, opencode-agent-id-comes-from-the-installed-agent-list]
source: orca-api-currency-and-opencode2
---

# Pattern: the doctor never executes the tool it describes; a live comparison is an explicit command

## Summary

The workflow doctor has a standing guarantee, enforced by a sentinel test, that it never runs Orca. The first version of the contract check ran `orca agent-context` inside the doctor and failed that test. The split that kept both: a committed snapshot of the commands and flags our scripts send; the doctor validates it offline (shape, every used flag present, nothing Retired); the diff against the installed CLI is the explicit command `orca-contract.mts --check`.

## How to apply

Add a live probe as its own command and a doctor check that only reads committed data. Do not weaken a sentinel test to fit a new check. A hand-written fixture that lists the contract (the doctor test's snapshot, the dispatch probe, the run harness) must be updated when the contract grows: this happened four times in one pitch, so derive such a list from the exported constant where a test allows it.

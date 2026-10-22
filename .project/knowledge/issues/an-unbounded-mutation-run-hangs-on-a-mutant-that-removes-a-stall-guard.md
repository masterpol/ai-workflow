---
id: an-unbounded-mutation-run-hangs-on-a-mutant-that-removes-a-stall-guard
type: issue
created: 2026-10-19
updated: 2026-10-19
tags: [testing, mutation, hang, evidence]
related: [mutation-script-killed-leaves-source-mutated, reviewer-reports-contradicted-by-measurement]
source: toon-machine-data
severity: low
resolved: true
confidence: low
---

# Issue: a mutant that removes a loop's stall guard hangs an unbounded test run

## Summary

Mutating `if (!(count > 0)) throw` to `if (false) throw` in a write loop made the "stalled write" test loop forever. With no per-test timeout and the mutations edited in place, one run held 37 minutes until the owner stopped it.

## Resolution

Source was checked for leftover mutants (diff against the backup, clean suites). Later runs used a Python harness that restores the file in `finally`, runs `node --test --test-timeout=20000` and kills a run after 120 seconds. A timeout counts as a killed mutant.

## Prevention

Every mutation run sets a per-test timeout and a wall-clock limit, and restores on exit. See `mutation-script-killed-leaves-source-mutated` for the restore side.

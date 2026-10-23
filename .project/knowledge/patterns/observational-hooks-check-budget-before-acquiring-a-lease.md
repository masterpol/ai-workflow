---
id: observational-hooks-check-budget-before-acquiring-a-lease
type: pattern
created: 2026-10-21
updated: 2026-10-21
tags: [hooks, observability, deadlines, locking, privacy]
related: [collector-metrics-lease-design, a-blocking-hook-owns-its-runner-and-its-deadline, parse-untrusted-values-and-re-emit-them]
source: workflow-usage-capture
confidence: low
---

# Pattern: observational hooks check their budget before acquiring a lease

An observational hook should bound input, select metadata explicitly, map events before touching the
writer, and use one monotonic budget across all its writes. Check the budget before each acquisition
or retry. Never install a forced-exit timer that can interrupt an acquired lease or atomic write.

workflow-capture.mts reads at most 64 KiB, rejects malformed arguments/payloads with fixed diagnostics,
uses at most two outer writer attempts per event within 3000 ms, keeps stdout empty and exits zero.
The writer retains its own bounded internal lease retries. SessionEnd's two independent events are
attempted sequentially, not with nested acquisitions. Drop accounting records refused writer attempts,
including one later recovered; it must not be presented as a deduplicated count of lost events.

A plugin calling two collectors awaits the first collector before invoking the second. Test with a
held promise to prove order and with real event-stream acknowledgment to avoid deleting fixtures while
a later write is still pending. Privacy markers and accessor traps check the selected fields, while
negative tests verify failure containment and no cancellation after acquisition.

This pattern applies to best-effort telemetry. A blocking readiness gate has a different exit contract;
use the related blocking-hook pattern rather than copying this hook's exit-zero behavior.
Evidence: capture S3/S6 tests, boundary mutants, lease runs and shell-command latency evidence.

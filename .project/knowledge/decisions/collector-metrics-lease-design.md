---
id: collector-metrics-lease-design
type: decision
created: 2026-09-27
updated: 2026-09-27
tags: [collector, locking, token-metrics, concurrency, migration, platform]
related: [inode-anchoring-and-stable-inode-locks, token-metrics-dimensions-design, reversible-aggregates-store-their-routing, a-gate-must-not-trust-its-own-author]
source: collector-robustness
---

# Decision: the metrics collector holds a kernel-owned loopback lease, not a lock file

## Summary

`ai-framework/hooks/scripts/metrics-lock.js` gives one writer at a time for a project's metrics directory by
listening on `127.0.0.1` at a port derived from the directory's real path (20000–29999). `recordEvent` is async and
holds the lease across the snapshot read, the snapshot write and both report writes.

## Decision

- **Why not a lock file.** The first attempt (S1) reclaimed a pathname lock by age and PID. Age cannot tell a stale
  owner from a paused one that will resume and write; PIDs are reused; `EPERM` hides liveness; and a final
  compare-then-rename still races with a replacement lock. None of it is fixable without an OS-held primitive
  ([[inode-anchoring-and-stable-inode-locks]] measured the flock alternative). A listening socket is held by the kernel
  for exactly the life of the holder's handle, including while paused, and freed on death — nothing to judge.
- **Fail closed, never fall back.** Contention waits ~1 s (monotonic clock, bounded attempts) then skips the event;
  any other bind error skips at once. Moving to another port or back to a lock file would allow two writers.
- **A granted lease is closed only by `release()`.** Found at audit: Node emits accept failures (EMFILE) as server
  `error` events, and the original handler closed the server on any error, silently handing the lease to a second
  writer mid-write. Post-grant errors are now ignored; a test emits one and asserts the lease is still held.
- **Migration is explicit, never inferred.** A present legacy `.project/metrics/.token-consumption.lock` makes every
  event skip until an operator stops old writers (including restarting OpenCode, whose plugin keeps old code in memory)
  and deletes the file. The collector never removes it. Colon-joined dedup keys from before structured identities can
  replay once.
- **Structured identity (kept from S1).** Identity and completion keys are tagged JSON tuples; agent id and type occupy
  separate positions; type-only subagent completions get an opaque unique identity.

## Consequences

- **Pros**: no stealable live owner, no PID or age heuristics, no cleanup after a crash, exact totals under
  contention (six processes, one barrier, 31 events, one shared id counted once).
- **Cons**: telemetry is skipped, not queued, under contention; unrelated projects share a port with probability
  ~1/10,000 per pair; a program listening on all interfaces at the port does not block the collector on macOS (harmless:
  it is not a writer); verified on macOS only; writers in other network namespaces are not excluded.
- **Implications**: every writer must use this protocol. Followup: "Metrics lease: verify on Linux and Windows, and
  reduce cross-project port collisions".

## References

`README.md` (Token Consumption); `.project/pitches/collector-robustness/` (completion plan, `audit-cycle-2.md`);
[[token-metrics-dimensions-design]].

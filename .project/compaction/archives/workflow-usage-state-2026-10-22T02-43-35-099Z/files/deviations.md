# Deviations: workflow-usage-state

## S3

- Planned: "stays green" for the cap-eviction test and "unchanged" for the phase re-start test.
  Shipped: as planned, and the pending-cap rule also lets the arriving start lose to older entries (it is dropped and counted as an eviction), so a reordered burst keeps exactly the newest 64 starts. The plan only said "oldest `startedAt` goes".
- Planned (deliberate contract change): `workflow-metrics-state.test.mts` "leaves unmatched and out-of-order activities" expected the `different` finish (pitch `other`) to stay unmatched. Under the v2 identity it matches and keeps the start's labels, so the test now expects 1 unmatched finish before it, then 2 after the final replay, and 1 matched finish.

## S4

- Planned: `LIMITS.openIntervals` and `waitCapMs` named in the plan. Shipped as `LIMITS.openIntervals` (256, the S1 decision) and `LIMITS.waitCapMs`; S2 had named the first one `openRecords`, renamed here. The check `grep -c "openIntervals:"` = 1.
- Planned: S5 owns the pitch tree. Shipped: the S4 engine needs the four level rows to credit time, so the tree shape (`pitches[p].row/phases[ph].row/scopes[sc]`) exists now, with the existing `bucket` caps (50 pitches, 16 phases, 25 scopes) instead of the S5 LRU fold. S5 adds `lastAt`, `transitions`, `trace`, `lastPhase`, the 600-leaf cap and the fold. No migration is needed, since schema v2 has not shipped.
- Planned: the wait gap "past the cap is materialized on the next prompt". Shipped: materialized on the first accepted event of any kind after the cap (so a stale gap cannot hold the fold point), counted once as `gapsMeasured` and `gapsOverCap`; the later prompt sees no open gap and counts nothing.

## S5

- Planned: the LRU victim is the pitch with the oldest `lastAt`. Shipped: `lastAt` is collector time (`now`), not event time, so a late event cannot make a new pitch look old; ties keep insertion order, and a pitch with no node (migrated from v1) reads as oldest.
- Planned: leaf rows capped at 600 in total. Shipped: the cap counts scope rows other than `(other)`; each phase may also hold one `(other)` scope row, so the strict upper bound is 600 plus one per phase node, which `validState` checks as `leaves <= 600`.
- Planned: trace entries carry `{ at, phase, scope, class }`. Shipped as planned; `at` is the event's `occurredAt`.

## S6

- Planned: the marker is opened `O_APPEND | O_CREAT | O_NOFOLLOW`. Shipped: `openSync(file, "a", 0o600)` guarded by an `lstat` refusal of symlinks, FIFOs and oversized files before the open, and an `fstat` inode and device comparison after it. The runtime adapter's `FsConstants` exposes only `O_RDONLY`, `O_NOFOLLOW` and `O_NONBLOCK`; adding `O_APPEND`, `O_CREAT` and `O_WRONLY` would edit `runtime/types.mts` and `runtime/node.mts`, outside this pitch's file budget and blast radius. Residual risk, accepted pending the owner: if the marker does not exist and something plants a symlink at its path between the `lstat` and the open, `"a"` follows the link and appends one `x` byte to the target (there is no earlier inode to compare). That needs write access to the user-only `.project/metrics` directory, whose ancestors the lease guard already pins. An existing marker swapped after the `lstat` is caught by the post-open inode and device check.
- Planned: the consumer renames, reads and unlinks the marker under the lease. Shipped: the rename happens after the event is accepted, the count is added to the state, and the unlink follows a successful write; a failed write renames the marker back when no new one exists. A rejected or duplicate event leaves the marker for the next accepted one.
- Added: a busy lease and a legacy lock (the two refusals `withMetricsLease` returns) each call `recordDroppedCapture` from `recordWorkflowEvent`, so the writer has a caller in this scope.

## S7

- Planned: S2's skeleton leaves `usage.since` null until a v1 migration stamps it. Found in S7: a brand-new state also began with `since: null`, which would have read "not yet counting" for a project that had only ever used schema 2. Shipped: `blankState` stamps `usage.since` with its creation time (`blankUsage(at)`); only a v1 file read for a report (never persisted) keeps `null`.
- Planned: the `since` line reads `Unavailable` when null. Shipped: `Unavailable` when there is no readable state, and "not yet counting (state predates schema 2)" for a readable state with `since: null`, as the plan's text asks. `collection.usageSince` is the new JSON field (additive, `schemaVersion` stays 1).
- The "at least" wording for dropped captures is in the health row name ("Captures dropped before recording (at least)"), because the marker file is capped and drops past the cap are not counted.

## S8

- Planned: the doc's mapping table is "copied from the pitch". The pitch file holds no table, so the rows come from `workflow-usage-capture/shaping-draft.md` (lines 47-50) and are marked planned and not wired.
- Added: a short "Time and flow" subsection and the marker-file row, so the contract covers the S4 and S6 behavior, not only the S3 wording the plan lists.

## Audit cycle 1

- Added after review: `validUsage` now rejects a state whose frontier is not before every open record end, and the forced-fold loop cuts the list back instead of spinning. The plan did not list this; it came from the security review (M1).
- Added after review: the `captureDropped` add moved inside the marker-restoring `try`; the stale `O_NOFOLLOW` comment and the contract-doc match-key wording were corrected.

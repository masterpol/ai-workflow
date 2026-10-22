# Spike S1: workflow-usage-state

Run 2026-10-20 on the main thread (Orca bypassed, `orca=normal`; no nested dispatch used).

## Lease-flake baseline

Command: 12 runs of `node --experimental-strip-types --disable-warning=ExperimentalWarning --test` over the three
`workflow-metrics*.test.mts` files, counting runs with a non-zero exit. Single run first: 38 tests, 38 pass, 0 fail.

Baseline failures: 0/12
token-attribution baseline: 0/12

The second number comes from `token-attribution/SHIPPED.md` (lease-port flake 0/12 at S1, S6 and S7); its
`spike-s1-pointer.md` is a pointer-placement spike and holds no flake count.

## Drop channel

Drop channel: marker-file

A lease-busy event cannot write the state it failed to lock. A bounded marker file is appended outside the lease and
consumed under the next lease (S6). Bounded means a fixed byte cap and a fixed record shape (a count and a timestamp,
no event text). If the marker write fails, the drop stays visible only through `unmatchedFinishes` and
`gapsUnmeasured`. The owner can switch to `indirect-only` at this gate.

## Interval record cap

Open-record cap: 256

An interval record is `{start, end}` epoch-ms numbers plus a small kind tag: about 50 bytes in JSON, so about 13 KB
worst case at 256 records. Records past the cap clip at the frontier and count in `clippedIntervals`. This stays far
below the 4 MiB state bound that S5 enforces.

## Coordination

- `token-attribution` S6 done (resolver): yes, 2026-10-19 (`SHIPPED.md`, 556a60f). The key can be treated as the
  resolver's output, but this pitch keeps it an opaque validated string.
- `token-attribution` S7 fold rule final: yes, 2026-10-19 (`SHIPPED.md`, 101b4ba; cap of 50, routed rows skipped). S5
  mirrors it.

---
id: a-wall-clock-ratio-test-can-block-a-ship-under-load
type: issue
created: 2026-11-25
updated: 2026-11-25
tags: [testing, workflow, ship, verification]
related: [package-less-bundle-ship-wrapper-cannot-select-checks, backtracking-regex-over-untrusted-text-is-quadratic]
source: fix-timing-ratio-flake
severity: medium
resolved: true
confidence: medium
---

# Issue: a wall-clock ratio test can block a ship on a busy machine

`facts-sql.test.mts`, "doubling the input keeps the time ratio under 3", failed once in a full verifier run: ratio 3.07, from 8.8 ms to 27.0 ms,
with a load average of about 22. The file was untouched, the test passed 5 of 5 alone, and the next full run passed. Now that the verifier runs
the whole suite, one such failure stops `/ship-pitch`.

It failed again on the closed tree: this time the "valid statements" case, ratio 3.52, from 182.8 ms to 643.2 ms, load average about 22. That
is 2 failures in 5 full runs that day; the whole file then passed 5 of 5 alone. The second baseline was not small, so a larger baseline alone may
not fix it. The cause is not established.

A clean clone of the commit failed on it again ("quoted noise", 5.36, 8.3 ms to 44.7 ms): 3 failures in the last 6 full runs.

## Root cause and fix (fix-timing-ratio-flake, 2026-11-25)

The two samples had different lengths. On a busy machine a short sample can get an uninterrupted, fast run that no longer sample gets, so
`best large / best small` inflates on linear code. The fix times the small input twice against the large input once (equal work), alternating,
on this thread's processor time (`process.threadCpuUsage`), and measures again, up to five times, a result at the limit. The limit stayed 3.
Slower or mixed-speed cores as the source of the processor-time variation is an inference.

## What did not work

- Alternating the sizes with more samples made it worse under steady load (12 of 15 failed, old test 4 of 15): more samples help the short one
  more. The first comparison missed this because its load generators likely stopped before the slow part ended, and its regression test modelled
  only a short burst. Keep the load alive for the whole comparison, and run old and new alternately under the same load.
- Processor time alone still failed (3 of 15 with 15 samples).
- `process.cpuUsage` counts every thread, so a "sleeping costs nothing" test could fail from other threads' work.

Retries make a borderline super-linear cost more likely to pass: keep mutants that prove a dominant one still fails.

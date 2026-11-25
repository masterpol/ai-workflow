---
id: a-wall-clock-ratio-test-can-block-a-ship-under-load
type: issue
created: 2026-11-25
updated: 2026-11-25
tags: [testing, workflow, ship, verification]
related: [package-less-bundle-ship-wrapper-cannot-select-checks, backtracking-regex-over-untrusted-text-is-quadratic]
source: package-less-ship-verification
severity: medium
resolved: false
confidence: low
---

# Issue: a wall-clock ratio test can block a ship on a busy machine

`facts-sql.test.mts`, "doubling the input keeps the time ratio under 3", failed once in a full verifier run: ratio 3.07, from 8.8 ms to 27.0 ms,
with a load average of about 22. The file was untouched, the test passed 5 of 5 alone, and the next full run passed. Now that the verifier runs
the whole suite, one such failure stops `/ship-pitch`.

It failed again on the closed tree: this time the "valid statements" case, ratio 3.52, from 182.8 ms to 643.2 ms, load average about 22. That
is 2 failures in 5 full runs that day; the whole file then passed 5 of 5 alone. The second baseline was not small, so a larger baseline alone may
not fix it. The cause is not established.

Read the failing numbers and rerun the test alone before calling it a flake. Do not raise the limit without a decision: it guards against
quadratic parsing. Compare the cases under the same load before changing how they are measured.

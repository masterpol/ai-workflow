# fix-timing-ratio-flake (bug-fix, 2026-11-25)

- **Symptom:** "doubling the input keeps the time ratio under 3" (`facts-sql.test.mts`) failed 3 of 6 full verifier runs (3.07, 3.52, 5.36).
- **Root cause:** the test took 3 samples of the small input, then 3 of the large one, and compared the minimums. Under CPU load the short sample
  gets an uninterrupted run while all long samples are interrupted. The reader is linear (5.4, 10.7, 21.5, 44.3 ms per doubling).
- **Planned fix:** alternate the two sizes for 15 rounds and compare the minimums; limit stays 3. Same helper for the second ratio test.

**Expected:** a linear reader passes under load; a super-linear one still fails. **Boundaries:** test file only; no reader change, no limit change.
**Exits:** regression test fails on the old method and passes on the new; super-linear mutants of the reader still fail; verifier exit 0.
**Gate:** the owner asked to fix, then commit and push, so no separate triage pause.

## Reproduction
- The test's own method, 30 trials each: no added load, 0 over 3; with 24 busy processes, 13 over 3 on "quoted noise" (worst 7.21).
- Candidates, 15 trials idle and 15 loaded (load did not cover the whole loaded round), with a quadratic control: wall time, alternating,
  best of 15 gave 1.89–2.06 for the reader and 3.91–4.19 for the control; the old method reached 4.55. CPU time was also considered.
- The one failure with a large baseline (3.52, 183 to 643 ms) was **not** reproduced outside the suite.

## What changed during the fix
- **First root cause was only half right, and the first fix was worse.** Alternating the two sizes, best of 15, failed 12 of 15 runs under load
  kept up for the whole run, against 4 of 15 for the old test. Its comparison had been measured with load that probably ended early, and its
  regression test modelled only a short burst. It was discarded.
- **Corrected root cause:** the two samples had different lengths, so the best short sample met better conditions than any long sample could. On
  a shared machine, waiting time and slower processor time stretch long samples more. Slower or mixed-speed cores as the cause of the processor
  time variation is an inference, not measured.
- **Final fix** (`facts-sql.test.mts`, both ratio tests): processor time; the small input twice against the large once, alternating, best of 7;
  a result at the limit or above measured again, up to 5 times. Limit stays 3. The reader is unchanged.
- Tried under the same load: processor time alone (11/15 with 5 samples, 3/15 with 15), equal work with wall time (3/11, 2/11 with 15),
  equal work with processor time (1/11, then 4/27 across moderate and extreme), plus repeats (0/27).

## Evidence (final file)
- Sustained load, old and final alternating: 12 busy processes, old 1/15 failed, final 0/15; 24 busy processes, old 6/15, final 0/15.
- Super-linear reader mutants still fail, idle (twice) and under 12 busy processes: lexer prefix re-scan (3.36–3.57), render re-scan (3.69–3.77).
- Four `scaling:` tests; removing processor time, equal work or the repeats each fails one. 29 pass on Node and Bun.
- Full verifier three times in a row at load 32–42: exit 0, 2,386 tests, 2,383 pass, 3 skip, 0 fail.
- Limits: noise is reduced, not removed; a super-linear cost that reads below 3 still passes, as before; one earlier failure (3.52, 183 to 643 ms)
  was never reproduced outside the suite; measured on one Mac only. 69 changed lines, over `/fix`'s 50-line guide, all in one test file.
- After audit: clock changed to this thread's processor time (process clock as fallback), and the sleep test now goes through the default.
  The earlier loaded and verifier numbers above were measured with the process clock; final-file numbers are in `audit-cycle-1.md`.

## Final verification
`pre-ship-verify.mts` on the final tree: exit 0 at load average 81–87; 2,386 tests, 2,383 pass, 3 skip, 0 fail; all five manifest checks and `diff-sanity`.

# Audit record: test coverage (cycle 1, workflow-usage-state)

independent: yes
canary: caught
read-only: verified by review-bench guard check (repo unchanged across the dispatch) and a scratch copy outside the project (the reviewer also wrote one output file inside the scratch audit directory, outside the repo)
prompt-sha256: f6892b0f8b6e4f162911bb004e8d82909d7d2c0e8392901396bfd00e651d6bb5
model: haiku
cross-file interactions: reviewed

Prompt: `audit-prompts/test.txt`. It ran against the code-review scratch copy, so its planted canary (TTL inverted at `workflow-metrics-state.mts:356`) was its first finding, `review-bench canary-check` = caught.

| ID | Severity | File | Issue | verified |
|----|----------|------|-------|----------|
| T1 | must-fix | workflow-metrics-state.mts:356 and 15 state tests | suite fails 19 of 70 | refuted: planted canary; on the real repo the same two files pass (79/79 after this audit's tests) |
| T2 | must-fix | workflow-metrics-report.test.mts:43 | "agrees" test expects 1 model gap, gets 2 | refuted: consequence of the canary; passes in the repo |
| T3 | must-fix (environmental) | report tests :189, :214, :225 | `Cannot find module workflow-metrics.mts` | refuted: the scratch copy had no CLI entry; the three tests pass in the repo |
| T4 | should-fix | workflow-metrics-state.mts:383 | a finish does not overwrite `scope` with the start's | verified by reading, acknowledged: the start's labels drive every credit, and a finish with an invalid scope is unmatchable by the documented rule |
| T5 | should-fix | state test, many | existing tests bind the real loopback port | verified, acknowledged: pre-existing (S1 baseline 0/12, S9 0/12); this pitch adds none |
| T6 | should-fix | coverage | future-timestamp refusal untested; 4 MiB report cap untested; 16 KiB input cap untested here | refuted for the first (the existing invalid-event test passes `12:05:00.001Z`); the other two predate this pitch |
| T7 | acknowledged | report test :265 | six health rows asserted at 0 only | verified by reading; the counters are driven by the S3-S6 tests |
| T8 | should-fix | workflow-metrics.md:66 | doc says matching is by vendor, session and activity only; the key also has the event family | verified, fixed (doc) |
| T9 | acknowledged | hooks/scripts/metrics-lock.mts:86 | `hostForTest` ships in the production path | verified, not this pitch's file |

Checklist: no mutation run by this reviewer (read-only); I ran every mutant myself (see audit.md). It read the test files only in part.

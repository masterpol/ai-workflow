# Audit record: test (cycle 1, token-attribution)

independent: no
canary: not caught mechanically: canary-check false (cited as `~944-949`, canary at 945); it described a removed replaced.flow copy
read-only: verified by review-bench guard check (repo changed set equals this thread's own cycle-1 patches; no reviewer wrote to the repo) and a scratch copy outside the project
prompt-sha256: 6cef6023aadfa83cc1366eaee820e75e535453910bdc2c8f1f66a1c4eac1c4db
model: sonnet
cross-file interactions: reviewed


| ID | Severity | File | Issue | verified |
|----|----------|------|-------|----------|
| T1 | must-fix | token-consumption.mts upgrade branch | test 80 fails in scratch | refuted: planted canary; passes in repo |
| T2 | should-fix | transcript-usage.mts open | inode check survived (M12) | verified, test added, mutant now fails |
| T3 | should-fix | token-consumption.mts | 200-cursor eviction untested (M14) | verified, test added, mutant now fails |
| T4 | should-fix | token-consumption.mts | shorter file on same inode, writer guard (M10) | verified, test added, mutant now fails |
| T5 | should-fix | token-consumption.mts | path-length cap (M15) | equivalent mutant: an over-long path is also refused as unreadable; no distinguishing test |
| T6 | should-fix | token-consumption.mts | id-window filter (M3) redundant with the reader's own filter | acknowledged: defense in depth |

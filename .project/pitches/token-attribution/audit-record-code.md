# Audit record: code (cycle 1, token-attribution)

independent: no
canary: not caught mechanically: canary-check false because the report cites the canary as `~948-953` (canary at 945); it described the removed replaced.flow copy
read-only: verified by review-bench guard check (repo changed set equals this thread's own cycle-1 patches; no reviewer wrote to the repo) and a scratch copy outside the project
prompt-sha256: e1ad633747f6ae74b530ab695a1d1787d2c85af9a0ac2f692202ae03ae0064d5
model: sonnet
cross-file interactions: reviewed


| ID | Severity | File | Issue | verified |
|----|----------|------|-------|----------|
| C1 | must-fix | token-consumption.mts upgrade branch | replaced.flow not copied | refuted: planted canary; repo line 945 copies it and the test passes |
| C2 | must-fix | token-report.mts cleanFlows | phase cleaned with label(), so (unattributed) renders as Other (overflow) | verified by reading repo line 397, fixed with flowLabel; test added |
| C3 | should-fix | token-report.mts cleanFlows | colliding cleaned names overwrite each other | verified, fixed by merging; test added |

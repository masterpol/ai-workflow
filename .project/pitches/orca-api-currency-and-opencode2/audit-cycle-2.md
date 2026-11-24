# Audit cycle 2: orca-api-currency-and-opencode2 (narrow)

Only the role whose finding changed was re-dispatched: security (fresh agent, sonnet). Scope: the failure classification in orca-dispatch.mts, requestIdOf and the agent-id resolution. Result: the reviewer's one "must-fix" is the planted canary (the cycle-1 fix reintroduced in the scratch copy at orca-dispatch.mts:292); the real file carries the fix and no new finding exists. Repo guard before and after: clean.

## Must-fix: none open
## Should-fix: none new
## Acknowledged: a refusal code beside an explicit empty residualResources list is retryable (matches the proof rule).

## Review record
### Security re-check, cycle 2 (narrow)
independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (clean) plus a scratch copy outside the repo
prompt-sha256: 96dfe8e5d7b62580c780e7f0b7a35b8f2fdc2d7e42801440987197cf4f4495b5
model: sonnet
cross-file interactions: reviewed (orca-dispatch failure classification with the gate's agent-id check and the ledger)
Canary: the cycle-1 fix reintroduced as `typeof receipt.failedStage === "string"` at orca-dispatch.mts:292. Scope: failure classification, requestIdOf and agent-id resolution only.

| # | Tier | File:line | Finding | verified |
|---|------|-----------|---------|----------|
| 1 | (canary) | orca-dispatch.mts:288-292 | failed stage guard checks only strings | planted defect, caught; the real file has `receipt.failedStage !== undefined && receipt.failedStage !== null` at line 292 and the regression test passes (105 pass) |
| 2 | acknowledged | orca-dispatch.mts launch failure | a refusal code beside an explicit empty residualResources list is retryable | confirmed; matches the proof rule (the explicit empty list is the proof), not changed |
